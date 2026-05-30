import { MoreHorizontal, Save, Sparkles, X } from 'lucide-react';
import { type ButtonHTMLAttributes } from 'react';
import { type PromptProfile } from '@/lib/commands';
import { cn } from '@/lib/utils';
import { type SelectionPopupModel } from '@/components/reader/readerEpub';

export type SelectionPopupMode = 'toolbar' | 'ai' | 'more';

interface SelectionPopupProps {
  popup: SelectionPopupModel;
  mode: SelectionPopupMode;
  savedWord: string;
  saving: boolean;
  askingAi: boolean;
  aiAnswer: string;
  aiQuestion: string;
  promptProfiles: PromptProfile[];
  selectedPromptId: string;
  autoAskAi: boolean;
  onClose: () => void;
  onSave: () => void;
  onAskAi: () => void;
  onModeChange: (mode: SelectionPopupMode) => void;
  onQuestionChange: (value: string) => void;
  onPromptChange: (promptId: string) => void;
  onEditPrompt: () => void;
  onToggleAutoAskAi: () => void;
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

function PopupSectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function SelectionPopup({
  popup,
  mode,
  savedWord,
  saving,
  askingAi,
  aiAnswer,
  aiQuestion,
  promptProfiles,
  selectedPromptId,
  autoAskAi,
  onClose,
  onSave,
  onAskAi,
  onModeChange,
  onQuestionChange,
  onPromptChange,
  onEditPrompt,
  onToggleAutoAskAi,
}: SelectionPopupProps) {
  const showAi = mode === 'ai';
  const showMore = mode === 'more';
  const width = 360;
  const margin = 12;
  const estimatedHeight = showMore ? 420 : 280;
  const left = clamp(popup.x - width / 2, margin, window.innerWidth - width - margin);
  const top = clamp(popup.y, margin, window.innerHeight - estimatedHeight - margin);
  const maxHeight = Math.max(160, window.innerHeight - top - margin);
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
        className="absolute -top-[6px] h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent border-b-card"
        style={{ left: arrowLeft, transform: 'translateX(-50%)' }}
      />
      <div className="max-h-[inherit] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold leading-tight">{popup.word}</p>
              {savedWord && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Saved
                </span>
              )}
            </div>
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

        <div className="space-y-2 border-t border-border px-4 py-3">
          <div>
            <PopupSectionLabel>Context</PopupSectionLabel>
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-card-foreground">
              {popup.sentence || popup.selectedText}
            </p>
          </div>

          {(showAi || askingAi || aiAnswer) && (
            <div className="rounded-md bg-muted/70 p-3">
              <PopupSectionLabel>AI explanation</PopupSectionLabel>
              <p className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {aiAnswer ||
                  (askingAi ? 'Asking AI...' : 'Choose Ask AI for a contextual explanation.')}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
          <PopupAction disabled={saving || Boolean(savedWord)} onClick={onSave}>
            <Save size={13} />
            {saving ? 'Saving...' : savedWord ? 'Saved' : 'Save'}
          </PopupAction>
          <PopupAction
            active={showAi}
            disabled={askingAi}
            onClick={() => {
              if (showAi) {
                onModeChange('toolbar');
                return;
              }
              onModeChange('ai');
              onAskAi();
            }}
          >
            <Sparkles size={13} />
            {askingAi ? 'Asking...' : 'Ask AI'}
          </PopupAction>
          <PopupAction
            active={showMore}
            aria-label="More selection actions"
            onClick={() => onModeChange(showMore ? 'toolbar' : 'more')}
          >
            <MoreHorizontal size={13} />
            More
          </PopupAction>
        </div>

        {showMore && (
          <div className="max-h-[min(20rem,calc(100vh-8rem))] space-y-2 overflow-y-auto border-t border-border px-3 py-2">
            <div className="flex gap-1.5">
              <select
                className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                value={selectedPromptId}
                onChange={(e) => onPromptChange(e.target.value)}
              >
                {promptProfiles.length === 0 && <option value="explain">Explain</option>}
                {promptProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <button
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={onEditPrompt}
              >
                Edit
              </button>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-md border border-border px-2.5 py-2 text-xs">
              <span className="text-muted-foreground">Auto Ask AI on selection</span>
              <input type="checkbox" checked={autoAskAi} onChange={onToggleAutoAskAi} />
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
              placeholder="Question..."
              value={aiQuestion}
              onChange={(e) => onQuestionChange(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                disabled={askingAi}
                onClick={onAskAi}
              >
                <Sparkles size={13} />
                {askingAi ? 'Asking...' : 'Ask'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}
