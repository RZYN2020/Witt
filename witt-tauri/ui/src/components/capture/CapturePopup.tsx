import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { useLoadingStore } from '@/stores/useLoadingStore';
import * as commands from '@/lib/commands';
import type { NoteRequest } from '@/types';
import { ContextEditor } from './ContextEditor';
import { WordField, LemmaField, LanguageSelector } from './WordFields';
import { DefinitionList } from './DefinitionList';
import { TagInput } from './TagInput';
import { NotesField } from './NotesField';
import { ActionButtons } from './ActionButtons';
import { Spinner } from '../Loading';
import { cn } from '@/lib/utils';

/**
 * Main capture popup component with Framer Motion animations
 * Appears on global hotkey trigger for reviewing and editing captures
 */
export function CapturePopup() {
  const {
    currentCapture,
    isPopupOpen,
    isLoading,
    error,
    closePopup,
    updateCapture,
    saveCapture,
    saveAndNext,
    discardCapture,
  } = useCaptureStore();

  const { isLoading: isGlobalLoading } = useLoadingStore();
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState<string>('context');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingDefinitions, setIsFetchingDefinitions] = useState(false);
  const [isFetchingLemma, setIsFetchingLemma] = useState(false);

  // Calculate popup position on open
  useEffect(() => {
    if (isPopupOpen) {
      // Try to position near cursor, or center if that fails
      const popupWidth = 600;
      const popupHeight = 700;

      // Get cursor position if available (using MouseEvent)
      let x = window.innerWidth / 2 - popupWidth / 2;
      let y = window.innerHeight / 2 - popupHeight / 2;

      // Try to get mouse position from last known event
      // Fallback to center if no cursor position available
      const handleMouseMove = (e: MouseEvent) => {
        x = e.clientX + 16;
        y = e.clientY + 16;

        // Ensure popup stays within viewport
        x = Math.max(16, Math.min(x, window.innerWidth - popupWidth - 16));
        y = Math.max(16, Math.min(y, window.innerHeight - popupHeight - 16));

        setPosition({ x, y });
      };

      // Get initial mouse position
      window.addEventListener('mousemove', handleMouseMove, { once: true });

      // Fallback to center if no mouse movement within 50ms
      const fallbackTimer = setTimeout(() => {
        x = window.innerWidth / 2 - popupWidth / 2;
        y = window.innerHeight / 2 - popupHeight / 2;
        x = Math.max(16, Math.min(x, window.innerWidth - popupWidth - 16));
        y = Math.max(16, Math.min(y, window.innerHeight - popupHeight - 16));
        setPosition({ x, y });
      }, 50);

      return () => {
        clearTimeout(fallbackTimer);
      };
    }
  }, [isPopupOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPopupOpen) return;

      // Tab navigation
      if (e.key === 'Tab') {
        e.preventDefault();
        cycleFocus(e.shiftKey ? -1 : 1);
      }

      // Enter to save (if not in multi-line field)
      if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        const isTextarea = activeElement?.tagName === 'TEXTAREA';

        if (!isTextarea) {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            handleSaveAndNext();
          } else {
            handleSave();
          }
        }
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        const activeElement = document.activeElement;
        const isInput = ['INPUT', 'TEXTAREA'].includes(activeElement?.tagName || '');

        if (isInput) {
          (activeElement as HTMLElement)?.blur();
        } else {
          discardCapture();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopupOpen, discardCapture]);

  const cycleFocus = (direction: number) => {
    const fields = ['context', 'word', 'lemma', 'language', 'tags', 'notes', 'actions'];
    const currentIndex = fields.indexOf(focusedField);
    const nextIndex = ((currentIndex + direction) % fields.length + fields.length) % fields.length;
    setFocusedField(fields[nextIndex]);

    // Focus the actual element
    setTimeout(() => {
      const element = document.querySelector(`[data-field="${fields[nextIndex]}"]`) as HTMLElement;
      element?.focus();
    }, 0);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await saveCapture();
    setIsSaving(false);
  };

  const handleSaveAndNext = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await saveAndNext();
    setIsSaving(false);
  };

  const handleRefreshDefinitions = async () => {
    const word = currentCapture?.lemma || currentCapture?.context?.word_form;
    if (!word) return;

    setIsFetchingDefinitions(true);
    try {
      const [lemma, definitions] = await Promise.all([
        commands.getLemma({ word, language: 'en' }),
        commands.getDefinitions({ word, language: 'en' }),
      ]);
      updateCapture({ lemma, definitions } as Partial<NoteRequest>);
    } catch (error) {
      console.warn('Failed to refresh definitions:', error);
    } finally {
      setIsFetchingDefinitions(false);
    }
  };

  const handleRefreshLemma = async () => {
    const word = currentCapture?.context?.word_form;
    if (!word) return;

    setIsFetchingLemma(true);
    try {
      const lemma = await commands.getLemma({ word, language: 'en' });
      updateCapture({ lemma });
    } catch (error) {
      console.warn('Failed to fetch lemma:', error);
    } finally {
      setIsFetchingLemma(false);
    }
  };

  const isDisabled = !currentCapture?.context?.sentence || !currentCapture?.context?.word_form;
  const loading = isLoading || isGlobalLoading || isSaving;

  if (!isPopupOpen || !currentCapture) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'fixed z-50 bg-card border border-border rounded-xl shadow-2xl',
          'flex flex-col max-h-[85vh] overflow-hidden'
        )}
        style={{
          left: position.x,
          top: position.y,
          width: '600px',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-popup-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <h2 id="capture-popup-title" className="text-sm font-semibold text-foreground">
              📖 Capture Context
            </h2>
            {loading && <Spinner size="small" className="w-3 h-3" />}
          </div>
          <button
            onClick={closePopup}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Close (Esc)"
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 rounded text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Context Editor */}
          <ContextEditor
            value={currentCapture.context?.sentence || ''}
            onChange={(sentence) => updateCapture({
              context: {
                id: currentCapture.context?.id || crypto.randomUUID(),
                word_form: currentCapture.context?.word_form || '',
                sentence,
                audio: currentCapture.context?.audio,
                image: currentCapture.context?.image,
                source: currentCapture.context?.source || { type: 'app', name: 'Manual' },
                created_at: currentCapture.context?.created_at || new Date().toISOString(),
              }
            })}
            source={currentCapture.context?.source}
            isFocused={focusedField === 'context'}
            onFocus={() => setFocusedField('context')}
          />

          {/* Word, Lemma, Language row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <WordField
              value={currentCapture.context?.word_form || ''}
              onChange={(word_form) => updateCapture({
                context: {
                  id: currentCapture.context?.id || crypto.randomUUID(),
                  word_form,
                  sentence: currentCapture.context?.sentence || '',
                  audio: currentCapture.context?.audio,
                  image: currentCapture.context?.image,
                  source: currentCapture.context?.source || { type: 'app', name: 'Manual' },
                  created_at: currentCapture.context?.created_at || new Date().toISOString(),
                }
              })}
              isFocused={focusedField === 'word'}
              onFocus={() => setFocusedField('word')}
            />
            <LemmaField
              value={currentCapture.lemma || ''}
              onChange={(lemma) => updateCapture({ lemma })}
              isFocused={focusedField === 'lemma'}
              onFocus={() => setFocusedField('lemma')}
              onRefresh={handleRefreshLemma}
              isLoading={isFetchingLemma}
              word={currentCapture?.context?.word_form}
            />
            <LanguageSelector
              value="en"
              onChange={() => {}}
              isFocused={focusedField === 'language'}
              onFocus={() => setFocusedField('language')}
            />
          </div>

          {/* Definitions */}
          <DefinitionList
            definitions={currentCapture.definitions || []}
            onAddDefinition={(text) => {
              const newDefinition = {
                id: crypto.randomUUID(),
                text,
                source: 'Custom',
                isCustom: true,
                isUserEdited: false,
              };
              updateCapture({
                definitions: [...(currentCapture.definitions || []), newDefinition],
              });
            }}
            onUpdateDefinition={(id, text) => {
              const updated = (currentCapture.definitions || []).map((d) =>
                d.id === id ? { ...d, text, isUserEdited: true } : d
              );
              updateCapture({ definitions: updated });
            }}
            onDeleteDefinition={(id) => {
              const updated = (currentCapture.definitions || []).filter((d) => d.id !== id);
              updateCapture({ definitions: updated });
            }}
            onRefresh={handleRefreshDefinitions}
            isLoading={isFetchingDefinitions}
            word={currentCapture?.lemma || currentCapture?.context?.word_form}
          />

          {/* Tags */}
          <TagInput
            value={currentCapture.tags || []}
            onChange={(tags) => updateCapture({ tags })}
            isFocused={focusedField === 'tags'}
            onFocus={() => setFocusedField('tags')}
          />

          {/* Notes */}
          <NotesField
            value={currentCapture.comment || ''}
            onChange={(comment) => updateCapture({ comment })}
            isFocused={focusedField === 'notes'}
            onFocus={() => setFocusedField('notes')}
          />
        </div>

        {/* Action Buttons */}
        <div className="border-t border-border px-4 py-3 bg-muted/50">
          <ActionButtons
            onSave={saveCapture}
            onSaveAndNext={saveAndNext}
            onDiscard={discardCapture}
            isLoading={loading}
            isDisabled={isDisabled || loading}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
