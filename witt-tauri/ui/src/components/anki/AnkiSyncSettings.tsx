import { ChevronDown, Edit3, FileText, Save, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea } from '@/components/ui/Form';
import {
  hasTauriRuntime,
  type AnkiModelInfo,
  type AppSettings,
  type PipelineProfile,
} from '@/lib/commands';

interface AnkiSyncSettingsProps {
  defaultModel: AnkiModelInfo;
  editingEnabled: boolean;
  models: AnkiModelInfo[];
  pipelines: PipelineProfile[];
  selectedModel: AnkiModelInfo;
  settings: AppSettings;
  onEditPipeline: () => void;
  onEditPipelineInline: () => void;
  onLoadPipeline: (pipelineId: string) => void;
  onSaveMapping: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  onToggle: () => void;
}

interface FieldSelectProps {
  label: string;
  value: string;
  fields: string[];
  optional?: boolean;
  onChange: (value: string) => void;
}

function FieldSelect({ label, value, fields, optional, onChange }: FieldSelectProps) {
  return (
    <Field label={label}>
      <SelectInput value={value} onChange={(event) => onChange(event.target.value)}>
        {optional && <option value="">Do not sync</option>}
        {fields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </SelectInput>
    </Field>
  );
}

function nextModelSettings(
  settings: AppSettings,
  modelName: string,
  models: AnkiModelInfo[],
  defaultModel: AnkiModelInfo
): AppSettings {
  const model = models.find((item) => item.name === modelName) ?? defaultModel;
  return {
    ...settings,
    anki_model_name: model.name,
    anki_word_field: model.fields.includes(settings.anki_word_field)
      ? settings.anki_word_field
      : (model.fields[0] ?? ''),
    anki_sentence_field: model.fields.includes(settings.anki_sentence_field)
      ? settings.anki_sentence_field
      : (model.fields[1] ?? model.fields[0] ?? ''),
    anki_book_field: model.fields.includes(settings.anki_book_field)
      ? settings.anki_book_field
      : '',
    anki_chapter_field: model.fields.includes(settings.anki_chapter_field)
      ? settings.anki_chapter_field
      : '',
    anki_meaning_field: model.fields.includes(settings.anki_meaning_field)
      ? settings.anki_meaning_field
      : '',
  };
}

export function AnkiSyncSettings({
  defaultModel,
  editingEnabled,
  models,
  pipelines,
  selectedModel,
  settings,
  onEditPipeline,
  onEditPipelineInline,
  onLoadPipeline,
  onSaveMapping,
  onSettingsChange,
  onToggle,
}: AnkiSyncSettingsProps) {
  const isTauri = hasTauriRuntime();
  const updateSettings = (patch: Partial<AppSettings>) =>
    onSettingsChange({ ...settings, ...patch });
  const editorValue =
    settings.anki_preprocess_mode === 'llm'
      ? settings.anki_preprocess_prompt
      : settings.anki_preprocess_template;

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2">
          <Settings2 size={15} />
          Sync configuration
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="max-w-32 truncate text-xs font-normal text-muted-foreground">
            {settings.anki_model_name} &middot;{' '}
            {settings.anki_preprocess_mode === 'llm' ? 'LLM' : 'Template'}
          </span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-muted-foreground transition-transform ${editingEnabled ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {editingEnabled && (
        <div className="space-y-3 border-t border-border p-3">
          <Field label="Note type">
            <SelectInput
              value={settings.anki_model_name}
              onChange={(event) =>
                onSettingsChange(
                  nextModelSettings(settings, event.target.value, models, defaultModel)
                )
              }
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <FieldSelect
              label="Word"
              value={settings.anki_word_field}
              fields={selectedModel.fields}
              onChange={(value) => updateSettings({ anki_word_field: value })}
            />
            <FieldSelect
              label="Context"
              value={settings.anki_sentence_field}
              fields={selectedModel.fields}
              onChange={(value) => updateSettings({ anki_sentence_field: value })}
            />
            <FieldSelect
              label="Book"
              value={settings.anki_book_field}
              fields={selectedModel.fields}
              optional
              onChange={(value) => updateSettings({ anki_book_field: value })}
            />
            <FieldSelect
              label="Chapter"
              value={settings.anki_chapter_field}
              fields={selectedModel.fields}
              optional
              onChange={(value) => updateSettings({ anki_chapter_field: value })}
            />
            <FieldSelect
              label="Meaning"
              value={settings.anki_meaning_field}
              fields={selectedModel.fields}
              optional
              onChange={(value) => updateSettings({ anki_meaning_field: value })}
            />
          </div>

          <Button size="sm" onClick={onSaveMapping}>
            <Save size={15} />
            Save mapping
          </Button>

          <div className="space-y-2 border-t border-border pt-3">
            <Field label="Pipeline">
              <div className="flex gap-1">
                <SelectInput
                  className="min-w-0 flex-1"
                  value={settings.anki_pipeline_id}
                  onChange={(event) => onLoadPipeline(event.target.value)}
                >
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </SelectInput>
                {isTauri ? (
                  <Button size="sm" variant="outline" onClick={onEditPipeline}>
                    <FileText size={14} />
                    TOML
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onEditPipelineInline}>
                    <Edit3 size={14} />
                    Edit
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Preprocess">
              <SelectInput
                value={settings.anki_preprocess_mode}
                onChange={(event) => updateSettings({ anki_preprocess_mode: event.target.value })}
              >
                <option value="template">Template</option>
                <option value="llm">LLM JSON</option>
              </SelectInput>
            </Field>
            <TextArea
              className="min-h-24 px-2 py-1.5 font-mono text-xs"
              value={editorValue}
              onChange={(event) =>
                updateSettings(
                  settings.anki_preprocess_mode === 'llm'
                    ? { anki_preprocess_prompt: event.target.value }
                    : { anki_preprocess_template: event.target.value }
                )
              }
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
