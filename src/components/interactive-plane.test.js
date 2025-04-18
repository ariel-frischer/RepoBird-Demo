// @vitest-environment happy-dom
// Using happy-dom based on vitest.config.js, can switch to browser if needed
// TODO: Requires Vitest/Playwright setup (npm install)
// TODO: Tests can only run after environment configuration

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Import if needed for type checks or constants
import { init } from './interactive-plane.js'; // Adjust path if needed

describe('Interactive Plane Component', () => {
  let container;
  let cleanup;

  beforeEach(() => {
    // Create a container element for the Three.js canvas
    container = document.createElement('div');
    container.style.width = '800px'; // Define size for renderer/camera
    container.style.height = '600px';
    document.body.appendChild(container);
    // Mock requestAnimationFrame - might be needed if happy-dom doesn't provide it
    // vi.stubGlobal('requestAnimationFrame', vi.fn());
    // vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    if (cleanup) {
      try {
        cleanup();
      } catch (e) {
        console.error("Error during cleanup:", e);
      }
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    cleanup = null;
    // vi.restoreAllMocks(); // Restore any mocks if used
  });

  it('should initialize and return a cleanup function', () => {
    cleanup = init(container);
    expect(cleanup).toBeInstanceOf(Function);
  });

  it('should add a canvas element to the container', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  // Basic check: if init runs and adds canvas, core setup likely worked
  it('should run init function without throwing errors', () => {
    expect(() => {
      cleanup = init(container);
    }).not.toThrow();
  });


  it('should run cleanup function without throwing errors', () => {
     cleanup = init(container);
     expect(cleanup).toBeInstanceOf(Function); // Ensure cleanup is valid first
     expect(() => {
       cleanup();
     }).not.toThrow();
  });

  it('should remove the canvas element upon cleanup', () => {
    cleanup = init(container);
    expect(container.querySelector('canvas')).not.toBeNull(); // Canvas exists initially
    cleanup();
    // After cleanup, the renderer should have removed the canvas
    expect(container.querySelector('canvas')).toBeNull(); // Canvas is removed
  });

});
