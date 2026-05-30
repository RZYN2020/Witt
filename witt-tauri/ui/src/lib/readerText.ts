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

export function applyHighlights(document: Document, words: string[]): void {
  const unique = Array.from(
    new Set(words.map((word) => word.trim().toLowerCase()).filter((word) => word.length > 1))
  );
  if (unique.length === 0 || !document.body) {
    return;
  }

  const pattern = new RegExp(
    `\\b(${unique.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
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
