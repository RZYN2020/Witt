/**
 * APKG file generation using JSZip
 * APKG is a ZIP file containing:
 * - collection.anki2 (SQLite database)
 * - media files (audio, images)
 */
import JSZip from 'jszip';
import type { Note } from '@/types';

/**
 * Generate APKG file from notes
 */
export async function generateAPKG(notes: Note[]): Promise<Blob> {
  const zip = new JSZip();

  // For now, export as simplified APKG structure
  // In production, you would create proper SQLite database

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    format: 'apkg',
    notesCount: notes.length,
    notes: notes.map((note) => ({
      guid: generateGUID(),
      mid: '1',
      flds: [
        note.lemma,
        note.phonetics || '',
        note.definition,
        note.contexts.map((ctx) => `${ctx.word_form}: ${ctx.sentence}`).join('<br>'),
      ],
      tags: note.tags,
      deck: note.deck,
    })),
  };

  // Add collection.json (for debugging/inspection)
  zip.file('collection.json', JSON.stringify(exportData, null, 2));

  // Add media.json mapping
  const mediaMap: Record<string, string> = {};
  notes.forEach((note, idx) => {
    if (note.pronunciation) {
      const path =
        typeof note.pronunciation === 'string' ? note.pronunciation : note.pronunciation.file_path;
      mediaMap[idx.toString()] = path;
    }
  });
  zip.file('media.json', JSON.stringify(mediaMap, null, 2));

  // Generate ZIP file
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generate unique GUID for Anki notes
 */
function generateGUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Download APKG file
 */
export function downloadAPKG(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
