export interface ReaderTheme {
  id: string;
  name: string;
  background: string;
  foreground: string;
  link: string;
  selection: string;
  highlightBackground: string;
  highlightForeground: string;
  css: string;
}

const CUSTOM_THEME_STORAGE_KEY = 'witt.customReaderTheme';

export const BUILT_IN_THEMES: ReaderTheme[] = [
  {
    id: 'paper',
    name: 'Paper',
    background: '#f6f4ee',
    foreground: '#111827',
    link: '#2563eb',
    selection: 'rgba(180, 140, 80, 0.24)',
    highlightBackground: '#fde68a',
    highlightForeground: '#111827',
    css: '',
  },
  {
    id: 'white',
    name: 'White',
    background: '#ffffff',
    foreground: '#111827',
    link: '#2563eb',
    selection: 'rgba(37, 99, 235, 0.18)',
    highlightBackground: '#fde68a',
    highlightForeground: '#111827',
    css: '',
  },
  {
    id: 'dark',
    name: 'Dark',
    background: '#020617',
    foreground: '#e5e7eb',
    link: '#93c5fd',
    selection: 'rgba(147, 197, 253, 0.32)',
    highlightBackground: 'rgba(180, 83, 9, 0.42)',
    highlightForeground: '#f8fafc',
    css: '',
  },
];

export const DEFAULT_CUSTOM_THEME: ReaderTheme = {
  id: 'custom',
  name: 'Custom',
  background: '#f6f4ee',
  foreground: '#111827',
  link: '#2563eb',
  selection: 'rgba(180, 140, 80, 0.24)',
  highlightBackground: '#fde68a',
  highlightForeground: '#111827',
  css: `:root {
  --background: 42 22% 97%;
  --foreground: 224 18% 14%;
  --card: 0 0% 100%;
  --popover: 0 0% 100%;
  --primary: 220 16% 12%;
  --primary-foreground: 0 0% 98%;
  --muted: 42 18% 92%;
  --muted-foreground: 224 8% 42%;
  --accent: 42 18% 92%;
  --border: 42 16% 84%;
  --input: 42 16% 84%;
  --ring: 220 16% 12%;
}

.witt-reader-shell {
  background: #f6f4ee;
}

.witt-reader-content body {
  max-width: 42rem;
}`,
};

export const getSystemThemeId = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'paper';

export const loadCustomTheme = (): ReaderTheme => {
  const raw = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_CUSTOM_THEME;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ReaderTheme>;
    return { ...DEFAULT_CUSTOM_THEME, ...parsed, id: 'custom' };
  } catch {
    return DEFAULT_CUSTOM_THEME;
  }
};

export const saveCustomTheme = (theme: ReaderTheme) => {
  localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify({ ...theme, id: 'custom' }));
};

export const themeById = (themeId: string, customTheme: ReaderTheme) =>
  [...BUILT_IN_THEMES, customTheme].find((theme) => theme.id === themeId) ?? BUILT_IN_THEMES[0];

export const applyAppThemeCss = (theme: ReaderTheme) => {
  const styleId = 'witt-custom-app-theme';
  const existing = document.getElementById(styleId);
  const style = existing ?? document.createElement('style');
  style.id = styleId;
  style.textContent = theme.css;
  if (!existing) {
    document.head.appendChild(style);
  }
};
