import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, children, className }: FieldProps) {
  return (
    <label className={cn('block text-xs font-medium text-muted-foreground', className)}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
        className
      )}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
        className
      )}
      {...props}
    />
  );
}

export function StatusText({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }
  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      {children}
    </p>
  );
}

interface ChoiceGridProps<T extends string> {
  columns?: 2 | 3;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

export function ChoiceGrid<T extends string>({
  columns = 2,
  options,
  value,
  onChange,
}: ChoiceGridProps<T>) {
  return (
    <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {options.map((option) => (
        <button
          key={option.id}
          className={cn(
            'rounded-md border px-2 py-2 text-xs capitalize transition-colors',
            value === option.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
