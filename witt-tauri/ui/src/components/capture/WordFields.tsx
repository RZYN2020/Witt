import { cn } from '@/lib/utils';

interface WordFieldProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocus: () => void;
}

interface LemmaFieldProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  word?: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocus: () => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

/**
 * Word input field
 */
export function WordField({ value, onChange, isFocused, onFocus }: WordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="word-field"
        className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        Word
      </label>
      <input
        ref={isFocused ? (el) => el?.focus() : null}
        data-field="word"
        id="word-field"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={cn(
          'w-full px-3 py-2 rounded-md border border-input bg-background',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'transition-all duration-200'
        )}
        placeholder="Word"
      />
    </div>
  );
}

/**
 * Lemma input field
 */
export function LemmaField({ value, onChange, isFocused, onFocus, onRefresh, isLoading, word }: LemmaFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="lemma-field"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Lemma <span className="italic font-normal">(Base form)</span>
        </label>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading || !word}
            className="text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50 flex items-center gap-0.5"
            title="Auto-fill lemma from word"
          >
            {isLoading ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Finding...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  <path d="M21 3v9h-9" />
                </svg>
                <span>Auto-fill</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={isFocused ? (el) => el?.focus() : null}
        data-field="lemma"
        id="lemma-field"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={cn(
          'w-full px-3 py-2 rounded-md border border-input bg-background',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'transition-all duration-200'
        )}
        placeholder="Type or auto-fill base form"
      />
      <p className="text-xs text-muted-foreground">
        Edit manually or click "Auto-fill" to find the base form
      </p>
    </div>
  );
}

/**
 * Language selector dropdown
 */
export function LanguageSelector({ value, onChange, isFocused, onFocus }: LanguageSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="language-selector"
        className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        Language
      </label>
      <div className="relative">
        <select
          ref={isFocused ? (el) => el?.focus() : null}
          data-field="language"
          id="language-selector"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className={cn(
            'w-full px-3 py-2 rounded-md border border-input bg-background',
            'text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'transition-all duration-200',
            'appearance-none cursor-pointer'
          )}
          title="Select language for dictionary lookup"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Used for dictionary and lemma lookup
      </p>
    </div>
  );
}
