import { Download, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Form';
import { type ReaderTheme } from '@/lib/themes';

interface CustomThemeEditorProps {
  theme: ReaderTheme;
  onExport: () => void;
  onImport: (file: File | undefined) => void;
  onSave: () => void;
  onThemeChange: (theme: ReaderTheme) => void;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-9 cursor-pointer rounded border border-border p-0.5"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <TextInput
          className="h-9 min-w-0 flex-1 px-2 py-1 font-mono text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}

export function CustomThemeEditor({
  theme,
  onExport,
  onImport,
  onSave,
  onThemeChange,
}: CustomThemeEditorProps) {
  const updateTheme = (patch: Partial<ReaderTheme>) => onThemeChange({ ...theme, ...patch });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Custom theme editor</h3>
      <TextInput
        placeholder="Theme name"
        value={theme.name}
        onChange={(event) => updateTheme({ name: event.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Background"
          value={theme.background}
          onChange={(value) => updateTheme({ background: value })}
        />
        <ColorField
          label="Text"
          value={theme.foreground}
          onChange={(value) => updateTheme({ foreground: value })}
        />
        <ColorField
          label="Links"
          value={theme.link}
          onChange={(value) => updateTheme({ link: value })}
        />
        <ColorField
          label="Selection"
          value={theme.selection}
          onChange={(value) => updateTheme({ selection: value })}
        />
        <ColorField
          label="Highlight BG"
          value={theme.highlightBackground}
          onChange={(value) => updateTheme({ highlightBackground: value })}
        />
        <ColorField
          label="Highlight Text"
          value={theme.highlightForeground}
          onChange={(value) => updateTheme({ highlightForeground: value })}
        />
      </div>
      <TextArea
        className="h-44 font-mono text-xs"
        value={theme.css}
        onChange={(event) => updateTheme({ css: event.target.value })}
        spellCheck={false}
        placeholder="Custom CSS..."
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSave}>
          <Save size={15} />
          Save theme
        </Button>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download size={15} />
          Export
        </Button>
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent">
          <Upload size={15} />
          Import
          <input
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => onImport(event.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}
