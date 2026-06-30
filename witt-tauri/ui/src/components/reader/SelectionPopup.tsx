import { ChevronDown, ExternalLink, MessageSquareText, Save, Sparkles, X } from 'lucide-react';
import { type ButtonHTMLAttributes, useRef, useState } from 'react';
import { type PromptProfile } from '@/lib/commands';
import { cn } from '@/lib/utils';
import { ProseMarkdown } from '@/components/ui/ProseMarkdown';
import { type SelectionPopupModel } from '@/components/reader/readerEpub';
import { useClickOutside } from '@/lib/useClickOutside';

interface SelectionPopupProps {
  popup: SelectionPopupModel;
  savedWord: string;
  saving: boolean;
  askingAi: boolean;
  aiAnswer: string;
  explanationState: 'idle' | 'loading' | 'cached' | 'error';
  promptProfiles: PromptProfile[];
  askAiEnabled: boolean;
  onClose: () => void;
  onSave: () => void;
  onAskAi: (promptId?: string) => void;
  onEditPrompt: () => void;
  onExpandToSession: () => void;
  onQuoteInChat: () => void;
}

function PopupAction({
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectionPopup({
  popup,
  savedWord,
  saving,
  askingAi,
  aiAnswer,
  explanationState,
  promptProfiles,
  askAiEnabled,
  onClose,
  onSave,
  onAskAi,
  onEditPrompt,
  onExpandToSession,
  onQuoteInChat,
}: SelectionPopupProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreRef, () => setMoreOpen(false));

  const isMultiWord = popup.selectedText.trim().split(/\s+/).length > 1;
  const explanationLabel = explanationState === 'cached' ? 'Cached explanation' : 'AI explanation';
  const width = 360;
  const margin = 12;
  const gap = 8;
  const showAnswer = aiAnswer || askingAi || explanationState === 'loading';
  const left = clamp(popup.x - width / 2, margin, window.innerWidth - width - margin);

  // Let the popup use as much vertical space as is available, capped at 640px.
  const maxIdealHeight = Math.min(640, window.innerHeight - 2 * margin);
  const spaceBelow = window.innerHeight - popup.y - margin;
  const spaceAbove = popup.y - margin;
  const maxHeight = Math.max(
    200,
    Math.min(maxIdealHeight, Math.max(spaceBelow - gap, spaceAbove - gap))
  );

  // Place below the selection when there's room (don't cover it),
  // then above, then center as a last resort.
  let top: number;
  let arrowDown: boolean;
  if (spaceBelow - gap >= maxHeight) {
    top = popup.y + gap;
    arrowDown = false;
  } else if (spaceAbove - gap >= maxHeight) {
    top = popup.y - maxHeight - gap;
    arrowDown = true;
  } else {
    top = clamp(popup.y - maxHeight / 2, margin, window.innerHeight - maxHeight - margin);
    arrowDown = top + maxHeight / 2 <= popup.y;
  }
  const arrowLeft = clamp(popup.x - left, 14, width - 14);

  return (
    <div
      className="fixed z-50"
      style={{
        left,
        top,
        width,
        maxHeight,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={
          arrowDown
            ? 'absolute -bottom-[6px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-card'
            : 'absolute -top-[6px] h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent border-b-card'
        }
        style={{ left: arrowLeft, transform: 'translateX(-50%)' }}
      />
      <div className="flex max-h-[inherit] flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl">
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-tight">{popup.word}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{popup.selectedText}</p>
          </div>
          <button
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            onClick={onClose}
            aria-label="Close selection tools"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain border-t border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Context
            </p>
            <p className="mt-1 text-sm leading-6 text-card-foreground">
              {popup.sentence || popup.selectedText}
            </p>
          </div>

          {showAnswer && (
            <div className="rounded-lg border border-border bg-card p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {explanationLabel}
                </p>
                {aiAnswer && !askingAi && explanationState !== 'loading' && (
                  <button
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={onExpandToSession}
                    title="Continue in full chat panel"
                  >
                    <ExternalLink size={11} />
                    Expand
                  </button>
                )}
              </div>
              {askingAi || explanationState === 'loading' ? (
                <p className="animate-pulse text-sm text-muted-foreground">
                  Loading explanation...
                </p>
              ) : aiAnswer ? (
                <ProseMarkdown className="text-foreground [&_pre]:p-3">{aiAnswer}</ProseMarkdown>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Choose Ask AI for a contextual explanation.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1 border-t border-border px-2 py-1.5">
          <PopupAction disabled={saving || Boolean(savedWord)} onClick={onSave}>
            <Save size={13} />
            {saving ? 'Saving...' : savedWord ? 'Saved' : 'Save'}
          </PopupAction>
          {isMultiWord && (
            <PopupAction onClick={onQuoteInChat}>
              <MessageSquareText size={13} />
              Quote in Chat
            </PopupAction>
          )}
          {askAiEnabled && (
            <PopupAction disabled={askingAi} onClick={() => onAskAi()}>
              <Sparkles size={13} />
              {askingAi ? 'Asking...' : 'Ask AI'}
            </PopupAction>
          )}
          <div className="relative" ref={moreRef}>
            <PopupAction onClick={() => setMoreOpen((v) => !v)}>
              More
              <ChevronDown size={10} />
            </PopupAction>
            {moreOpen && (
              <div className="absolute bottom-full left-0 mb-1 min-w-[180px] rounded-md border border-border bg-card py-1 shadow-lg">
                {promptProfiles.length === 0 && (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground">No prompts</p>
                )}
                {promptProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                    onClick={() => {
                      setMoreOpen(false);
                      onAskAi(profile.id);
                    }}
                  >
                    <span className="truncate">{profile.name}</span>
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent"
                  onClick={() => {
                    setMoreOpen(false);
                    onEditPrompt();
                  }}
                >
                  Edit prompts...
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}
