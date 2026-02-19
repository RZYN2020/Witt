import { cn } from '@/lib/utils';

interface SubtitleOverlayProps {
  text: string;
  position?: 'top' | 'middle' | 'bottom';
}

export function SubtitleOverlay({ text, position = 'bottom' }: SubtitleOverlayProps) {
  const positionClasses = {
    top: 'top-4',
    middle: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-20',
  };

  return (
    <div
      className={cn(
        'absolute left-0 right-0 px-8 pointer-events-none',
        positionClasses[position]
      )}
    >
      <div className="bg-black/70 text-white text-lg px-4 py-2 rounded inline-block max-w-full mx-auto">
        <p className="text-center">{text}</p>
      </div>
    </div>
  );
}
