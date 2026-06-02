import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Settings2 } from 'lucide-react';
import {
  checkAnki,
  getAppConfig,
  getSettings,
  hasLlmApiKey,
  openAppConfig,
  reloadAppConfig,
  saveAppConfig,
  saveLlmApiKey,
  saveSettings,
  type AppConfig,
  type AppSettings,
  DEFAULT_APP_SETTINGS,
} from '@/lib/commands';
import { DEFAULT_CUSTOM_THEME, type ReaderTheme, saveCustomTheme } from '@/lib/themes';
import { Button } from '@/components/ui/Button';
import { StatusText } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Tabs';
import { CustomThemeEditor } from './CustomThemeEditor';
import { ReaderAppearanceSettings } from './ReaderAppearanceSettings';
import { AnkiConnectionSettings, LlmApiSettings } from './ReaderServiceSettings';
import { type ReaderDisplaySettings } from './readerTypes';

interface ReaderSettingsPanelProps {
  display: ReaderDisplaySettings;
  customTheme: ReaderTheme;
  onDisplayChange: (settings: ReaderDisplaySettings) => void;
  onCustomThemeChange: (theme: ReaderTheme) => void;
}

const TABS = [
  { id: 'reader', label: 'Reading' },
  { id: 'theme', label: 'Theme' },
  { id: 'anki', label: 'Anki' },
  { id: 'llm', label: 'AI explanation' },
];

const EDITOR_OPTIONS = [
  { label: 'VS Code', command: 'code', args: ['-r'] },
  { label: 'Cursor', command: 'cursor', args: ['-r'] },
  { label: 'Zed', command: 'zed', args: [] },
  { label: 'System', command: 'open', args: [] },
];

export function ReaderSettingsPanel({
  display,
  customTheme,
  onDisplayChange,
  onCustomThemeChange,
}: ReaderSettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [tab, setTab] = useState('reader');
  const [apiKey, setApiKey] = useState('');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState('');
  const [ankiTestResult, setAnkiTestResult] = useState<string>('');
  const [themeDraft, setThemeDraft] = useState<ReaderTheme>(customTheme);

  useEffect(() => {
    void Promise.all([getSettings(), hasLlmApiKey(), getAppConfig()]).then(
      ([nextSettings, nextHasKey, nextConfig]) => {
        setSettings(nextSettings);
        setHasKey(nextHasKey);
        setAppConfig(nextConfig);
      }
    );
  }, []);

  useEffect(() => {
    setThemeDraft(customTheme);
  }, [customTheme]);

  const flashStatus = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus((prev) => (prev === message ? '' : prev)), 3000);
  };

  const persistSettings = async () => {
    try {
      await saveSettings(settings);
      if (apiKey.trim()) {
        await saveLlmApiKey(apiKey.trim());
        setApiKey('');
        setHasKey(true);
      }
      flashStatus('Settings saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const testAnki = async () => {
    setAnkiTestResult('Testing…');
    try {
      await saveSettings(settings);
      const result = await checkAnki();
      setAnkiTestResult(
        result.available
          ? `Connected (AnkiConnect v${result.version})`
          : 'Unreachable — check Anki is open and AnkiConnect is enabled'
      );
    } catch (err) {
      setAnkiTestResult(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const saveTheme = () => {
    const nextTheme = { ...themeDraft, id: 'custom', name: themeDraft.name.trim() || 'Custom' };
    saveCustomTheme(nextTheme);
    onCustomThemeChange(nextTheme);
    onDisplayChange({ ...display, themeId: 'custom' });
    flashStatus('Theme saved');
  };

  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(themeDraft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${themeDraft.name || 'witt-theme'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<ReaderTheme>;
      setThemeDraft({
        ...DEFAULT_CUSTOM_THEME,
        ...parsed,
        id: 'custom',
        name: parsed.name?.trim() || 'Imported Theme',
        css: parsed.css ?? DEFAULT_CUSTOM_THEME.css,
      });
      flashStatus('Theme imported');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to import theme');
    }
  };

  const openConfigFile = async () => {
    try {
      await saveSettings(settings);
      const path = await openAppConfig();
      flashStatus(`Opened ${path}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to open settings.toml');
    }
  };

  const reloadConfigFile = async () => {
    try {
      const nextSettings = await reloadAppConfig();
      const nextConfig = await getAppConfig();
      setSettings(nextSettings);
      setAppConfig(nextConfig);
      flashStatus('Reloaded settings.toml');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to reload settings.toml');
    }
  };

  return (
    <section className="space-y-4">
      <Tabs tabs={TABS} active={tab} panelIdPrefix="reader-settings" onChange={setTab} />
      {tab !== 'llm' && <StatusText>{status}</StatusText>}

      {tab === 'reader' && (
        <div
          id="reader-settings-reader-panel"
          role="tabpanel"
          aria-labelledby="reader-settings-reader-tab"
        >
          <ReaderAppearanceSettings
            customTheme={customTheme}
            display={display}
            onDisplayChange={onDisplayChange}
          />
        </div>
      )}

      {tab === 'theme' && (
        <div
          id="reader-settings-theme-panel"
          role="tabpanel"
          aria-labelledby="reader-settings-theme-tab"
        >
          <CustomThemeEditor
            theme={themeDraft}
            onExport={exportTheme}
            onImport={(file) => void importTheme(file)}
            onSave={saveTheme}
            onThemeChange={setThemeDraft}
          />
        </div>
      )}

      {tab === 'anki' && (
        <div
          id="reader-settings-anki-panel"
          role="tabpanel"
          aria-labelledby="reader-settings-anki-tab"
        >
          <AnkiConnectionSettings
            result={ankiTestResult}
            settings={settings}
            onSettingsChange={setSettings}
            onSave={() => void persistSettings()}
            onTest={() => void testAnki()}
          />
        </div>
      )}

      {tab === 'llm' && (
        <div
          id="reader-settings-llm-panel"
          role="tabpanel"
          aria-labelledby="reader-settings-llm-tab"
        >
          <LlmApiSettings
            apiKey={apiKey}
            hasKey={hasKey}
            settings={settings}
            status={status}
            onApiKeyChange={setApiKey}
            onSave={() => void persistSettings()}
            onSettingsChange={setSettings}
          />
        </div>
      )}

      <ConfigFileHeader
        appConfig={appConfig}
        onEditorChange={(command) => void saveEditorCommand(command)}
        onOpenConfig={() => void openConfigFile()}
        onReloadConfig={() => void reloadConfigFile()}
      />
    </section>
  );

  async function saveEditorCommand(command: string) {
    if (!appConfig) {
      return;
    }
    const preset = EDITOR_OPTIONS.find((option) => option.command === command);
    const nextConfig = {
      ...appConfig,
      editor: {
        command,
        args: preset?.args ?? [],
      },
    };
    try {
      setAppConfig(await saveAppConfig(nextConfig));
      flashStatus('Config editor saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save editor');
    }
  }
}

function ConfigFileHeader({
  appConfig,
  onEditorChange,
  onOpenConfig,
  onReloadConfig,
}: {
  appConfig: AppConfig | null;
  onEditorChange: (command: string) => void;
  onOpenConfig: () => void;
  onReloadConfig: () => void;
}) {
  const editorCommand = appConfig?.editor.command ?? 'code';
  const selectedPreset = EDITOR_OPTIONS.some((option) => option.command === editorCommand)
    ? editorCommand
    : 'code';
  return (
    <details className="rounded-md border border-border bg-card p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-card-foreground">
        <span className="flex items-center gap-2">
          <Settings2 size={15} />
          Advanced configuration
        </span>
        <span className="text-xs font-normal text-muted-foreground">settings.toml</span>
      </summary>
      <div className="mt-3 space-y-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Open the TOML file for prompts, pipelines, API endpoints, and behavior.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background pl-3 pr-2 text-xs text-muted-foreground">
            Editor
            <select
              className="h-7 min-w-24 border-0 bg-transparent px-0 py-0 text-xs text-foreground outline-none focus:ring-0"
              value={selectedPreset}
              onChange={(event) => onEditorChange(event.target.value)}
            >
              {EDITOR_OPTIONS.map((option) => (
                <option key={option.command} value={option.command}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="outline" onClick={onOpenConfig}>
            <FileText size={15} />
            Open TOML
          </Button>
          <Button size="sm" variant="ghost" onClick={onReloadConfig}>
            <RefreshCw size={15} />
            Reload
          </Button>
        </div>
      </div>
    </details>
  );
}
