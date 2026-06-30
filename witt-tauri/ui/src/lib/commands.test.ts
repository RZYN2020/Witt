import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAnki, getSettings, hasTauriRuntime, importBook, listBooks } from './commands';

describe('command transport', () => {
  beforeEach(() => {
    window.localStorage.setItem('witt.webToken', 'test-token');
    vi.spyOn(window, 'prompt').mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('uses HTTP APIs outside the Tauri runtime', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/books') {
        return Promise.resolve(jsonResponse([]));
      }
      if (url === '/api/anki/status') {
        return Promise.resolve(jsonResponse({ available: true, version: 6 }));
      }
      if (url === '/api/settings') {
        return Promise.resolve(
          jsonResponse({
            anki_endpoint: 'http://localhost:8765',
            anki_model_name: 'Witt EPUB Sentence',
          })
        );
      }
      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });

    expect(hasTauriRuntime()).toBe(false);
    await expect(listBooks()).resolves.toEqual([]);
    await expect(checkAnki()).resolves.toEqual({ available: true, version: 6 });
    await expect(getSettings()).resolves.toMatchObject({
      anki_endpoint: 'http://localhost:8765',
      anki_model_name: 'Witt EPUB Sentence',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.any(Headers),
      })
    );
  });

  it('uploads EPUB files with multipart outside the Tauri runtime', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'book-1',
        title: 'Example',
        author: 'Unknown author',
        file_path: 'book-1.epub',
        imported_at: 'now',
        updated_at: 'now',
      })
    );

    const file = new File(['epub'], 'example.epub', { type: 'application/epub+zip' });
    await expect(importBook(file)).resolves.toMatchObject({ id: 'book-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books',
      expect.objectContaining({
        method: 'POST',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: expect.any(FormData),
      })
    );
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
