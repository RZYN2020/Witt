export interface CardGenerationAnnotation {
  id: string;
  word: string;
  sentence: string;
  bookTitle?: string;
}

export interface LlmSettings {
  endpoint: string;
  apiKey: string;
  model: string;
}

export function chunkAnnotations<T>(items: T[], size = 20): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function fallbackMeaning(annotation: CardGenerationAnnotation): string {
  return `Context sentence: ${annotation.sentence}`;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GeneratedCardsResponse {
  items?: Array<{
    id?: string;
    meaning?: string;
  }>;
}

function isChatCompletionResponse(value: unknown): value is ChatCompletionResponse {
  return !!value && typeof value === 'object';
}

function parseGeneratedCards(content: string): GeneratedCardsResponse {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }
  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return {};
  }
  return {
    items: items
      .filter((item): item is { id: string; meaning: string } => {
        if (!item || typeof item !== 'object') {
          return false;
        }
        const candidate = item as { id?: unknown; meaning?: unknown };
        return typeof candidate.id === 'string' && typeof candidate.meaning === 'string';
      })
      .map((item) => ({ id: item.id, meaning: item.meaning })),
  };
}

export async function generateCardBacks(
  annotations: CardGenerationAnnotation[],
  settings: LlmSettings
): Promise<Record<string, string>> {
  if (!settings.apiKey.trim() || !settings.endpoint.trim()) {
    return Object.fromEntries(annotations.map((item) => [item.id, fallbackMeaning(item)]));
  }

  const output: Record<string, string> = {};
  for (const chunk of chunkAnnotations(annotations, 20)) {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'system',
            content:
              'Generate concise language-learning Anki card backs. Return strict JSON: {"items":[{"id":"...","meaning":"..."}]}. Include definition, usage note, and a short Chinese explanation.',
          },
          {
            role: 'user',
            content: JSON.stringify(
              chunk.map((item) => ({
                id: item.id,
                word: item.word,
                sentence: item.sentence,
                book: item.bookTitle,
              }))
            ),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    const content = isChatCompletionResponse(payload)
      ? payload.choices?.[0]?.message?.content || '{}'
      : '{}';
    const parsed = parseGeneratedCards(content);
    for (const item of parsed.items || []) {
      if (item.id && item.meaning) {
        output[item.id] = item.meaning;
      }
    }
  }

  for (const annotation of annotations) {
    output[annotation.id] ||= fallbackMeaning(annotation);
  }
  return output;
}
