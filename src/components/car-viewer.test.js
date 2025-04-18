// @vitest-environment happy-dom
// Using happy-dom based on vitest.config.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three'; // Import if needed for type checks or constants
import { init } from './car-viewer.js'; // Import the component to test

// Mock GLTFLoader for happy-dom environment as it cannot load actual files
vi.mock('three/addons/loaders/GLTFLoader.js', () => {
  const mockLoad = vi.fn((url, onLoad, onProgress, onError) => {
    // Simulate successful load with a minimal scene object
    const mockGltf = {
      scene: new THREE.Group(), // Use a simple Group as a placeholder scene
    };
    // Need to ensure the Box3 calculation doesn't fail, add dummy mesh
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
    mockGltf.scene.add(mesh);

    // Call onLoad asynchronously to mimic real loading
    setTimeout(() => {
        if (onLoad) onLoad(mockGltf);
    }, 0);
  });
  return { GLTFLoader: vi.fn(() => ({ load: mockLoad })) };
});

// Mock OrbitControls as well, since it interacts with the DOM/events
vi.mock('three/addons/controls/OrbitControls.js', () => {
  return { OrbitControls: vi.fn(() => ({
      enableDamping: false,
      dampingFactor: 0,
      screenSpacePanning: false,
      minDistance: 0,
      maxDistance: Infinity,
      maxPolarAngle: Math.PI,
      update: vi.fn(),
      dispose: vi.fn()
  })) };
});

describe('Car Viewer Component', () => {
  let container;
  let cleanup;

  beforeEach(() => {
    // Create a container element for the Three.js canvas
    container = document.createElement('div');
    container.style.width = '800px'; // Define size for renderer/camera
    container.style.height = '600px';
    document.body.appendChild(container);
    // Mock requestAnimationFrame which is needed for the animation loop
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 16))); // Mock with setTimeout
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => clearTimeout(id)));
  });

  afterEach(() => {
    if (cleanup) {
      try {
        cleanup(); // Run the cleanup function returned by init
      } catch (e) {
        console.error("Error during cleanup:", e);
      }
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container); // Clean up DOM
    }
    container = null;
    cleanup = null;
    vi.restoreAllMocks(); // Restore mocks between tests
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

  it('should run init function without throwing errors', () => {
    expect(() => {
      cleanup = init(container);
    }).not.toThrow();
  });

  it('should call requestAnimationFrame to start the animation loop', () => {
    cleanup = init(container);
    expect(global.requestAnimationFrame).toHaveBeenCalled();
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

   it('should call cancelAnimationFrame during cleanup', () => {
     const rafMock = global.requestAnimationFrame; // CORRECTED LINE
     const cafMock = global.cancelAnimationFrame; // CORRECTED LINE
     rafMock.mockReturnValue(123); // Return a mock ID

     cleanup = init(container);
     expect(rafMock).toHaveBeenCalled(); // Ensure animation started

     cleanup();
     expect(cafMock).toHaveBeenCalledWith(123); // Ensure cleanup cancels the animation frame
   });

   it('should dispose controls during cleanup', () => {
        // Need access to the mock constructor/instance to check dispose
        const OrbitControlsMock = vi.mocked(require('three/addons/controls/OrbitControls.js').OrbitControls);
        cleanup = init(container); // This will create an instance of the mock
        const mockControlsInstance = OrbitControlsMock.mock.results[0]?.value; // Get the instance created by init

        expect(mockControlsInstance).toBeDefined();
        expect(mockControlsInstance.dispose).not.toHaveBeenCalled(); // Not called yet

        cleanup(); // Run cleanup

        expect(mockControlsInstance.dispose).toHaveBeenCalled(); // Should be called by cleanup
    });


   it('should attempt to load the GLTF model', () => {
       const GLTFLoaderMock = vi.mocked(require('three/addons/loaders/GLTFLoader.js').GLTFLoader);
       cleanup = init(container); // Initialize the component
       const mockLoaderInstance = GLTFLoaderMock.mock.results[0]?.value; // Get the loader instance

       expect(mockLoaderInstance).toBeDefined();
       // Check if the load method was called, implicitly testing the path argument as well
       expect(mockLoaderInstance.load).toHaveBeenCalledWith(
            expect.stringContaining('models/car.gltf.txt'), // Check if it tries to load the correct file path structure
            expect.any(Function), // onLoad callback
            undefined, // onProgress callback (optional)
            expect.any(Function)  // onError callback
        );
    });

});
