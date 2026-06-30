import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type ChatMessage } from '@/lib/commands';
import { cn } from '@/lib/utils';

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
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
                [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2.5 [&_pre]:text-xs
                [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs [&_code]:before:content-none [&_code]:after:content-none
                [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1
                [&_table]:w-full [&_table]:text-xs
                [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1
                [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                "
              >
                <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex items-start gap-1 px-1 py-1">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      )}
    </div>
  );
}
