import { X } from 'lucide-react';
import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel';
import { type ReaderDisplaySettings } from '@/components/reader/readerTypes';
import { type ReaderTheme } from '@/lib/themes';

interface ReaderSettingsModalProps {
  customTheme: ReaderTheme;
  display: ReaderDisplaySettings;
  onClose: () => void;
  onCustomThemeChange: (theme: ReaderTheme) => void;
  onDisplayChange: (settings: ReaderDisplaySettings) => void;
}

export function ReaderSettingsModal({
  customTheme,
  display,
  onClose,
  onCustomThemeChange,
  onDisplayChange,
}: ReaderSettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-settings-title"
        className="max-h-[min(86vh,44rem)] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-background p-5 text-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="reader-settings-title" className="text-base font-semibold">
              Reading settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Reading comfort first. Advanced services stay available below.
            </p>
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onClose}
            aria-label="Close reading settings"
          >
            <X size={17} />
          </button>
        </div>
        <ReaderSettingsPanel
          display={display}
          customTheme={customTheme}
          onDisplayChange={onDisplayChange}
          onCustomThemeChange={onCustomThemeChange}
        />
      </section>
    </div>
  );
}
