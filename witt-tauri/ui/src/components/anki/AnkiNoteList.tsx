import { type AnkiNote } from '@/lib/commands';

interface AnkiNoteListProps {
  notes: AnkiNote[];
}

export function AnkiNoteList({ notes }: AnkiNoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border bg-card/60 p-6 text-center">
        <p className="max-w-56 text-sm leading-6 text-muted-foreground">
          Select a deck and refresh to browse cached cards.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <article key={note.note_id} className="rounded-md border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words text-base font-semibold leading-snug">
              {note.word}
            </h3>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {note.deck_name}
            </span>
          </div>
          {note.sentence && (
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
              {note.sentence}
            </p>
          )}
          {note.meaning && (
            <p className="mt-3 line-clamp-5 rounded-md bg-muted/70 p-3 text-xs leading-5 text-muted-foreground">
              {note.meaning}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
