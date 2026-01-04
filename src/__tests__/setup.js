/**
 * Vitest Setup File
 * 
 * Runs before all tests to set up the testing environment.
 */

import { vi } from 'vitest';

// Mock localStorage with actual storage behavior
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => Object.keys(store)[index] ?? null),
  };
};

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:5173',
  pathname: '/',
  search: '',
  hash: '',
  origin: 'http://localhost:5173',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment)',
    language: 'en-US',
    platform: 'Test',
    onLine: true,
  },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

// Suppress console errors during tests (optional)
// Uncomment if tests are too noisy
// console.error = vi.fn();
// console.warn = vi.fn();
