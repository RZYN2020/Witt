import { ChoiceGrid, Field } from '@/components/ui/Form';
import { BUILT_IN_THEMES, type ReaderTheme } from '@/lib/themes';
import { type ReaderDisplaySettings } from './readerTypes';

interface ReaderAppearanceSettingsProps {
  customTheme: ReaderTheme;
  display: ReaderDisplaySettings;
  onDisplayChange: (settings: ReaderDisplaySettings) => void;
}

export function ReaderAppearanceSettings({
  customTheme,
  display,
  onDisplayChange,
}: ReaderAppearanceSettingsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Appearance</h3>
        <div className="mt-3">
          <ChoiceGrid
            columns={3}
            options={[...BUILT_IN_THEMES, customTheme].map((theme) => ({
              id: theme.id,
              label: theme.name,
            }))}
            value={display.themeId}
            onChange={(themeId) => onDisplayChange({ ...display, themeId })}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Page mode</h3>
        <div className="mt-3">
          <ChoiceGrid
            options={[
              { id: 'single', label: 'Single' },
              { id: 'double', label: 'Double' },
            ]}
            value={display.pageMode}
            onChange={(pageMode) => onDisplayChange({ ...display, pageMode })}
          />
        </div>
      </div>

      <Field label="Font size">
        <input
          className="w-full"
          type="range"
          min="14"
          max="28"
          value={display.fontSize}
          onChange={(event) =>
            onDisplayChange({ ...display, fontSize: Number(event.target.value) })
          }
        />
      </Field>

      <Field label="Line height">
        <input
          className="w-full"
          type="range"
          min="1.3"
          max="2.2"
          step="0.1"
          value={display.lineHeight}
          onChange={(event) =>
            onDisplayChange({ ...display, lineHeight: Number(event.target.value) })
          }
        />
      </Field>
    </div>
  );
}
