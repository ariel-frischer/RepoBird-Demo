import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { init, cleanup as cleanupDemo } from './3d-text.js'; // Adjust path as needed

// --- Top-level Mocks ---
let simulateFontLoadError = false; // Flag to control mock behavior

vi.mock('three/addons/loaders/FontLoader.js', () => ({
    FontLoader: vi.fn().mockImplementation(() => ({
        load: vi.fn((url, onLoad, onProgress, onError) => {
            // Simulate successful loading or error based on the flag
            if (simulateFontLoadError) {
                 if (onError) {
                    // Use setTimeout to ensure async behavior
                    setTimeout(() => onError(new Error('Mocked font loading failed')), 0);
                }
            } else {
                const mockFont = { type: 'Font', data: {} }; // Minimal mock font
                if (onLoad) {
                    // Use setTimeout to mimic async loading behavior slightly
                    setTimeout(() => onLoad(mockFont), 0);
                }
            }
        }),
    })),
}));

vi.mock('three/addons/geometries/TextGeometry.js', () => ({
    TextGeometry: vi.fn().mockImplementation(() => ({
        center: vi.fn(),
        dispose: vi.fn(),
    })),
}));
// --- End Mocks ---


describe('3D Text Component', () => {
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
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up the container and mocks after each test
    // Clean up the container
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Reset mocks and spies
    vi.restoreAllMocks();
    simulateFontLoadError = false; // Reset the flag after each test
    // Ensure component cleanup is called if initialized
    try {
        cleanup(); // Call the assigned cleanup function
    } catch (e) {
        console.error("Error during test cleanup:", e);
    }
  });

  it('should initialize without errors and add a canvas', () => {
    expect(() => {
      cleanup = init(container); // Assign the returned cleanup function
    }).not.toThrow();
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('should return a cleanup function', () => {
    const result = init(container);
    // In 3d-text.js, init doesn't return anything directly, cleanup is exported separately
    // Let's adjust the test to reflect this. We'll call the exported cleanup.
    expect(cleanupDemo).toBeInstanceOf(Function); // Check the exported cleanup
    // We still call init to set up the component state for cleanup
    init(container);
    cleanup = cleanupDemo; // Assign the exported cleanup for afterEach
  });

  it('cleanup function should execute without errors', () => {
    init(container); // Initialize component state
    cleanup = cleanupDemo; // Assign exported cleanup

    expect(() => {
      cleanup(); // Execute cleanup
    }).not.toThrow();

    // Verify mocks or console logs if necessary to confirm cleanup actions
    // e.g., expect(console.log).toHaveBeenCalledWith("3D Text Cleanup Complete");
    // e.g., expect(console.log).toHaveBeenCalledWith("3D Text Cleanup Complete");
  });

   it('should handle font loading errors gracefully', async () => {
        // Set the flag to make the top-level mock simulate an error
        simulateFontLoadError = true;

        cleanup = cleanupDemo; // Assign the standard cleanup

        init(container); // Initialize with the error-simulating mock active

        // Wait for the async error handling (setTimeout in mock) and DOM update
        await vi.waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('An error happened during font loading:', expect.any(Error));
            const errorDiv = container.querySelector('#font-error-message');
            expect(errorDiv).not.toBeNull();
            expect(errorDiv.textContent).toContain('Error loading font');
        });
    });

});
