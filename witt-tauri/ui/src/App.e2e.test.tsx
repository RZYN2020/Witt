import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('@/lib/commands', () => ({
  listBooks: vi.fn().mockResolvedValue([]),
  importBook: vi.fn(),
  removeBook: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
}));

describe('App (e2e smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AnkiConnect unavailable in test')));
  });

  it('renders the bookshelf workspace', async () => {
    render(<App />);

    expect(await screen.findByText('Bookshelf')).toBeInTheDocument();
    expect(screen.getByText('Import EPUB')).toBeInTheDocument();
    expect(screen.getByText('Start with an EPUB')).toBeInTheDocument();
  });
});
