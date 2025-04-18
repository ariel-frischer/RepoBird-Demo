import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Import THREE to check instance types if needed, though maybe not needed for basic tests
import { init } from './torus-knot.js';

describe('Torus Knot Component', () => {
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
    vi.spyOn(console, 'warn').mockImplementation(() => {}); // Although not strictly required by task, good practice
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
    // Check if initialization logged any errors
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should append a canvas element to the container upon initialization', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(container.contains(canvas)).toBe(true);
  });

  // Note: Testing for specific geometry (TorusKnotGeometry) or lights (AmbientLight, DirectionalLight)
  // is difficult without modifying the component to expose the scene or its children.
  // These tests focus on the observable effects (canvas creation/removal, cleanup execution).

  it('should execute the cleanup function without errors', () => {
    cleanup = init(container);
    // Ensure canvas exists before cleanup
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    // Execute cleanup and check for errors
    expect(() => cleanup()).not.toThrow();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should remove the canvas element upon cleanup', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull(); // Canvas should be there initially
    cleanup();
    // Canvas should be removed after cleanup
    expect(container.querySelector('canvas')).toBeNull();
  });

   it('should log an error and return a no-op function if container is not provided', () => {
    const noopCleanup = init(null);
    // Check the specific error message logged in torus-knot.js
    expect(console.error).toHaveBeenCalledWith('Initialization failed: container element not provided.');
    expect(noopCleanup).toBeInstanceOf(Function);
    // Check that calling the no-op doesn't throw
    expect(() => noopCleanup()).not.toThrow();
    // Ensure no canvas was added to body accidentally
    expect(document.body.querySelector('canvas')).toBeNull();
  });

});
