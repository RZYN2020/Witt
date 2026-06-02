import { KeyRound, Save, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, StatusText, TextInput } from '@/components/ui/Form';
import { type AppSettings } from '@/lib/commands';

interface AnkiConnectionSettingsProps {
  result: string;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSave: () => void;
  onTest: () => void;
}

interface LlmApiSettingsProps {
  apiKey: string;
  hasKey: boolean;
  settings: AppSettings;
  status: string;
  onApiKeyChange: (apiKey: string) => void;
  onSave: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export function AnkiConnectionSettings({
  result,
  settings,
  onSettingsChange,
  onSave,
  onTest,
}: AnkiConnectionSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Anki vocabulary backend</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Witt reads and syncs cards through AnkiConnect when Anki is open.
        </p>
      </div>
      <div className="flex gap-2">
        <TextInput
          className="min-w-0 flex-1 font-mono"
          placeholder="http://localhost:8765"
          value={settings.anki_endpoint}
          onChange={(event) => onSettingsChange({ ...settings, anki_endpoint: event.target.value })}
        />
        <Button size="sm" onClick={onTest}>
          <Wifi size={15} />
          Test
        </Button>
      </div>
      <Field label="Vocabulary backend">
        <SelectInput
          value={settings.vocabulary_backend_mode}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              vocabulary_backend_mode: event.target.value as AppSettings['vocabulary_backend_mode'],
            })
          }
        >
          <option value="hybrid">Hybrid</option>
          <option value="anki_first">Anki-first</option>
          <option value="witt_first">Witt-first</option>
        </SelectInput>
      </Field>
      <Button size="sm" onClick={onSave}>
        <Save size={15} />
        Save
      </Button>
      <StatusText>{result}</StatusText>
    </div>
  );
}

export function LlmApiSettings({
  apiKey,
  hasKey,
  settings,
  status,
  onApiKeyChange,
  onSave,
  onSettingsChange,
}: LlmApiSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">AI explanation</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Used for contextual explanations and card text. API keys stay in the OS keychain.
        </p>
      </div>
      <Field label="Endpoint">
        <TextInput
          placeholder="https://api.openai.com/v1/chat/completions"
          value={settings.llm_endpoint}
          onChange={(event) => onSettingsChange({ ...settings, llm_endpoint: event.target.value })}
        />
      </Field>
      <Field label="Model">
        <TextInput
          placeholder="gpt-4.1-mini"
          value={settings.llm_model}
          onChange={(event) => onSettingsChange({ ...settings, llm_model: event.target.value })}
        />
      </Field>
      <Field label="API Key">
        <div className="flex gap-2">
          <TextInput
            className="min-w-0 flex-1"
            type="password"
            placeholder={hasKey ? 'API key saved in keychain' : 'sk-...'}
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
          <Button size="sm" onClick={onSave}>
            {apiKey ? <KeyRound size={15} /> : <Save size={15} />}
            Save
          </Button>
        </div>
      </Field>
      <StatusText>{status}</StatusText>
    </div>
  );
}
