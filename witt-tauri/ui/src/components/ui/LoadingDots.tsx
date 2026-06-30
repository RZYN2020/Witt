export function LoadingDots() {
  return (
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
  );
}
