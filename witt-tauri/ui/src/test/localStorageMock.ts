export const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock localStorage before any imports that might use it
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
