declare module 'epubjs' {
  export interface EpubLocation {
    start?: {
      cfi?: string;
      href?: string;
      percentage?: number;
    };
  }

  export interface EpubContents {
    document: Document;
    window: Window;
  }

  export interface EpubNavigationItem {
    id?: string;
    href: string;
    label: string;
    subitems?: EpubNavigationItem[];
  }

  export interface EpubBook {
    ready: Promise<void>;
    loaded: {
      navigation: Promise<{ toc: EpubNavigationItem[] }>;
      metadata: Promise<{ title?: string; creator?: string }>;
    };
    renderTo(
      element: HTMLElement,
      options: { width: string | number; height: string | number; flow?: string; spread?: string; allowScriptedContent?: boolean; minSpreadWidth?: number }
    ): EpubRendition;
    destroy(): void;
  }

  export interface EpubRendition {
    display(target?: string): Promise<void>;
    prev(): Promise<void>;
    next(): Promise<void>;
    themes: {
      fontSize(value: string): void;
      override(name: string, value: string): void;
    };
    hooks: {
      content: {
        register(callback: (contents: EpubContents) => void): void;
      };
    };
    on(event: 'relocated', callback: (location: EpubLocation) => void): void;
    on(event: 'selected', callback: (cfiRange: string, contents: EpubContents) => void): void;
    off(event: string): void;
    destroy(): void;
  }

  export default function ePub(input: ArrayBuffer | string): EpubBook;
}
