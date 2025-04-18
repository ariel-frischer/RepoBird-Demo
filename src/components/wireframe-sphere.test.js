import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { init } from './wireframe-sphere.js'; // Adjust path as needed

describe('Wireframe Sphere Component', () => {
  let container;
  let cleanup = () => {}; // Default no-op cleanup

  beforeEach(() => {
    // Create a container element before each test
    container = document.createElement('div');
    document.body.appendChild(container);
    // Reset cleanup function before each test
    cleanup = () => {};
    // Spy on console.error and console.warn
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Execute cleanup function after each test
    try {
        cleanup();
    } catch (e) {
        console.error("Error during test cleanup:", e);
    }
    // Remove the container element after each test
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null; // Clear reference
    // Restore console spies
    vi.restoreAllMocks();
  });

  it('should initialize successfully and return a cleanup function', () => {
    expect(container).toBeDefined();
    cleanup = init(container);
    expect(cleanup).toBeInstanceOf(Function);
    // Check if a canvas element was created
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should append a canvas element to the container', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(container.contains(canvas)).toBe(true);
  });

  it('should execute the cleanup function without errors', () => {
    cleanup = init(container);
    expect(() => cleanup()).not.toThrow();
  });

  it('should remove the canvas element upon cleanup', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    cleanup();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should log an error and return a no-op function if container is not provided', () => {
    const noopCleanup = init(null);
    expect(console.error).toHaveBeenCalledWith('Container element not provided for Wireframe Sphere');
    expect(noopCleanup).toBeInstanceOf(Function);
    // Check that calling the no-op doesn't throw
    expect(() => noopCleanup()).not.toThrow();
    // Ensure no canvas was added to body accidentally
    expect(document.body.querySelector('canvas')).toBeNull();
  });

  it('should warn and cleanup previous instance if initialized multiple times', () => {
    // First initialization
    const cleanup1 = init(container);
    const canvas1 = container.querySelector('canvas');
    expect(canvas1).not.toBeNull();
    expect(console.warn).not.toHaveBeenCalled();

    // Second initialization
    cleanup = init(container); // Assign to the global cleanup for afterEach
    const canvas2 = container.querySelector('canvas');
    expect(console.warn).toHaveBeenCalledWith('Wireframe Sphere already initialized. Cleaning up previous instance.');
    expect(canvas2).not.toBeNull();
    expect(canvas2).not.toBe(canvas1); // Should be a new canvas
    expect(container.childElementCount).toBe(1); // Only one canvas should exist

    // Ensure original cleanup function was called implicitly (check if canvas1 is gone - tricky, but canvas2 !== canvas1 implies it)
    // and the new cleanup works
    expect(() => cleanup()).not.toThrow();
    expect(container.querySelector('canvas')).toBeNull();
  });

  // Potential future test: Check if sphere material has wireframe: true
  // This would require accessing the internal scene graph, which might be complex
  // or require modifying the component to expose internals (not ideal).
});
