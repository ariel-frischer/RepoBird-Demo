
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { init } from './shape-morphing.js'; // Import the component to test

describe('Shape Morphing Component', () => {
  let container;
  let cleanup = () => {}; // Default no-op cleanup

  beforeEach(() => {
    // Create a container element before each test
    container = document.createElement('div');
    container.style.width = '100px'; // Define size for renderer/camera aspect
    container.style.height = '100px';
    document.body.appendChild(container);
    // Reset cleanup function before each test
    cleanup = () => {};
    // Spy on console.error and console.warn
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {}); // Also spy on log for cleanup message
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
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(container.contains(canvas)).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should log an error and return a no-op cleanup if container is not provided', () => {
    const noOpCleanup = init(null);
    expect(console.error).toHaveBeenCalledWith('Shape Morphing: Container element not provided.');
    expect(noOpCleanup).toBeInstanceOf(Function);
    // Check that calling the no-op cleanup doesn't throw
    expect(() => noOpCleanup()).not.toThrow();
    // Ensure no canvas was added to body accidentally
    expect(document.body.querySelector('canvas')).toBeNull();
  });

  it('should execute the cleanup function without errors and log message', () => {
    cleanup = init(container);
    expect(() => cleanup()).not.toThrow();
    expect(console.log).toHaveBeenCalledWith('Shape Morphing: Cleaned up resources.');
  });

  it('should remove the canvas element upon cleanup', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    cleanup();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should add a Mesh with morph targets enabled to the scene', async () => {
      // Mock requestAnimationFrame to prevent infinite loop in test
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {});

      cleanup = init(container);

      // Need a way to access the scene or mesh. Modify init or return scene?
      // For now, let's assume init internally creates the scene and adds the mesh.
      // This test is limited without direct access.
      // We can indirectly check if the necessary setup happened without errors.
      expect(console.error).not.toHaveBeenCalled();

      // A better approach would be to return the scene from init for testing,
      // similar to how starfield.test.js handles it, or use a more advanced
      // testing setup to inspect the internal state if possible.

      // Mock cleanup to prevent issues during afterEach
      window.requestAnimationFrame.mockRestore();
  });

    it('should remove resize listener on cleanup', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        cleanup = init(container);

        // Check if 'resize' listener was added
        expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        // Find the specific handler function added for 'resize'
        const resizeCall = addSpy.mock.calls.find(call => call[0] === 'resize');
        const handler = resizeCall ? resizeCall[1] : undefined;
        expect(handler).toBeDefined(); // Ensure the handler was found

        cleanup();

        // Check if 'resize' listener was removed with the same handler
        expect(removeSpy).toHaveBeenCalledWith('resize', handler);

        // Restore spies
        addSpy.mockRestore();
        removeSpy.mockRestore();
    });

    // Potential future test: Check if morphTargetInfluences are being updated.
    // This would likely require mocking Date.now() or requestAnimationFrame and stepping through time.
});
