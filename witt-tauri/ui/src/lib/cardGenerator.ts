/**
 * Card generation utilities for Anki
 */
import type { Note, Context } from '@/types';

/**
 * Card template structure
 */
export interface CardTemplate {
  name: string;
  front: string;
  back: string;
  css: string;
}

/**
 * Generated card
 */
export interface GeneratedCard {
  id: string;
  type: 'basic' | 'context' | 'cloze';
  front: string;
  back: string;
  tags: string[];
  noteLemma: string;
  contextIndex?: number;
}

/**
 * Card generation options
 */
export interface CardGenerationOptions {
  generateBasic: boolean;
  generateContexts: boolean;
  generateCloze: boolean;
  maxContexts: number;
  template: CardTemplate;
}

/**
 * Default card templates
 */
export const DEFAULT_TEMPLATES: Record<string, CardTemplate> = {
  basic: {
    name: 'Witt - Basic',
    front: `
      <div class="card">
        <h1 class="lemma">{{Lemma}}</h1>
        <div class="phonetics">{{Phonetics}}</div>
        {{#Pronunciation}}
        <audio src="{{Pronunciation}}" controls></audio>
        {{/Pronunciation}}
      </div>
    `,
    back: `
      <div class="card">
        <h1 class="lemma">{{Lemma}}</h1>
        <div class="phonetics">{{Phonetics}}</div>
        {{#Pronunciation}}
        <audio src="{{Pronunciation}}" controls></audio>
        {{/Pronunciation}}
        <div class="definition">{{Definition}}</div>
        <div class="contexts">{{Contexts}}</div>
        {{#Comment}}
        <div class="comment">{{Comment}}</div>
        {{/Comment}}
      </div>
    `,
    css: `
      .card {
        font-family: Arial, sans-serif;
        font-size: 20px;
        text-align: center;
        color: #333;
        background: #fff;
        padding: 20px;
      }
      .lemma {
        font-size: 28px;
        font-weight: bold;
        color: #2c5282;
        margin-bottom: 10px;
      }
      .phonetics {
        font-style: italic;
        color: #718096;
        margin-bottom: 15px;
      }
      .definition {
        font-size: 18px;
        margin: 20px 0;
        padding: 15px;
        background: #f7fafc;
        border-radius: 8px;
      }
      .contexts {
        text-align: left;
        margin-top: 20px;
      }
      .comment {
        margin-top: 15px;
        padding: 10px;
        background: #fffaf0;
        border-left: 3px solid #ed8936;
        text-align: left;
      }
    `,
  },
  context: {
    name: 'Witt - Context',
    front: `
      <div class="card">
        <div class="sentence">{{Sentence}}</div>
        {{#Image}}
        <img src="{{Image}}" class="context-image" alt="Context image">
        {{/Image}}
        {{#Source}}
        <div class="source">{{Source}}</div>
        {{/Source}}
      </div>
    `,
    back: `
      <div class="card">
        <h1 class="lemma">{{Lemma}}</h1>
        <div class="phonetics">{{Phonetics}}</div>
        {{#Pronunciation}}
        <audio src="{{Pronunciation}}" controls></audio>
        {{/Pronunciation}}
        {{#ContextAudio}}
        <audio src="{{ContextAudio}}" controls></audio>
        {{/ContextAudio}}
        <div class="definition">{{Definition}}</div>
        <div class="word-form">{{WordForm}}</div>
        {{#OtherContexts}}
        <div class="other-contexts">
          <h3>Other Contexts:</h3>
          {{OtherContexts}}
        </div>
        {{/OtherContexts}}
        {{#Comment}}
        <div class="comment">{{Comment}}</div>
        {{/Comment}}
      </div>
    `,
    css: `
      .card {
        font-family: Arial, sans-serif;
        font-size: 18px;
        text-align: center;
        color: #333;
        background: #fff;
        padding: 20px;
      }
      .lemma {
        font-size: 24px;
        font-weight: bold;
        color: #2c5282;
        margin-bottom: 10px;
      }
      .sentence {
        font-size: 22px;
        margin: 20px 0;
        padding: 15px;
        background: #ebf8ff;
        border-radius: 8px;
      }
      .context-image {
        max-width: 100%;
        max-height: 300px;
        margin: 15px 0;
        border-radius: 8px;
      }
      .source {
        font-size: 14px;
        color: #718096;
        margin-top: 10px;
      }
      .word-form {
        font-weight: bold;
        color: #38a169;
        margin: 15px 0;
      }
      .other-contexts {
        text-align: left;
        margin-top: 20px;
        padding: 15px;
        background: #f7fafc;
        border-radius: 8px;
      }
    `,
  },
  cloze: {
    name: 'Witt - Cloze',
    front: `
      <div class="card">
        <div class="cloze-sentence">{{c1::Sentence}}</div>
        <div class="hint">{{WordForm}}</div>
      </div>
    `,
    back: `
      <div class="card">
        <div class="cloze-sentence">{{c1::Sentence}}</div>
        <div class="word-form">{{WordForm}}</div>
        <div class="lemma">{{Lemma}}</div>
        <div class="definition">{{Definition}}</div>
      </div>
    `,
    css: `
      .card {
        font-family: Arial, sans-serif;
        font-size: 20px;
        text-align: center;
        color: #333;
        background: #fff;
        padding: 20px;
      }
      .cloze-sentence {
        font-size: 22px;
        margin: 20px 0;
        line-height: 1.6;
      }
      .hint {
        font-size: 16px;
        color: #718096;
        margin-top: 15px;
      }
      .word-form {
        font-weight: bold;
        color: #38a169;
        margin: 15px 0;
      }
      .lemma {
        font-size: 24px;
        font-weight: bold;
        color: #2c5282;
        margin: 10px 0;
      }
      .definition {
        font-size: 18px;
        margin: 15px 0;
        padding: 15px;
        background: #f7fafc;
        border-radius: 8px;
      }
    `,
  },
};

/**
 * Generate cards from a Note
 */
export function generateCards(
  note: Note,
  options: Partial<CardGenerationOptions> = {}
): GeneratedCard[] {
  const defaultOptions: CardGenerationOptions = {
    generateBasic: true,
    generateContexts: true,
    generateCloze: false,
    maxContexts: 5,
    template: DEFAULT_TEMPLATES.basic,
    ...options,
  };

  const cards: GeneratedCard[] = [];

  // Generate basic card
  if (defaultOptions.generateBasic) {
    cards.push(generateBasicCard(note, defaultOptions.template));
  }

  // Generate context cards
  if (defaultOptions.generateContexts) {
    const contextsToGenerate = Math.min(note.contexts.length, defaultOptions.maxContexts);

    for (let i = 0; i < contextsToGenerate; i++) {
      const context = note.contexts[i];
      cards.push(generateContextCard(note, context, i, DEFAULT_TEMPLATES.context));
    }
  }

  // Generate cloze cards
  if (defaultOptions.generateCloze) {
    const contextsToGenerate = Math.min(note.contexts.length, defaultOptions.maxContexts);

    for (let i = 0; i < contextsToGenerate; i++) {
      const context = note.contexts[i];
      cards.push(generateClozeCard(note, context, i, DEFAULT_TEMPLATES.cloze));
    }
  }

  return cards;
}

/**
 * Generate a basic card
 */
function generateBasicCard(note: Note, template: CardTemplate): GeneratedCard {
  return {
    id: crypto.randomUUID(),
    type: 'basic',
    front: renderTemplate(template.front, {
      Lemma: note.lemma,
      Phonetics: note.phonetics || '',
      Pronunciation:
        typeof note.pronunciation === 'string'
          ? note.pronunciation
          : note.pronunciation?.file_path || '',
    }),
    back: renderTemplate(template.back, {
      Lemma: note.lemma,
      Phonetics: note.phonetics || '',
      Pronunciation:
        typeof note.pronunciation === 'string'
          ? note.pronunciation
          : note.pronunciation?.file_path || '',
      Definition: note.definition,
      Contexts: formatContexts(note.contexts),
      Comment: note.comment,
    }),
    tags: [...note.tags, 'witt', 'basic'],
    noteLemma: note.lemma,
  };
}

/**
 * Generate a context card
 */
function generateContextCard(
  note: Note,
  context: Context,
  index: number,
  template: CardTemplate
): GeneratedCard {
  return {
    id: crypto.randomUUID(),
    type: 'context',
    front: renderTemplate(template.front, {
      Sentence: context.sentence,
      Image: typeof context.image === 'string' ? context.image : context.image?.file_path || '',
      Source: formatSource(context.source),
    }),
    back: renderTemplate(template.back, {
      Lemma: note.lemma,
      Phonetics: note.phonetics || '',
      Pronunciation:
        typeof note.pronunciation === 'string'
          ? note.pronunciation
          : note.pronunciation?.file_path || '',
      ContextAudio:
        typeof context.audio === 'string' ? context.audio : context.audio?.file_path || '',
      Definition: note.definition,
      WordForm: context.word_form,
      OtherContexts: formatOtherContexts(note.contexts, context.id),
      Comment: note.comment,
    }),
    tags: [...note.tags, 'witt', 'context', `context-${index + 1}`],
    noteLemma: note.lemma,
    contextIndex: index,
  };
}

/**
 * Generate a cloze deletion card
 */
function generateClozeCard(
  note: Note,
  context: Context,
  index: number,
  template: CardTemplate
): GeneratedCard {
  const clozeSentence = createClozeSentence(context.sentence, context.word_form);

  return {
    id: crypto.randomUUID(),
    type: 'cloze',
    front: renderTemplate(template.front, {
      Sentence: clozeSentence,
      WordForm: context.word_form,
    }),
    back: renderTemplate(template.back, {
      Sentence: clozeSentence,
      WordForm: context.word_form,
      Lemma: note.lemma,
      Definition: note.definition,
    }),
    tags: [...note.tags, 'witt', 'cloze', `cloze-${index + 1}`],
    noteLemma: note.lemma,
    contextIndex: index,
  };
}

/**
 * Create a cloze deletion sentence
 */
function createClozeSentence(sentence: string, wordForm: string): string {
  // Replace the word form with a cloze deletion marker
  const regex = new RegExp(`\\b${escapeRegex(wordForm)}\\b`, 'gi');
  return sentence.replace(regex, '______');
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render a template with replacements
 */
function renderTemplate(template: string, data: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    // Handle Anki conditional blocks {{#Key}}...{{/Key}}
    const conditionalRegex = new RegExp(`{{#${key}}}(.*?){{/${key}}}`, 'gs');
    if (value) {
      result = result.replace(conditionalRegex, value);
    } else {
      result = result.replace(conditionalRegex, '');
    }

    // Handle simple replacements {{Key}}
    const simpleRegex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(simpleRegex, value || '');
  }

  return result.trim();
}

/**
 * Format contexts for display
 */
function formatContexts(contexts: Context[]): string {
  if (contexts.length === 0) return '';

  return contexts
    .map(
      (ctx) =>
        `<div class="context-item"><strong>${ctx.word_form}:</strong> ${truncate(ctx.sentence, 100)}</div>`
    )
    .join('');
}

/**
 * Format other contexts (excluding current)
 */
function formatOtherContexts(contexts: Context[], excludeId: string): string {
  const otherContexts = contexts.filter((ctx) => ctx.id !== excludeId);
  if (otherContexts.length === 0) return '';

  return `
    <ul>
      ${otherContexts
        .map((ctx) => `<li><strong>${ctx.word_form}:</strong> ${truncate(ctx.sentence, 80)}</li>`)
        .join('')}
    </ul>
  `;
}

/**
 * Format source for display
 */
function formatSource(source: Context['source']): string {
  switch (source.type) {
    case 'web':
      return `<a href="${source.url}" target="_blank">${source.title}</a>`;
    case 'video':
      return `Video: ${source.filename} @ ${source.timestamp}`;
    case 'pdf':
      return `PDF: ${source.filename}${source.page ? ` (p.${source.page})` : ''}`;
    case 'app':
      return `${source.name}${source.title ? ` - ${source.title}` : ''}`;
    default:
      return '';
  }
}

/**
 * Truncate text to a certain length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Preview card generation
 */
export function previewCardGeneration(note: Note): {
  basicCount: number;
  contextCount: number;
  clozeCount: number;
  total: number;
} {
  const basicCount = 1;
  const contextCount = Math.min(note.contexts.length, 5);
  const clozeCount = contextCount;

  return {
    basicCount,
    contextCount,
    clozeCount,
    total: basicCount + contextCount + clozeCount,
  };
}
