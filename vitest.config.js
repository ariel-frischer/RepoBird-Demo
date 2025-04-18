import { defineConfig } from 'vitest/config';
import path from 'path'; // Import path module

export default defineConfig({
  test: {
    // Browser testing configuration
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
    // Default environment (jsdom), browser config overrides for test:browser script
    environment: 'jsdom',
    // reporters: ['default', 'html'],
  },
  // Keep optimizer settings for browser mode
  deps: {
    optimizer: {
      web: {
        enabled: true,
        include: ['three', 'three/addons/**'] // Keep optimizing three itself
      },
    },
  },
  // Add resolve alias for mocking specific addon modules
  resolve: {
    alias: {
      // Redirect imports of OrbitControls to our mock file
      'three/addons/controls/OrbitControls.js':
        path.resolve(__dirname, './tests/mocks/OrbitControls.js'),
      // Redirect imports of GLTFLoader to our mock file
      'three/addons/loaders/GLTFLoader.js':
        path.resolve(__dirname, './tests/mocks/GLTFLoader.js'),
      // If other addons were needed, they could be added here
      // Example:
      // 'three/addons/postprocessing/EffectComposer.js':
      //   path.resolve(__dirname, './tests/mocks/EffectComposer.js'),
    }
  }
});
