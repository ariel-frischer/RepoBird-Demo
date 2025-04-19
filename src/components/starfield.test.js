import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Import THREE
import { init } from './starfield.js'; // Adjust path as needed

describe('Starfield Component', () => {
  let container;
  let scene = null; // To store scene reference for tests
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
    scene = null; // Reset scene reference
  });

  it('should initialize successfully and return cleanup function and scene object', () => {
    expect(container).toBeDefined();
    const result = init(container);
    cleanup = result.cleanup;
    scene = result.scene; // Store scene reference
    expect(cleanup).toBeInstanceOf(Function);
    expect(scene).toBeInstanceOf(THREE.Scene); // Check if scene is a THREE.Scene
    // Check if a canvas element was created
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should set the scene background to black', () => {
    const result = init(container);
    cleanup = result.cleanup;
    scene = result.scene;
    expect(scene).not.toBeNull();
    // Check background color
    const expectedColor = new THREE.Color(0x000000);
    expect(scene.background).toBeInstanceOf(THREE.Color);
    expect(scene.background.getHex()).toBe(expectedColor.getHex());
  });

  it('should add a THREE.Points object to the scene', () => {
    const result = init(container);
    cleanup = result.cleanup;
    scene = result.scene;
    expect(scene).not.toBeNull();
    let pointsObject = null;
    scene.traverse((object) => {
        if (object.isPoints) {
            pointsObject = object;
        }
    });
    expect(pointsObject).not.toBeNull();
    expect(pointsObject).toBeInstanceOf(THREE.Points);
    // Check if geometry and material exist
    expect(pointsObject.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(pointsObject.material).toBeInstanceOf(THREE.PointsMaterial);
    // Optionally check if the geometry has the expected number of vertices
    expect(pointsObject.geometry.attributes.position.count).toBeGreaterThan(0); // Or the specific starCount if needed
  });


  it('should append a canvas element to the container', () => {
    const result = init(container);
    cleanup = result.cleanup; // Assign cleanup
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(container.contains(canvas)).toBe(true);
  });

  it('should execute the cleanup function without errors', () => {
    const result = init(container);
    cleanup = result.cleanup; // Assign cleanup
    expect(() => cleanup()).not.toThrow();
  });

  it('should remove the canvas element upon cleanup', () => {
    const result = init(container);
    cleanup = result.cleanup; // Assign cleanup
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    cleanup();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should log an error and return a no-op cleanup and null scene if container is not provided', () => {
    const result = init(null);
    expect(console.error).toHaveBeenCalledWith('Container element not provided for Starfield');
    expect(result.cleanup).toBeInstanceOf(Function);
    expect(result.scene).toBeNull();
    // Check that calling the no-op cleanup doesn't throw
    expect(() => result.cleanup()).not.toThrow();
    // Ensure no canvas was added to body accidentally
    expect(document.body.querySelector('canvas')).toBeNull();
  });

  it('should warn and cleanup previous instance if initialized multiple times', () => {
    // First initialization
    const result1 = init(container);
    const cleanup1 = result1.cleanup; // Extract cleanup
    const scene1 = result1.scene; // Extract scene
    const canvas1 = container.querySelector('canvas');
    expect(canvas1).not.toBeNull();
    expect(scene1).toBeInstanceOf(THREE.Scene);
    expect(console.warn).not.toHaveBeenCalled();

    // Second initialization
    const result2 = init(container); // Assign to the global cleanup for afterEach
    cleanup = result2.cleanup; // Update global cleanup
    scene = result2.scene; // Update global scene
    const canvas2 = container.querySelector('canvas');
    expect(console.warn).toHaveBeenCalledWith('Starfield already initialized. Cleaning up previous instance.');
    expect(canvas2).not.toBeNull();
    expect(scene).toBeInstanceOf(THREE.Scene);
    expect(canvas2).not.toBe(canvas1); // Should be a new canvas
    expect(container.childElementCount).toBe(1); // Only one canvas should exist

    // Ensure original cleanup function was called implicitly (check if canvas1 is gone - tricky, but canvas2 !== canvas1 implies it)
    // and the new cleanup works
    expect(() => cleanup()).not.toThrow();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should remove resize listener on cleanup', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { cleanup: localCleanup } = init(container);

    // Check if 'resize' listener was added
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    const handler = addSpy.mock.calls.find(call => call[0] === 'resize')[1];

    localCleanup();

    // Check if 'resize' listener was removed with the same handler
    expect(removeSpy).toHaveBeenCalledWith('resize', handler);

    // Restore spies
    addSpy.mockRestore();
    removeSpy.mockRestore();
    cleanup = () => {}; // Ensure global cleanup is reset if needed
  });
});
