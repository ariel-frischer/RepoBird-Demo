import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Need THREE for instance checks
import { init } from './solar-system.js'; // Corrected import path

// Mock TextureLoader to prevent actual file loading attempts in tests
// This might be needed if the browser environment can't access file paths easily
// or if we want to explicitly test behavior *without* textures.

// NOTE: vi.mock is not reliably supported in the browser test environment for this project.
// Texture loading errors in the console during tests are expected, as the component
// attempts to load textures which might fail in this environment.
// The component should handle these errors gracefully (e.g., using fallback materials).
// NOTE: Tests cannot be automatically run in the current execution environment due to lack of Node.js/npm.

describe('Solar System Component', () => {
  let container;
  let cleanupFunction;
  let scene; // Variable to hold the scene object

  const PLANET_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

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
    // Also check if scene is disposed (children removed)
    expect(scene.children.length).toBe(0);
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
      // Texture check: Verify a texture object exists (even if loading failed)
      // Note: Texture loading errors may appear in console due to test env limitations.
      expect(sun.material.map).toBeInstanceOf(THREE.Texture);
    });

    it('should contain pivots for all planets', () => {
       expect(scene).toBeDefined();
       PLANET_NAMES.forEach(name => {
         const pivot = scene.getObjectByName(`${name}Pivot`);
         expect(pivot).toBeInstanceOf(THREE.Object3D);
         expect(pivot.name).toBe(`${name}Pivot`);
       });
    });

    it('should contain meshes for all planets inside their respective pivots', () => {
        expect(scene).toBeDefined();
        PLANET_NAMES.forEach(name => {
          const pivot = scene.getObjectByName(`${name}Pivot`);
          expect(pivot).toBeInstanceOf(THREE.Object3D); // Ensure pivot exists first
          const planet = pivot.getObjectByName(name);
          expect(planet).toBeInstanceOf(THREE.Mesh);
          expect(planet.name).toBe(name);
          // All planets should have MeshStandardMaterial (Sun has MeshBasic)
          expect(planet.material).toBeInstanceOf(THREE.MeshStandardMaterial);
          // Texture check: Verify a texture map exists, even if loading failed
          expect(planet.material.map).toBeInstanceOf(THREE.Texture);
        });
    });


    it('should contain a Moon mesh as a child of Earth', () => {
      expect(scene).toBeDefined();
      const earthPivot = scene.getObjectByName('EarthPivot');
      const earth = earthPivot?.getObjectByName('Earth'); // Find Earth via pivot
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
        const earthPivot = scene.getObjectByName('EarthPivot');
        const earth = earthPivot?.getObjectByName('Earth');
        expect(earth).toBeInstanceOf(THREE.Mesh);
        // Check children count - should only be the Moon mesh
        expect(earth.children.length).toBe(1);
        expect(earth.children[0].name).toBe('Moon'); // Verify the child is indeed the Moon
     });

    it('should contain Saturn Rings mesh as a child of Saturn Pivot', () => {
        expect(scene).toBeDefined();
        const saturnPivot = scene.getObjectByName('SaturnPivot');
        expect(saturnPivot).toBeInstanceOf(THREE.Object3D);

        const rings = saturnPivot.getObjectByName('SaturnRings');
        expect(rings).toBeInstanceOf(THREE.Mesh);
        expect(rings.name).toBe('SaturnRings');
        expect(rings.geometry).toBeInstanceOf(THREE.RingGeometry); // Check geometry
        expect(rings.material).toBeInstanceOf(THREE.MeshBasicMaterial); // Check material
        expect(rings.material.transparent).toBe(true); // Check transparency
        expect(rings.material.side).toBe(THREE.DoubleSide); // Check side rendering
        // Texture check: Verify a texture map exists, even if loading failed
        expect(rings.material.map).toBeInstanceOf(THREE.Texture);
        expect(rings.material.alphaMap).toBeInstanceOf(THREE.Texture); // Check for alpha map
    });

    it('should contain orbit line meshes for all planets directly in the scene', () => {
        expect(scene).toBeDefined();
        PLANET_NAMES.forEach(name => {
          const orbitLine = scene.getObjectByName(`${name}Orbit`);
          expect(orbitLine).toBeInstanceOf(THREE.Mesh);
          expect(orbitLine.name).toBe(`${name}Orbit`);
          expect(orbitLine.geometry).toBeInstanceOf(THREE.RingGeometry); // Check geometry
          expect(orbitLine.material).toBeInstanceOf(THREE.MeshBasicMaterial); // Check material
          expect(orbitLine.material.side).toBe(THREE.DoubleSide); // Check side rendering
        });
    });

  });

});
