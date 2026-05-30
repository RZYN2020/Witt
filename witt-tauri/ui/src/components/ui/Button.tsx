import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Button component with variants
 */
export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:pointer-events-none',
        // Variants
        variant === 'default' && 'bg-muted text-foreground hover:bg-accent',
        variant === 'outline' && 'border border-border bg-background hover:bg-accent',
        variant === 'ghost' && 'hover:bg-accent',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        // Sizes
        size === 'sm' && 'h-9 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-11 px-8 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
