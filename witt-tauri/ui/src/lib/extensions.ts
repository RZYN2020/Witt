import type { Annotation } from './commands';

export interface ReaderExtensionContext {
  bookTitle: string;
  chapterTitle: string;
  selectedText?: string;
}

export interface WittExtension {
  id: string;
  label: string;
  run(context: ReaderExtensionContext): Promise<void> | void;
}

export interface AnnotationSink {
  id: string;
  label: string;
  sync(annotations: Annotation[]): Promise<void>;
}

export const extensionRegistry = {
  readerTools: [] as WittExtension[],
  annotationSinks: [] as AnnotationSink[],
};
