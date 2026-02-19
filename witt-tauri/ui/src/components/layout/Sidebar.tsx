import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { cn } from '@/lib/utils';
import { Inbox, Layers, Video, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
  currentTab: 'inbox' | 'deck' | 'video';
  onTabChange: (tab: 'inbox' | 'deck' | 'video') => void;
}

/**
 * Main sidebar with collapsible functionality
 */
export function Sidebar({
  collapsed,
  onToggleCollapse,
  onOpenSettings,
  currentTab,
  onTabChange,
}: SidebarProps) {
  const { cards } = useLibraryStore();

  // Calculate counts
  const counts = useMemo(() => {
    return {
      inbox: cards.length,
      deck: new Set(cards.map(c => c.word)).size,
      video: cards.filter(c => c.source.type === 'video').length,
    };
  }, [cards]);

  const tabs = [
    { id: 'inbox' as const, icon: Inbox, label: '收集箱', count: counts.inbox },
    { id: 'deck' as const, icon: Layers, label: 'Decks', count: counts.deck },
    { id: 'video' as const, icon: Video, label: '视频', count: counts.video },
  ];

  return (
    <aside
      className={cn(
        'border-r border-border bg-muted/30 flex flex-col transition-all duration-300',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn("h-[57px] flex items-center px-4 border-b border-border", collapsed ? 'justify-center' : '')}>
        {!collapsed && (
          <span className="text-lg font-bold text-foreground">Witt</span>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-foreground">W</span>
        )}
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 overflow-y-auto p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'w-full flex items-center rounded-lg transition-all',
                collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
              title={collapsed ? tab.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">{tab.label}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                  )}>
                    {tab.count}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={cn("p-2 border-t border-border", collapsed ? 'flex flex-col items-center' : 'space-y-1')}>
        <button
          onClick={onOpenSettings}
          className={cn(
            'w-full flex items-center rounded-lg transition-colors text-sm',
            collapsed 
              ? 'justify-center p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground' 
              : 'gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>设置</span>}
        </button>

        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center rounded-lg transition-colors text-sm',
            collapsed 
              ? 'justify-center p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground' 
              : 'gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
          )}
          {!collapsed && <span>收起</span>}
        </button>
      </div>
    </aside>
  );
}
