import { vi } from 'vitest';
import { Object3D } from 'three'; // Import real Object3D for mock data

export const mockGltfLoad = vi.fn((url, onLoad, onProgress, onError) => {
  // Call onLoad/onError synchronously to avoid race conditions with test cleanup
  if (url === 'models/car.gltf') {
    const mockGltfScene = new Object3D();
    mockGltfScene.name = 'MockCarSceneViaAlias'; // Identify mock
    // Call onLoad directly
    try {
        onLoad({ scene: mockGltfScene });
    } catch (e) {
        console.error("[Mock GLTFLoader] Error during sync onLoad call:", e);
        if(onError) onError(e); // Also call onError if onLoad throws
        else throw e; // Re-throw if no onError handler
    }
  } else {
    const error = new Error(`Mock GLTF load error (Alias): Invalid URL ${url}`);
    // Call onError directly if provided
    if (onError) {
        try {
            onError(error);
        } catch (e) {
             console.error("[Mock GLTFLoader] Error during sync onError call:", e);
             throw e; // Re-throw if onError itself throws
        }
    } else {
        // If no onError handler, the error should probably still halt execution
        console.error("[Mock GLTFLoader] No onError provided for error:", error);
        // Optionally: throw error; // Or handle as appropriate for your component's expected behavior
    }
  }
});

// Mock the GLTFLoader class constructor and its methods
export class GLTFLoader {
  constructor() {
    // console.log('[Mock GLTFLoader Alias] Constructor called');
  }
  load = mockGltfLoad;
}
