import { vi } from 'vitest';

// Export mock functions so tests can spy on them or check calls
export const mockControlsDispose = vi.fn();
export const mockControlsUpdate = vi.fn();

// Mock the OrbitControls class constructor and its methods
export class OrbitControls {
  constructor(camera, domElement) {
    // console.log('[Mock OrbitControls Alias] Constructor called');
    // Mock properties accessed by the component under test
    this.enableDamping = true; // Example: if car-viewer.js sets this
    // this.dampingFactor = 0.05; // Example: if car-viewer.js uses this
    
    // Store references if needed, though usually not for basic mocking
    // this.object = camera;
    // this.domElement = domElement;
  }

  // Assign the mock functions to the methods
  dispose = mockControlsDispose;
  update = mockControlsUpdate;

  // Add other methods/properties if the component uses them
  // e.g., target = { set: vi.fn() };
}
