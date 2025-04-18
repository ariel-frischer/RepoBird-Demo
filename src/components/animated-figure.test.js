import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { init } from './animated-figure.js';

// Mock the GLTFLoader
const mockLoad = vi.fn();
const mockGLTF = {
  scene: new THREE.Group(), // A mock scene object
  animations: [new THREE.AnimationClip('testAnim', 1, [])], // Mock animations array
};
const mockError = new Error('Failed to load');

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: mockLoad, // Use the mockLoad function defined above
  })),
}));

// Mock OrbitControls (just needs a constructor and dispose)
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    update: vi.fn(), // Add update mock
    enableDamping: false, // Add properties accessed
    target: new THREE.Vector3(),
  })),
}));


describe('Animated Figure Component', () => {
  let container;
  let cleanup = () => {}; // Default no-op cleanup

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock GLTFLoader behavior for successful load by default
    mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
      // Simulate successful loading by calling onLoad with mock GLTF data
      if (onLoad) {
        // Add a minimal mesh to the scene for traversal testing
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        mockGLTF.scene.add(mesh);
        onLoad(mockGLTF);
      }
    });


    // Create a container element before each test
    container = document.createElement('div');
    // Set explicit dimensions required by THREE.js renderer/camera setup
    container.style.width = '100px';
    container.style.height = '100px';
    document.body.appendChild(container);

    // Reset cleanup function
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
      console.error("Error during test cleanup:", e); // Log actual errors during cleanup
    }

    // Remove the container element
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;

    // Restore console spies and clear mocks
    vi.restoreAllMocks();

    // Clean up mock scene children if added during tests
     if (mockGLTF.scene.children.length > 0) {
        // Dispose geometry/material added in the default mockLoad
        mockGLTF.scene.traverse((object) => {
             if (object.isMesh) {
                 if (object.geometry) object.geometry.dispose();
                 if (object.material) object.material.dispose();
             }
        });
        // Remove children for next test
        while(mockGLTF.scene.children.length > 0){
            mockGLTF.scene.remove(mockGLTF.scene.children[0]);
        }
     }
  });

  it('should initialize successfully and return a cleanup function', () => {
    expect(container).toBeDefined();
    cleanup = init(container);
    expect(cleanup).toBeInstanceOf(Function);
    // Check if initialization logged any errors (should not in success case)
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should append a canvas element to the container upon initialization', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(container.contains(canvas)).toBe(true);
  });

  it('should call GLTFLoader.load with the correct model path', () => {
    cleanup = init(container);
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith(
      'models/character.gltf', // Expected path
      expect.any(Function),   // onLoad callback
      undefined,              // onProgress callback (was undefined in component)
      expect.any(Function)    // onError callback
    );
  });

   it('should create and play an animation if animations are present in the loaded model', () => {
    // Ensure mockGLTF has animations for this test
    mockGLTF.animations = [new THREE.AnimationClip('walk', 1, [])];
    const mockClipAction = { play: vi.fn() };
    const mockMixer = { clipAction: vi.fn().mockReturnValue(mockClipAction), update: vi.fn() }; // Mock update too
    const AnimationMixerSpy = vi.spyOn(THREE, 'AnimationMixer').mockImplementation(() => mockMixer);


    cleanup = init(container);

    // Verify AnimationMixer was instantiated with the model scene
    expect(AnimationMixerSpy).toHaveBeenCalledWith(mockGLTF.scene);
    // Verify clipAction was called with the first animation clip
    expect(mockMixer.clipAction).toHaveBeenCalledWith(mockGLTF.animations[0]);
    // Verify play was called on the action
    expect(mockClipAction.play).toHaveBeenCalledTimes(1);

    AnimationMixerSpy.mockRestore(); // Clean up spy
  });

  it('should NOT attempt to play animations if none are present', () => {
     // Ensure mockGLTF has NO animations for this test
     mockGLTF.animations = [];
     const AnimationMixerSpy = vi.spyOn(THREE, 'AnimationMixer'); // Just spy, don't mock implementation

     cleanup = init(container);

     // Verify AnimationMixer was NOT instantiated
     expect(AnimationMixerSpy).not.toHaveBeenCalled();
     expect(console.warn).not.toHaveBeenCalled(); // Should just log info, not warn/error

     AnimationMixerSpy.mockRestore();
   });


  it('should handle GLTFLoader errors gracefully', () => {
    // Configure mockLoad to call onError for this test
    mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
      if (onError) {
        onError(mockError);
      }
    });

    cleanup = init(container);

    // Check that console.error was called with the mock error
    expect(console.error).toHaveBeenCalledWith('Error loading model:', mockError);

    // Check if the error message div was added to the container
    const errorDiv = container.querySelector('div[style*="color: red"]');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv.innerText).toContain('Error loading character model');

    // Ensure cleanup still works without errors even if loading failed
    expect(() => cleanup()).not.toThrow();
     // Error div should be removed by cleanup
    expect(container.querySelector('div[style*="color: red"]')).toBeNull();

  });


  it('should execute the cleanup function without errors', () => {
    cleanup = init(container);
    // Ensure canvas exists before cleanup
    expect(container.querySelector('canvas')).not.toBeNull();
    // Execute cleanup and check for runtime errors and console errors
    expect(() => cleanup()).not.toThrow();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should remove the canvas element upon cleanup', () => {
    cleanup = init(container);
    expect(container.querySelector('canvas')).not.toBeNull();
    cleanup();
    expect(container.querySelector('canvas')).toBeNull();
  });

   it('should dispose geometries and materials during cleanup after successful load', () => {
        const mockGeometryDispose = vi.fn();
        const mockMaterialDispose = vi.fn();
        const mockTextureDispose = vi.fn(); // Mock texture dispose

        // Create specific mocks for geometry and material dispose methods
        const geometry = new THREE.BoxGeometry();
        geometry.dispose = mockGeometryDispose;
        const texture = new THREE.Texture(); // Mock texture
        texture.dispose = mockTextureDispose;
        const material = new THREE.MeshBasicMaterial();
        material.map = texture; // Assign mock texture
        material.dispose = mockMaterialDispose;
        const mesh = new THREE.Mesh(geometry, material);

         // Override the default mockLoad to add our spy-instrumented mesh
         mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
             if (onLoad) {
                 // Clear previous children before adding new one
                 while(mockGLTF.scene.children.length > 0){ mockGLTF.scene.remove(mockGLTF.scene.children[0]); }
                 mockGLTF.scene.add(mesh);
                 onLoad(mockGLTF);
             }
         });

        cleanup = init(container); // Initialize
        cleanup(); // Trigger cleanup

        // Verify dispose methods were called
        expect(mockGeometryDispose).toHaveBeenCalledTimes(1);
        expect(mockMaterialDispose).toHaveBeenCalledTimes(1);
         expect(mockTextureDispose).toHaveBeenCalledTimes(1); // Check texture disposal
        expect(console.error).not.toHaveBeenCalled(); // Ensure no errors during cleanup
    });


});
