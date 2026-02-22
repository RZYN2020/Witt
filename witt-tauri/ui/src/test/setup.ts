import '@testing-library/jest-dom/vitest';
import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock localStorage and matchMedia
beforeAll(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  // Use defineProperty to ensure it's properly mocked
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Extend Vitest's expect with Testing Library matchers
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// Configure global test settings
console.log('Test environment configured');
