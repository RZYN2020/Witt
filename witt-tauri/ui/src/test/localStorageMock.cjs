// Mock localStorage and matchMedia for Vitest tests
const localStorageMock = {
  getItem: function() { return null; },
  setItem: function() {},
  removeItem: function() {},
  clear: function() {},
  length: 0,
  key: function() { return null; },
};

global.localStorage = localStorageMock;

// Mock window.matchMedia
if (typeof window === 'undefined') {
  global.window = {};
}

window.matchMedia = function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() {},
  };
};

global.matchMedia = window.matchMedia;

console.log('localStorage and matchMedia mocked successfully');
