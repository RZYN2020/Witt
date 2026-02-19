import type { Source } from '@/types';
import { cn } from '@/lib/utils';

interface SourceMetadataProps {
  source?: Source;
}

/**
 * Display source metadata with icons
 */
export function SourceMetadata({ source }: SourceMetadataProps) {
  if (!source) return null;

  const renderSourceContent = () => {
    switch (source.type) {
      case 'web':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10">
              {source.icon ? (
                <img src={source.icon} alt="" className="w-5 h-5" />
              ) : (
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {source.title}
              </p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline truncate block"
              >
                {source.url}
              </a>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10">
              <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {source.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                🎬 {source.timestamp}
                {source.frame !== undefined && ` • Frame ${source.frame}`}
              </p>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10">
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {source.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                📄 PDF
                {source.page !== undefined && ` • Page ${source.page}`}
              </p>
            </div>
          </div>
        );

      case 'app':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10">
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {source.name}
              </p>
              {source.title && (
                <p className="text-xs text-muted-foreground truncate">
                  {source.title}
                </p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      'bg-gradient-to-r from-muted/50 to-muted/30',
      'border-border'
    )}>
      {renderSourceContent()}
    </div>
  );
}
