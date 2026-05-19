import { KeyRound, Save, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  checkAnki,
  getSettings,
  hasLlmApiKey,
  saveLlmApiKey,
  saveSettings,
  type AppSettings,
} from '@/lib/commands';
import { Button } from '@/components/ui/Button';

export interface ReaderDisplaySettings {
  fontSize: number;
  lineHeight: number;
  theme: 'paper' | 'white' | 'dark';
}

interface ReaderSettingsPanelProps {
  display: ReaderDisplaySettings;
  onDisplayChange: (settings: ReaderDisplaySettings) => void;
}

export function ReaderSettingsPanel({ display, onDisplayChange }: ReaderSettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>({
    llm_endpoint: 'https://api.openai.com/v1/chat/completions',
    llm_model: 'gpt-4.1-mini',
    anki_endpoint: 'http://localhost:8765',
  });
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [ankiTestResult, setAnkiTestResult] = useState<string>('');

  useEffect(() => {
    void Promise.all([getSettings(), hasLlmApiKey()]).then(([nextSettings, nextHasKey]) => {
      setSettings(nextSettings);
      setHasKey(nextHasKey);
    });
  }, []);

  const persistSettings = async () => {
    await saveSettings(settings);
    if (apiKey.trim()) {
      await saveLlmApiKey(apiKey.trim());
      setApiKey('');
      setHasKey(true);
    }
    setStatus('Saved');
  };

  const testAnki = async () => {
    setAnkiTestResult('Testing…');
    await saveSettings(settings);
    const result = await checkAnki();
    setAnkiTestResult(
      result.available
        ? `Connected (AnkiConnect v${result.version})`
        : 'Unreachable — check Anki is open and AnkiConnect is enabled'
    );
  };

  return (
    <section className="space-y-4 border-t border-slate-200 pt-4">
      <div>
        <h3 className="text-sm font-semibold">Reader</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['paper', 'white', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              className={`rounded-md border px-2 py-2 text-xs capitalize ${
                display.theme === theme ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200'
              }`}
              onClick={() => onDisplayChange({ ...display, theme })}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs font-medium text-slate-500">
        Font size
        <input
          className="mt-2 w-full"
          type="range"
          min="14"
          max="28"
          value={display.fontSize}
          onChange={(event) => onDisplayChange({ ...display, fontSize: Number(event.target.value) })}
        />
      </label>

      <label className="block text-xs font-medium text-slate-500">
        Line height
        <input
          className="mt-2 w-full"
          type="range"
          min="1.3"
          max="2.2"
          step="0.1"
          value={display.lineHeight}
          onChange={(event) =>
            onDisplayChange({ ...display, lineHeight: Number(event.target.value) })
          }
        />
      </label>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold">Anki</h3>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            placeholder="http://localhost:8765"
            value={settings.anki_endpoint}
            onChange={(event) => setSettings({ ...settings, anki_endpoint: event.target.value })}
          />
          <Button size="sm" onClick={() => void testAnki()}>
            <Wifi size={15} />
            Test
          </Button>
        </div>
        {ankiTestResult && <p className="text-xs text-slate-500">{ankiTestResult}</p>}
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold">LLM</h3>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={settings.llm_endpoint}
          onChange={(event) => setSettings({ ...settings, llm_endpoint: event.target.value })}
        />
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={settings.llm_model}
          onChange={(event) => setSettings({ ...settings, llm_model: event.target.value })}
        />
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="password"
            placeholder={hasKey ? 'API key saved in keychain' : 'API key'}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Button size="sm" onClick={() => void persistSettings()}>
            {apiKey ? <KeyRound size={15} /> : <Save size={15} />}
            Save
          </Button>
        </div>
        <p className="text-xs text-slate-500">{status}</p>
      </div>
    </section>
  );
}
