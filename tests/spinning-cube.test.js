// Import the module to be tested
import { init } from '../src/components/spinning-cube.js';

// Access Chai assert interface (loaded globally via script tag)
const assert = chai.assert;

describe('Spinning Cube Component', () => {
  let container;
  let cleanupFunction;

  // Create a container element before each test
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    cleanupFunction = null; // Reset cleanup function
  });

  // Clean up the container and call cleanup function after each test
  afterEach(() => {
    if (typeof cleanupFunction === 'function') {
      try {
        cleanupFunction();
      } catch (e) {
        console.error("Error during cleanup:", e);
      }
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
  });

  it('init() should run without errors when given a valid container', () => {
    assert.doesNotThrow(() => {
      cleanupFunction = init(container);
    }, Error, 'init should not throw an error');
  });

  it('init() should add a canvas element to the container', () => {
    cleanupFunction = init(container);
    const canvas = container.querySelector('canvas');
    assert.isNotNull(canvas, 'Canvas element should be added');
    assert.instanceOf(canvas, HTMLCanvasElement, 'Added element should be a Canvas');
  });

  it('init() should return a cleanup function', () => {
    cleanupFunction = init(container);
    assert.isFunction(cleanupFunction, 'init should return a function');
  });

  it('returned cleanup function should run without errors', () => {
    cleanupFunction = init(container);
    assert.isFunction(cleanupFunction, 'Precondition: cleanup function must exist');
    assert.doesNotThrow(() => {
      cleanupFunction();
      cleanupFunction = null; // Prevent afterEach from calling it again
    }, Error, 'Cleanup function should not throw an error');
  });

  it('cleanup function should remove the canvas element from the container', () => {
    cleanupFunction = init(container);
    let canvas = container.querySelector('canvas');
    assert.isNotNull(canvas, 'Precondition: Canvas should exist after init');

    assert.isFunction(cleanupFunction, 'Cleanup function must exist');
    cleanupFunction(); // Execute cleanup
    cleanupFunction = null; // Prevent afterEach double-call

    canvas = container.querySelector('canvas');
    assert.isNull(canvas, 'Canvas element should be removed after cleanup');
  });

  it('init() should handle null container gracefully (log error, not throw)', () => {
     // Temporarily spy on console.error
     const originalConsoleError = console.error;
     let consoleErrorCalled = false;
     console.error = (message) => {
        if (message.includes("Initialization failed: container element not provided.")) {
            consoleErrorCalled = true;
        }
        originalConsoleError.apply(console, arguments); // Call original
     };

     assert.doesNotThrow(() => {
         cleanupFunction = init(null); // Pass null container
     }, Error, 'init(null) should not throw an error');

     assert.isTrue(consoleErrorCalled, 'Expected console.error to be called with specific message');
     assert.isFunction(cleanupFunction, 'init(null) should still return a cleanup function');

     // Restore console.error
     console.error = originalConsoleError;

     // Test the "noop" cleanup function returned on failure
     assert.doesNotThrow(() => {
         if(cleanupFunction) cleanupFunction();
     }, Error, 'Cleanup function returned from failed init should not throw');
  });
});
