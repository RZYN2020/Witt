import { describe, expect, it } from 'vitest';
import { checkAnki, getSettings, hasTauriRuntime, importBook, listBooks } from './commands';

describe('command transport', () => {
  it('provides safe read-only fallbacks outside the Tauri runtime', async () => {
    expect(hasTauriRuntime()).toBe(false);
    await expect(listBooks()).resolves.toEqual([]);
    await expect(checkAnki()).resolves.toEqual({ available: false, version: null });
    await expect(getSettings()).resolves.toMatchObject({
      anki_endpoint: 'http://localhost:8765',
      anki_model_name: 'Witt EPUB Sentence',
    });
  });

  it('rejects OS-backed commands outside the Tauri runtime', async () => {
    await expect(importBook('/tmp/example.epub')).rejects.toThrow(
      'import_book requires the Tauri desktop runtime'
    );
  });
});
