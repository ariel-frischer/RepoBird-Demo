import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Import THREE
import { init } from './wireframe-sphere.js'; // Adjust path as needed

describe('Wireframe Sphere Component', () => {
  let container;
  let scene = null; // To store scene reference for tests
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
    scene = null; // Reset scene reference
    // Restore console spies
    vi.restoreAllMocks();
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
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should set the scene background to the standard dark color', () => {
    const result = init(container);
    cleanup = result.cleanup;
    scene = result.scene;
    expect(scene).not.toBeNull();
    // Check background color (ensure THREE is imported)
    const expectedColor = new THREE.Color(0x1a1a1a);
    expect(scene.background).toBeInstanceOf(THREE.Color);
    expect(scene.background.getHex()).toBe(expectedColor.getHex());
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
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should log an error and return a no-op cleanup and null scene if container is not provided', () => {
    const result = init(null);
    expect(console.error).toHaveBeenCalledWith('Container element not provided for Wireframe Sphere');
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
    expect(console.warn).toHaveBeenCalledWith('Wireframe Sphere already initialized. Cleaning up previous instance.');
    expect(canvas2).not.toBeNull();
    expect(scene).toBeInstanceOf(THREE.Scene);
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
