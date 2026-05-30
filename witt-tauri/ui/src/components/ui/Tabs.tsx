import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  panelIdPrefix?: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, panelIdPrefix = 'tab', onChange }: TabsProps) {
  return (
    <div className="flex border-b border-border" role="tablist" aria-label="Settings sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${panelIdPrefix}-${tab.id}-tab`}
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`${panelIdPrefix}-${tab.id}-panel`}
          tabIndex={active === tab.id ? 0 : -1}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            active === tab.id
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
