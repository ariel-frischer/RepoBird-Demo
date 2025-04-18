import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Import the module to be tested
import { init } from '../src/components/spinning-cube.js';

// No need for global chai anymore

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
    expect(() => {
      cleanupFunction = init(container);
    }).not.toThrow();
  });

  it('init() should add a canvas element to the container', () => {
    cleanupFunction = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('init() should return a cleanup function', () => {
    cleanupFunction = init(container);
    expect(cleanupFunction).toBeInstanceOf(Function);
  });

  it('returned cleanup function should run without errors', () => {
    cleanupFunction = init(container);
    expect(cleanupFunction).toBeInstanceOf(Function); // Precondition check
    expect(() => {
      cleanupFunction();
      cleanupFunction = null; // Prevent afterEach from calling it again
    }).not.toThrow();
  });

  it('cleanup function should remove the canvas element from the container', () => {
    cleanupFunction = init(container);
    let canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull(); // Precondition check

    expect(cleanupFunction).toBeInstanceOf(Function);
    cleanupFunction(); // Execute cleanup
    cleanupFunction = null; // Prevent afterEach double-call

    canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  it('init() should handle null container gracefully (log error, not throw)', () => {
    // Spy on console.error using Vitest's built-in mocking
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Mock implementation to suppress output during test

    expect(() => {
      cleanupFunction = init(null); // Pass null container
    }).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Initialization failed: container element not provided."));
    expect(cleanupFunction).toBeInstanceOf(Function); // Should still return a noop cleanup

    // Restore the original console.error
    errorSpy.mockRestore();

    // Test the "noop" cleanup function returned on failure
    expect(() => {
      if (cleanupFunction) cleanupFunction();
    }).not.toThrow();
  });
});
