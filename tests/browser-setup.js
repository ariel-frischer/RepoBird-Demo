import { vi } from 'vitest';

// Simple mock class for Object3D
class MockObject3D {
    name = '';
    position = { set: vi.fn() };
    add = vi.fn();
    // Add other methods/properties if needed by the component
}

// --- Define Mock Functions ---
// These will be used by the mocked constructors below
const mockGltfLoad = vi.fn((url, onLoad, onProgress, onError) => {
  console.log(`[Mock GLTFLoader] load called with URL: ${url}`);
  setTimeout(() => {
    if (url === 'models/car.gltf') {
      const mockScene = new MockObject3D(); // Use the mock class defined above
      mockScene.name = 'MockCarScene';
      console.log('[Mock GLTFLoader] Simulating successful load.');
      onLoad({ scene: mockScene });
    } else {
      console.error('[Mock GLTFLoader] Simulating load error.');
      onError(new Error('Mock GLTF load error: Invalid URL'));
    }
  }, 10);
});
const mockControlsDispose = vi.fn(() => console.log('[Mock OrbitControls] dispose called.'));
const mockControlsUpdate = vi.fn(() => console.log('[Mock OrbitControls] update called.'));
const mockRendererSetSize = vi.fn((w, h) => console.log(`[Mock WebGLRenderer] setSize called with ${w}x${h}.`));
const mockRendererSetPixelRatio = vi.fn((r) => console.log(`[Mock WebGLRenderer] setPixelRatio called with ${r}.`));
const mockRendererRender = vi.fn(() => console.log('[Mock WebGLRenderer] render called.'));
const mockRendererDispose = vi.fn(() => console.log('[Mock WebGLRenderer] dispose called.'));
const mockSceneAdd = vi.fn((obj) => console.log(`[Mock Scene] add called with object: ${obj?.name || 'unnamed'}.`));
const mockCameraUpdateProjectionMatrix = vi.fn(() => console.log('[Mock PerspectiveCamera] updateProjectionMatrix called.'));
const mockLightPositionSet = vi.fn((x,y,z) => console.log(`[Mock DirectionalLight] position.set called with ${x},${y},${z}.`));
const mockCameraPositionSet = vi.fn((x,y,z) => console.log(`[Mock PerspectiveCamera] position.set called with ${x},${y},${z}.`));

// --- Mock the 'three' Module ---
// This attempts to mock the entire module before any tests run in the browser
console.log('[Browser Setup] Starting to mock Three.js module...');
vi.mock('three', () => {
  console.log('[Browser Setup] Executing vi.mock factory for "three".');
  return {
    // Mock classes/functions used by car-viewer.js
    WebGLRenderer: vi.fn().mockImplementation(() => {
        console.log('[Mock WebGLRenderer] Constructor called.');
        return {
            domElement: document.createElement('canvas'), // Provide a DOM element
            setSize: mockRendererSetSize,
            setPixelRatio: mockRendererSetPixelRatio,
            render: mockRendererRender,
            dispose: mockRendererDispose,
            shadowMap: { enabled: false },
            outputColorSpace: '',
        };
    }),
    Scene: vi.fn().mockImplementation(() => {
        console.log('[Mock Scene] Constructor called.');
        return {
            add: mockSceneAdd,
            background: null,
        };
    }),
    PerspectiveCamera: vi.fn().mockImplementation(() => {
        console.log('[Mock PerspectiveCamera] Constructor called.');
        return {
            position: { set: mockCameraPositionSet },
            aspect: 1,
            updateProjectionMatrix: mockCameraUpdateProjectionMatrix,
        };
    }),
    DirectionalLight: vi.fn().mockImplementation(() => {
        console.log('[Mock DirectionalLight] Constructor called.');
        return {
            position: { set: mockLightPositionSet },
            castShadow: false,
        };
    }),
    HemisphereLight: vi.fn(() => {
        console.log('[Mock HemisphereLight] Constructor called.');
        return new MockObject3D();
    }),
    Color: vi.fn(() => {
        console.log('[Mock Color] Constructor called.');
    }),
    Object3D: MockObject3D, // Use our simple mock class

    // Mock addons from within the main 'three' mock
    // Attempting to provide these directly as if they were part of the main module
    GLTFLoader: vi.fn().mockImplementation(() => {
        console.log('[Mock GLTFLoader] Constructor called (via three mock).');
        return { load: mockGltfLoad };
    }),
    OrbitControls: vi.fn().mockImplementation(() => {
        console.log('[Mock OrbitControls] Constructor called (via three mock).');
        return { dispose: mockControlsDispose, update: mockControlsUpdate, enableDamping: false };
    }),
    // Add constants if needed
    // SRGBColorSpace: 'mockSRGBColorSpace',
  };
});

// --- Mock Addons Separately (Redundant but Safe) ---
// In case components import directly from the addons path
vi.mock('three/addons/loaders/GLTFLoader.js', () => {
  console.log('[Browser Setup] Executing vi.mock factory for GLTFLoader addon.');
  return {
    GLTFLoader: vi.fn().mockImplementation(() => {
      console.log('[Mock GLTFLoader] Constructor called (via addon mock).');
      return { load: mockGltfLoad };
    })
  };
});

vi.mock('three/addons/controls/OrbitControls.js', () => {
  console.log('[Browser Setup] Executing vi.mock factory for OrbitControls addon.');
  return {
    OrbitControls: vi.fn().mockImplementation(() => {
      console.log('[Mock OrbitControls] Constructor called (via addon mock).');
      return { dispose: mockControlsDispose, update: mockControlsUpdate, enableDamping: false };
    })
  };
});

console.log('[Browser Setup] Mocking complete.');

// Export mocks if tests need to assert calls on them directly
// (Although importing the mocked THREE and checking THREE.WebGLRenderer.mock... is often cleaner)
export {
    mockGltfLoad, mockControlsDispose, mockControlsUpdate,
    mockRendererSetSize, mockRendererSetPixelRatio, mockRendererRender, mockRendererDispose,
    mockSceneAdd, mockCameraUpdateProjectionMatrix, mockLightPositionSet, mockCameraPositionSet,
    MockObject3D
};
