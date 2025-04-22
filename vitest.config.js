import { defineConfig } from 'vitest/config';
import path from 'path'; // Import path module

export default defineConfig({
  test: {
    // Run tests in a browser environment using Playwright
    browser: {
      enabled: true,
      name: 'chromium', // Can be 'chromium', 'firefox', 'webkit'
      provider: 'playwright', // or 'webdriverio'
      // Optional: run tests in headless mode
      headless: true,
      vite: { // Add this nested vite config block
        server: {
          fs: {
            // Allow serving files from the project root directory
            allow: [path.resolve(process.cwd())]
          }
        }
      },
      // Optional: setup file for browser environment
      // setup: './tests/setup.js',
    },
    // Include test files matching the pattern
    include: ['tests/**/*.test.js', 'src/components/**/*.test.js'], // Corrected include pattern
    // Optional: setup files to run before each test file
    // setupFiles: ['./tests/setup.js'],
    // Optional: global variables for tests
    // globals: true, // If you want Vitest globals like describe, it, expect available without importing
    environment: 'jsdom', // Default environment for tests not running in browser mode
    // reporters: ['default', 'html'], // Optional: configure reporters
  },
});
