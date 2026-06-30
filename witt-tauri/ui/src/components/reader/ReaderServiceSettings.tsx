import { KeyRound, Save, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, StatusText, TextInput } from '@/components/ui/Form';
import { listPromptProfiles, type AppSettings, type PromptProfile } from '@/lib/commands';

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
      <Field label="Visual memory scope">
        <SelectInput
          value={settings.visual_memory_scope}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              visual_memory_scope: event.target.value as AppSettings['visual_memory_scope'],
            })
          }
        >
          <option value="library">All library</option>
          <option value="book">Current book</option>
        </SelectInput>
      </Field>
      <Field label="Inline word display">
        <SelectInput
          value={settings.inline_word_display}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              inline_word_display: event.target.value as AppSettings['inline_word_display'],
            })
          }
        >
          <option value="none">Nothing</option>
          <option value="status">Status label</option>
          <option value="meaning">Meaning</option>
        </SelectInput>
      </Field>
      <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">Highlight known words in reader</span>
        <input
          type="checkbox"
          checked={settings.highlight_known_words}
          onChange={(event) =>
            onSettingsChange({ ...settings, highlight_known_words: event.target.checked })
          }
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">Push Anki changes to AnkiWeb after sync</span>
        <input
          type="checkbox"
          checked={settings.anki_auto_sync_web}
          onChange={(event) =>
            onSettingsChange({ ...settings, anki_auto_sync_web: event.target.checked })
          }
        />
      </label>
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
  const [promptProfiles, setPromptProfiles] = useState<PromptProfile[]>([]);

  useEffect(() => {
    listPromptProfiles()
      .then(setPromptProfiles)
      .catch(() => setPromptProfiles([]));
  }, []);

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

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Selection popup</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Control the Ask AI button in the word selection popup.
        </p>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs">
        <span className="text-muted-foreground">Show Ask AI button in selection popup</span>
        <input
          type="checkbox"
          checked={settings.selection_ask_ai_enabled}
          onChange={(event) =>
            onSettingsChange({ ...settings, selection_ask_ai_enabled: event.target.checked })
          }
        />
      </label>
      <Field label="Default Ask AI prompt">
        <SelectInput
          value={settings.selection_ask_ai_prompt_id}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              selection_ask_ai_prompt_id: event.target.value,
            })
          }
        >
          {promptProfiles.length === 0 && (
            <option value={settings.selection_ask_ai_prompt_id}>
              {settings.selection_ask_ai_prompt_id || 'explain'}
            </option>
          )}
          {promptProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Button size="sm" onClick={onSave}>
        <Save size={15} />
        Save
      </Button>
      <StatusText>{status}</StatusText>
    </div>
  );
}
