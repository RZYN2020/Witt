import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { cn } from '@/lib/utils';
import { Inbox, Video, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import type { Note, Context } from '@/types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  currentTab: 'inbox' | 'video';
  onTabChange: (tab: 'inbox' | 'video') => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onOpenSettings,
  currentTab,
  onTabChange,
}: SidebarProps) {
  const { notes } = useLibraryStore();

  const counts = useMemo(() => {
    return {
      inbox: notes.length,
      video: notes.filter((n: Note) => n.contexts.some((c: Context) => c.source.type === 'video')).length,
    };
  }, [notes]);

  const tabs = [
    { id: 'inbox' as const, icon: Inbox, label: '收集箱', count: counts.inbox },
    { id: 'video' as const, icon: Video, label: '视频', count: counts.video },
  ];

  return (
    <aside
      className={cn(
        'border-r border-border bg-muted/30 flex flex-col transition-all duration-300',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      <div className={cn("h-[57px] flex items-center px-4 border-b border-border", collapsed ? 'justify-center' : '')}>
        {!collapsed && (
          <span className="text-lg font-bold text-foreground">Witt</span>
        )}
      </div>

      <nav className="flex-1 py-4">
        <div className="px-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                currentTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{tab.label}</span>
                  <span className="text-xs opacity-75">{tab.count}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 p-2 text-muted-foreground hover:bg-accent rounded transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
        {!collapsed && (
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 p-2 text-muted-foreground hover:bg-accent rounded transition-colors mt-1"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>
        )}
      </div>
    </aside>
  );
}
