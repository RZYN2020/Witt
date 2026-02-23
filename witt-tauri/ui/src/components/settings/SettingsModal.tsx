import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  X,
  Sun,
  Moon,
  Monitor,
  Palette,
  Keyboard,
  Bell,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

const TRANSLATIONS = {
  en: {
    title: 'Settings',
    appearance: 'Appearance',
    language: 'Language',
    preferences: 'Preferences',
    shortcuts: 'Keyboard Shortcuts',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    autoFetchDefinitions: 'Auto-fetch Definitions',
    autoFetchDesc: 'Automatically fetch definitions when capturing new words',
    includeScreenshots: 'Include Screenshots',
    screenshotsDesc: 'Capture screenshots along with text context',
    captureWord: 'Capture Word',
    openLibrary: 'Open Library',
  },
  zh: {
    title: '设置',
    appearance: '外观',
    language: '语言',
    preferences: '偏好设置',
    shortcuts: '快捷键',
    light: '浅色',
    dark: '深色',
    system: '跟随系统',
    autoFetchDefinitions: '自动获取释义',
    autoFetchDesc: '捕获新单词时自动获取词典释义',
    includeScreenshots: '包含截图',
    screenshotsDesc: '捕获文本时同时保存截图',
    captureWord: '捕获单词',
    openLibrary: '打开图书馆',
  },
  ja: {
    title: '設定',
    appearance: '外観',
    language: '言語',
    preferences: 'プリファレンス',
    shortcuts: 'キーボードショートカット',
    light: 'ライト',
    dark: 'ダーク',
    system: 'システム',
    autoFetchDefinitions: '自動定義取得',
    autoFetchDesc: '新しい単語をキャプチャする際に定義を自動取得',
    includeScreenshots: 'スクリーンショットを含む',
    screenshotsDesc: 'テキストコンテキストと一緒にスクリーンショットを保存',
    captureWord: '単語をキャプチャ',
    openLibrary: 'ライブラリを開く',
  },
  ko: {
    title: '설정',
    appearance: '모양',
    language: '언어',
    preferences: '환경설정',
    shortcuts: '키보드 단축키',
    light: '라이트',
    dark: '다크',
    system: '시스템',
    autoFetchDefinitions: '자동 정의 가져오기',
    autoFetchDesc: '새 단어를 캡처할 때 정의 자동 가져오기',
    includeScreenshots: '스크린샷 포함',
    screenshotsDesc: '텍스트 컨텍스트와 함께 스크린샷 저장',
    captureWord: '단어 캡처',
    openLibrary: '라이브러리 열기',
  },
  de: {
    title: 'Einstellungen',
    appearance: 'Erscheinung',
    language: 'Sprache',
    preferences: 'Einstellungen',
    shortcuts: 'Tastenkürzel',
    light: 'Hell',
    dark: 'Dunkel',
    system: 'System',
    autoFetchDefinitions: 'Definitionen automatisch abrufen',
    autoFetchDesc: 'Definitionen beim Erfassen neuer Wörter automatisch abrufen',
    includeScreenshots: 'Screenshots einschließen',
    screenshotsDesc: 'Screenshots zusammen mit Textkontext erfassen',
    captureWord: 'Wort erfassen',
    openLibrary: 'Bibliothek öffnen',
  },
} as const;

/**
 * Settings modal - Typeless style floating window
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    theme,
    setTheme,
    autoFetchDefinitions,
    setAutoFetchDefinitions,
    includeScreenshots,
    setIncludeScreenshots,
    appLanguage,
    setAppLanguage,
  } = useSettingsStore();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    appearance: true,
    language: false,
    preferences: false,
    shortcuts: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get translations for current language
  const t = TRANSLATIONS[appLanguage as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-full max-w-xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {/* Appearance Section */}
                <SettingsSection
                  id="appearance"
                  title={t.appearance}
                  icon={Palette}
                  isExpanded={expandedSections.appearance}
                  onToggle={() => toggleSection('appearance')}
                >
                  <div className="grid grid-cols-3 gap-4">
                    <ThemeOption
                      value="light"
                      icon={Sun}
                      label={t.light}
                      current={theme}
                      onChange={setTheme}
                    />
                    <ThemeOption
                      value="dark"
                      icon={Moon}
                      label={t.dark}
                      current={theme}
                      onChange={setTheme}
                    />
                    <ThemeOption
                      value="system"
                      icon={Monitor}
                      label={t.system}
                      current={theme}
                      onChange={setTheme}
                    />
                  </div>
                </SettingsSection>

                {/* Language Section */}
                <SettingsSection
                  id="language"
                  title={t.language}
                  icon={Globe}
                  isExpanded={expandedSections.language}
                  onToggle={() => toggleSection('language')}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setAppLanguage(lang.value)}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border transition-all',
                          appLanguage === lang.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-ring'
                        )}
                      >
                        <span className="text-3xl">{lang.flag}</span>
                        <span className="flex-1 text-left text-base font-medium text-foreground">
                          {lang.label}
                        </span>
                        {appLanguage === lang.value && (
                          <span className="text-primary text-lg font-bold">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </SettingsSection>

                {/* Preferences Section */}
                <SettingsSection
                  id="preferences"
                  title={t.preferences}
                  icon={Bell}
                  isExpanded={expandedSections.preferences}
                  onToggle={() => toggleSection('preferences')}
                >
                  <div className="space-y-3">
                    <SettingToggle
                      label={t.autoFetchDefinitions}
                      description={t.autoFetchDesc}
                      checked={autoFetchDefinitions}
                      onChange={setAutoFetchDefinitions}
                    />
                    <SettingToggle
                      label={t.includeScreenshots}
                      description={t.screenshotsDesc}
                      checked={includeScreenshots}
                      onChange={setIncludeScreenshots}
                    />
                  </div>
                </SettingsSection>

                {/* Keyboard Shortcuts Section */}
                <SettingsSection
                  id="shortcuts"
                  title={t.shortcuts}
                  icon={Keyboard}
                  isExpanded={expandedSections.shortcuts}
                  onToggle={() => toggleSection('shortcuts')}
                >
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/30">
                      <p className="text-sm text-primary font-medium mb-2">🎯 Global Shortcuts</p>
                      <p className="text-xs text-muted-foreground">
                        Use these shortcuts from any application to quickly capture words.
                      </p>
                    </div>

                    <ShortcutInput
                      label="Capture Word"
                      description="Open capture popup from anywhere"
                      value={useSettingsStore.getState().captureHotkey}
                      onChange={(value) => useSettingsStore.getState().setCaptureHotkey(value)}
                      defaultHotkey="CommandOrControl+G"
                    />

                    <ShortcutInput
                      label="Open Library"
                      description="Focus/open the library window"
                      value={useSettingsStore.getState().libraryHotkey}
                      onChange={(value) => useSettingsStore.getState().setLibraryHotkey(value)}
                      defaultHotkey="CommandOrControl+L"
                    />
                  </div>
                </SettingsSection>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface SettingsSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SettingsSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
}: SettingsSectionProps) {
  return (
    <div className="border border-border rounded-xl mb-3 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <span className="text-base font-medium text-foreground">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-border">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ThemeOptionProps {
  value: 'light' | 'dark' | 'system';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current: string;
  onChange: (value: 'light' | 'dark' | 'system') => void;
}

function ThemeOption({ value, icon: Icon, label, current, onChange }: ThemeOptionProps) {
  const isActive = current === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        'flex flex-col items-center gap-3 p-6 rounded-xl border transition-all duration-200',
        isActive
          ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary ring-offset-2'
          : 'border-border bg-card hover:border-ring hover:bg-accent/50'
      )}
    >
      <Icon className={cn('w-8 h-8', isActive ? 'text-primary' : 'text-muted-foreground')} />
      <span className="text-base font-medium">{label}</span>
    </button>
  );
}

interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-accent/30 transition-colors">
      <div className="flex-1">
        <p className="text-base font-medium text-foreground">{label}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-background rounded-full transition-transform duration-200 shadow-sm',
            checked && 'translate-x-6'
          )}
        />
      </button>
    </div>
  );
}

interface ShortcutInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  defaultHotkey: string;
}

function ShortcutInput({ label, description, value, onChange, defaultHotkey }: ShortcutInputProps) {
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      onChange(defaultHotkey);
      setIsRecording(false);
    }, 1000);
  };

  const handleReset = () => {
    onChange(defaultHotkey);
  };

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <button
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleRecord}
          disabled={isRecording}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            isRecording
              ? 'bg-primary/50 text-primary-foreground cursor-wait'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isRecording ? 'Press keys...' : 'Change'}
        </button>
        <kbd className="px-3 py-2 bg-muted border border-border rounded-md text-xs font-mono">
          {value || 'Not set'}
        </kbd>
      </div>
    </div>
  );
}
