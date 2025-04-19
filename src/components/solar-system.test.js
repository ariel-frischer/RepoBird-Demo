import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Need THREE for instance checks
import { init } from '../src/components/solar-system.js';

// Mock TextureLoader to prevent actual file loading attempts in tests
// This might be needed if the browser environment can't access file paths easily
// or if we want to explicitly test behavior *without* textures.
// Note: README mentioned potential issues with vi.mock in browser mode.
// If mocking fails, tests might rely on actual texture loading/error handling.
// Let's try without mocking first, relying on the component's error handling.
/*
vi.mock('three', async (importOriginal) => {
  const originalThree = await importOriginal();
  return {
    ...originalThree,
    TextureLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn((path) => {
        // Return a mock texture object immediately
        console.log(`Mock TextureLoader: Pretending to load ${path}`);
        const mockTexture = new originalThree.Texture();
        mockTexture.name = path; // Store path for potential checks
        // Simulate async loading completion if needed later
        // setTimeout(() => mockTexture.needsUpdate = true, 10);
        return mockTexture;
      }),
      manager: { onError: vi.fn() }, // Mock the manager as well
    })),
  };
});
*/

describe('Solar System Component', () => {
  let container;
  let cleanupFunction;
  let scene; // Variable to hold the scene object

  // Create a container element before each test
  beforeEach(() => {
    container = document.createElement('div');
    // Provide dimensions for renderer/camera which are needed for initialization
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    cleanupFunction = null; // Reset cleanup function
    scene = null; // Reset scene reference
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
    scene = null; // Clear scene reference
    vi.restoreAllMocks(); // Restore any mocks
  });

  // --- Basic Tests ---

  it('init() should run without errors and return scene/cleanup when given a valid container', () => {
    let result;
    expect(() => {
      result = init(container);
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(result.cleanup).toBeInstanceOf(Function);
    expect(result.scene).toBeInstanceOf(THREE.Scene);
    // Assign for teardown
    cleanupFunction = result.cleanup;
    scene = result.scene;
  });

   it('init() should return a no-op cleanup and null scene for invalid container', () => {
     // Spy on console.error
     const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
     const result = init(null); // Pass null container

     expect(result.cleanup).toBeInstanceOf(Function);
     expect(result.scene).toBeNull();
     // Check that the no-op cleanup runs without error
     expect(() => result.cleanup()).not.toThrow();
     // Check that the error was logged
     expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Initialization failed: container element not provided or invalid."));

     errorSpy.mockRestore();
   });


  it('init() should add a canvas element to the container', () => {
    const result = init(container);
    cleanupFunction = result.cleanup; // Ensure cleanup runs
    scene = result.scene;
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('returned cleanup function should run without errors', () => {
    const result = init(container);
    cleanupFunction = result.cleanup;
    scene = result.scene;
    expect(cleanupFunction).toBeInstanceOf(Function); // Precondition check
    expect(() => {
      cleanupFunction();
      cleanupFunction = null; // Prevent afterEach from calling it again
    }).not.toThrow();
  });

  it('cleanup function should remove the canvas element from the container', () => {
    const result = init(container);
    cleanupFunction = result.cleanup;
    scene = result.scene;
    let canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull(); // Precondition check

    expect(cleanupFunction).toBeInstanceOf(Function);
    cleanupFunction(); // Execute cleanup
    cleanupFunction = null; // Prevent afterEach double-call

    canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  // --- Component-Specific Tests ---

  describe('Scene Content Tests', () => {
    // Initialize the component once for all tests in this describe block
    beforeEach(() => {
      const result = init(container);
      if (result && result.cleanup && result.scene) {
        cleanupFunction = result.cleanup;
        scene = result.scene;
      } else {
        // Fail test if init didn't return expected structure
        throw new Error("init() did not return expected { cleanup, scene } object.");
      }
      // A small delay might be needed for textures to potentially load in browser test env
      // await new Promise(resolve => setTimeout(resolve, 100)); // Uncomment if texture checks fail intermittently
    });

    it('should contain a Sun mesh with MeshBasicMaterial', () => {
      expect(scene).toBeDefined();
      const sun = scene.getObjectByName('Sun');
      expect(sun).toBeInstanceOf(THREE.Mesh);
      expect(sun.material).toBeInstanceOf(THREE.MeshBasicMaterial);
      // Texture check: Check if map property exists and is a Texture object.
      // This relies on the texture loader working in the test env or the fallback being null.
      // If textures consistently fail to load, this check might need adjustment or removal.
      expect(sun.material.map).toBeInstanceOf(THREE.Texture); // Texture should be assigned (even if loading fails, THREE creates a placeholder)
      expect(sun.material.map.source).toBeDefined(); // Check if source data is associated
      // expect(sun.material.map.name).toContain('sun_texture.jpg'); // Check mock path if mocking was used
    });

    it('should contain an Earth mesh with MeshStandardMaterial inside a pivot', () => {
      expect(scene).toBeDefined();
      // Earth is inside a pivot object named 'EarthPivot'
      const earthPivot = scene.getObjectByName('EarthPivot');
      expect(earthPivot).toBeInstanceOf(THREE.Object3D);
      expect(earthPivot.children.length).toBeGreaterThan(0);

      const earth = earthPivot.getObjectByName('Earth'); // Find Earth within the pivot
      expect(earth).toBeInstanceOf(THREE.Mesh);
      expect(earth.name).toBe('Earth');
      expect(earth.material).toBeInstanceOf(THREE.MeshStandardMaterial);

      // Texture check (similar to Sun)
      expect(earth.material.map).toBeInstanceOf(THREE.Texture);
      expect(earth.material.map.source).toBeDefined();
      // expect(earth.material.map.name).toContain('earth_texture.jpg'); // Check mock path if mocking was used
    });

    it('should contain a Moon mesh as a child of Earth', () => {
      expect(scene).toBeDefined();
      const earth = scene.getObjectByName('Earth'); // Find Earth directly or via pivot then search
      expect(earth).toBeInstanceOf(THREE.Mesh); // Earth must exist

      // Find the Moon by name as a child of Earth
      const moon = earth.getObjectByName('Moon');
      expect(moon).toBeInstanceOf(THREE.Mesh);
      expect(moon.name).toBe('Moon');

      // Check Moon's geometry and material
      expect(moon.geometry).toBeInstanceOf(THREE.SphereGeometry);
      expect(moon.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(moon.material.name).toBe('MoonMaterial'); // Check assigned material name
    });

     it('should have exactly one child for the Earth mesh (the Moon)', () => {
        expect(scene).toBeDefined();
        const earth = scene.getObjectByName('Earth');
        expect(earth).toBeInstanceOf(THREE.Mesh);
        // Check children count - should only be the Moon mesh
        expect(earth.children.length).toBe(1);
        expect(earth.children[0].name).toBe('Moon'); // Verify the child is indeed the Moon
     });

     it('should contain pivots for all planets', () => {
        expect(scene).toBeDefined();
        const mercuryPivot = scene.getObjectByName('MercuryPivot');
        const earthPivot = scene.getObjectByName('EarthPivot');
        const marsPivot = scene.getObjectByName('MarsPivot');

        expect(mercuryPivot).toBeInstanceOf(THREE.Object3D);
        expect(earthPivot).toBeInstanceOf(THREE.Object3D);
        expect(marsPivot).toBeInstanceOf(THREE.Object3D);

        expect(mercuryPivot.getObjectByName('Mercury')).toBeInstanceOf(THREE.Mesh);
        expect(earthPivot.getObjectByName('Earth')).toBeInstanceOf(THREE.Mesh);
        expect(marsPivot.getObjectByName('Mars')).toBeInstanceOf(THREE.Mesh);
     });
  });

});
