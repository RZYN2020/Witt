import { type ChatMessage } from '@/lib/commands';
import { cn } from '@/lib/utils';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { ProseMarkdown } from '@/components/ui/ProseMarkdown';

interface AiChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function AiChatView({ messages, loading }: AiChatViewProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {messages.length === 0 && !loading && (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-center text-sm text-muted-foreground">
            Ask a question about what you are reading.
          </p>
        </div>
      )}
      {messages.map((msg, index) => (
        <div
          key={index}
          className={cn('flex flex-col gap-1', msg.role === 'user' ? 'items-end' : 'items-start')}
        >
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {msg.role === 'user' ? 'You' : 'AI'}
          </span>
          <div
            className={cn(
              'max-w-[85%] rounded-lg px-3.5 py-2.5',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card'
            )}
          >
            {msg.role === 'assistant' ? (
              <ProseMarkdown className="[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                {msg.content}
              </ProseMarkdown>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {loading && <LoadingDots />}
    </div>
  );
}
