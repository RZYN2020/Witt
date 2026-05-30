import { describe, expect, it } from 'vitest';
import { applyHighlights, getSentenceAround, normalizeWord } from './readerText';

describe('readerText', () => {
  it('extracts the sentence around an English selection', () => {
    expect(
      getSentenceAround('First sentence. The selected word is here. Last sentence.', 'selected')
    ).toBe('The selected word is here.');
  });

  it('extracts the sentence around a Chinese selection', () => {
    expect(getSentenceAround('第一句。这里有一个词语。最后一句。', '词语')).toBe(
      '这里有一个词语。'
    );
  });

  it('falls back to a compact excerpt when the selection is not found', () => {
    const excerpt = getSentenceAround('A '.repeat(300), 'missing');
    expect(excerpt).toHaveLength(240);
  });

  it('normalizes selected words without stripping letters, apostrophes, or hyphens', () => {
    expect(normalizeWord(' “mother-in-law’s,” ')).toBe('mother-in-law’s');
    expect(normalizeWord('  word!  ')).toBe('word');
  });

  it('highlights known words and escapes regex characters', () => {
    const document = new DOMParser().parseFromString(
      '<main><p>Use C++ and word. Another WORD appears.</p></main>',
      'text/html'
    );

    applyHighlights(document, ['word', 'c++']);

    expect([...document.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual([
      'word',
      'WORD',
    ]);
  });

  it('does not nest highlights inside existing mark elements', () => {
    const document = new DOMParser().parseFromString(
      '<main><p><mark>word</mark> word</p></main>',
      'text/html'
    );

    applyHighlights(document, ['word']);

    expect(document.querySelectorAll('mark')).toHaveLength(2);
  });
});
