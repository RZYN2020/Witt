export function getSentenceAround(text: string, selected: string): string {
  const normalized = text.replace(/\s+/g, ' ');
  const index = normalized.toLowerCase().indexOf(selected.toLowerCase());
  if (index < 0) {
    return normalized.slice(0, 240);
  }

  const marks = ['. ', '? ', '! ', '。', '？', '！'];
  let start = 0;
  for (const mark of marks) {
    const found = normalized.lastIndexOf(mark, index - 1);
    if (found >= 0) {
      start = Math.max(start, found + mark.length);
    }
  }

  let end = normalized.length;
  for (const mark of marks) {
    const found = normalized.indexOf(mark, index + selected.length);
    if (found >= 0) {
      end = Math.min(end, found + mark.trim().length);
    }
  }
  return normalized.slice(start, end).trim();
}

export function normalizeWord(value: string): string {
  return value.replace(/[^\p{L}'‘’-]/gu, '').trim();
}

export interface HighlightToken {
  word: string;
  status: 'new' | 'learning' | 'known' | 'ignored';
  meaning?: string;
}

export function applyHighlights(document: Document, tokens: Array<HighlightToken | string>): void {
  const entries = Array.from(
    new Map(
      tokens
        .map((token) =>
          typeof token === 'string' ? { word: token, status: 'learning' as const } : token
        )
        .map((token) => ({ ...token, normalized: token.word.trim().toLowerCase() }))
        .filter((token) => token.normalized.length > 1 && token.status !== 'ignored')
        .map((token) => [token.normalized, token])
    ).values()
  );
  if (entries.length === 0 || !document.body) {
    return;
  }
  const statusByWord = new Map(entries.map((entry) => [entry.normalized, entry.status]));
  const meaningByWord = new Map(
    entries
      .filter((entry) => entry.meaning)
      .map((entry) => [entry.normalized, entry.meaning as string])
  );

  const pattern = new RegExp(
    `\\b(${entries.map((entry) => entry.normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current.textContent && pattern.test(current.textContent)) {
      nodes.push(current as Text);
    }
    pattern.lastIndex = 0;
    current = walker.nextNode();
  }

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('mark')) {
      continue;
    }
    const fragment = document.createDocumentFragment();
    const text = node.textContent || '';
    let lastIndex = 0;
    text.replace(pattern, (match, _word: string, offset: number) => {
      fragment.append(document.createTextNode(text.slice(lastIndex, offset)));
      const mark = document.createElement('mark');
      mark.className = 'witt-highlight';
      const normalized = match.toLowerCase();
      const status = statusByWord.get(normalized) ?? 'learning';
      mark.dataset.wittWord = normalized;
      mark.dataset.wittStatus = status;
      mark.title = meaningByWord.get(normalized) ?? statusLabel(status);
      mark.textContent = match;
      fragment.append(mark);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.append(document.createTextNode(text.slice(lastIndex)));
    node.replaceWith(fragment);
    pattern.lastIndex = 0;
  }
}

function statusLabel(status: HighlightToken['status']) {
  if (status === 'known') {
    return 'Known word';
  }
  if (status === 'new') {
    return 'New word';
  }
  return 'Learning word';
}
