import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in a browser environment using Playwright
    browser: {
      enabled: true,
      name: 'chromium', // Can be 'chromium', 'firefox', 'webkit'
      provider: 'playwright', // or 'webdriverio'
      // Optional: run tests in headless mode
      headless: true,
      // Optional: setup file for browser environment
      // setup: './tests/setup.js',
    },
    // Include test files matching the pattern
    include: ['tests/**/*.test.js'],
    // Optional: setup files to run before each test file
    // setupFiles: ['./tests/setup.js'],
    // Optional: global variables for tests
    // globals: true, // If you want Vitest globals like describe, it, expect available without importing
    environment: 'jsdom', // Default environment for tests not running in browser mode
    // reporters: ['default', 'html'], // Optional: configure reporters
  },
});
