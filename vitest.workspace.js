import { defineWorkspace } from 'vitest/config';

// Export the full workspace configuration
export default defineWorkspace([
  {
    // Project for tests running in a real browser via Playwright
    test: { // NESTED CONFIG
      name: 'browser-tests',
      include: ['tests/**/*.test.js', 'src/components/**/*.test.js'],
      exclude: ['src/components/car-viewer.test.js'], // Exclude the one running in JSDOM
      environment: 'browser', // Explicitly use browser environment
      browser: {
        enabled: true,
        name: 'chromium', // Or 'firefox', 'webkit'
        provider: 'playwright',
        headless: true,
      },
      // No setupFiles for canvas mock here
    }
  }
]);
