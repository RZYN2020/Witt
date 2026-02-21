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
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
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
