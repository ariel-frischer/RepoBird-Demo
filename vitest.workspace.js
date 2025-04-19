import { defineWorkspace } from 'vitest/config';

// Export the full workspace configuration
export default defineWorkspace([
  {
    // Project for tests running in a real browser via Playwright
    test: { // NESTED CONFIG
      name: 'browser-tests',
      include: ['tests/**/*.test.js', 'src/components/**/*.test.js'],
      // Exclude tests requiring module mocking (not supported in browser mode)
      // or tests designed for JSDOM environment.
      exclude: [
          'src/components/car-viewer.test.js',
          'src/components/3d-text.test.js' // Excluded due to vi.mock usage
      ],
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
