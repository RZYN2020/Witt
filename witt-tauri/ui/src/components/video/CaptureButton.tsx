import { cn } from '@/lib/utils';

interface CaptureButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CaptureButton({ onClick, disabled }: CaptureButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'pointer-events-auto px-6 py-3 rounded-full font-semibold transition-all transform',
        disabled
          ? 'bg-white/50 text-white/70 cursor-not-allowed'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-lg'
      )}
    >
      📖 Capture This
    </button>
  );
}
