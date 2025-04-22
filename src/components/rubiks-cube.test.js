
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRubiksCubeComponent } from './rubiks-cube.js'; // Import the creator function
import TWEEN from '@tweenjs/tween.js';

// Helper to get a simplified, sortable state representation
function getLogicalState(cubies) {
    return cubies.map(c => `${c.x},${c.y},${c.z}`);
}

describe('Rubiks Cube Component Logic', () => {
    let container;
    let componentInstance;
    let cleanupFunction;
    const testOptions = { isTest: true }; // Define options for test environment

    beforeEach(() => {
        container = document.createElement('div');
        container.style.width = '500px'; // Provide dimensions for renderer/camera
        container.style.height = '500px';
        document.body.appendChild(container);

        // Use the creator function to get the instance
        componentInstance = createRubiksCubeComponent();
        // Call init on the instance, passing the test options
        cleanupFunction = componentInstance.init(container, 3, testOptions); // Default size 3, pass options

        // Mock requestAnimationFrame for TWEEN updates in tests
        // Use setTimeout to yield control, preventing stack overflow
        vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
        vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
    });

    afterEach(() => {
        // Clean up tweens before restoring mocks
        TWEEN.removeAll();

        // Stop mocking
        vi.restoreAllMocks();

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
        componentInstance = null;
        cleanupFunction = null;
    });

    describe('Initialization', () => {
        it('should initialize with default size 3x3x3 in test mode', () => {
            // beforeEach already initializes with testOptions
            const state = componentInstance.getState();
            expect(state.size).toBe(3);
            // Correct cubie count for 3x3x3 is 3*3*3 - 1 (center) = 26
            expect(state.cubies.length).toBe(26);
        });

        it('should initialize with a specific size (2x2x2) in test mode', () => {
            // Need to cleanup default instance first
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            // Initialize with size 2 and test options
            cleanupFunction = componentInstance.init(container, 2, testOptions);

            const state = componentInstance.getState();
            expect(state.size).toBe(2);
            // Correct cubie count for 2x2x2 is 2*2*2 = 8
            expect(state.cubies.length).toBe(8);
        });

        it('should initialize with a specific size (4x4x4) in test mode', () => {
            // Cleanup default
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            // Initialize with size 4 and test options
            cleanupFunction = componentInstance.init(container, 4, testOptions);

            const state = componentInstance.getState();
            expect(state.size).toBe(4);
            // Correct cubie count for 4x4x4 is 4*4*4 - (inner 2*2*2) = 64 - 8 = 56
            expect(state.cubies.length).toBe(56); // Assert the corrected count
        });

        it('should add canvas BUT NOT lil-gui element to the container in test mode', () => {
            // beforeEach initializes with testOptions
            const canvas = container.querySelector('canvas');
            expect(canvas).not.toBeNull();
            expect(canvas).toBeInstanceOf(HTMLCanvasElement);

            // lil-gui should NOT be added in test mode
            const guiElement = container.querySelector('.lil-gui');
            expect(guiElement).toBeNull();
        });

         it('cleanup function should remove canvas', () => {
            // beforeEach initializes with testOptions
            cleanupFunction(); // Call cleanup

            const canvas = container.querySelector('canvas');
            expect(canvas).toBeNull();

            // Verify lil-gui wasn't there to begin with
            const guiElement = container.querySelector('.lil-gui');
            expect(guiElement).toBeNull();
            cleanupFunction = null; // Prevent afterEach call
        });
    });

    describe('Size Change', () => {
        it('should change size from 3x3x3 to 2x2x2 via changeSize()', () => {
            // beforeEach initializes with size 3 and testOptions
            let state = componentInstance.getState();
            expect(state.size).toBe(3); // Initial state

            componentInstance.changeSize(2);

            state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);
        });

        it('should change size from 2x2x2 to 4x4x4 via changeSize()', () => {
            // Start at size 2 with test options
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 2, testOptions); // Pass options
            let state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);

            componentInstance.changeSize(4);

            state = componentInstance.getState();
            expect(state.size).toBe(4);
            expect(state.cubies.length).toBe(56); // Assert the corrected count
        });

        it('should change size even if rotation is logically "in progress" in test mode', async () => {
            // In test mode, rotations are instant, so `isRotating` should reset immediately.
            // `changeSize` should proceed without being blocked.
            const stateBefore = componentInstance.getState();
            expect(stateBefore.size).toBe(3);

            // Perform a rotation (this is synchronous in test mode)
            await componentInstance.rotateFace('y', 1, 1);
            expect(componentInstance.getState().isRotating).toBe(false); // Should be false immediately after

            // Attempt to change size
            componentInstance.changeSize(2);

            // Size should have changed
            const stateAfter = componentInstance.getState();
            expect(stateAfter.size).toBe(2);
            expect(stateAfter.cubies.length).toBe(8);
        });

         it('should reject invalid sizes', () => {
             // beforeEach initializes with size 3 and testOptions
            const initialSize = componentInstance.getState().size;
            componentInstance.changeSize(1); // Too small
            expect(componentInstance.getState().size).toBe(initialSize);
            componentInstance.changeSize(6); // Too large
            expect(componentInstance.getState().size).toBe(initialSize);
            componentInstance.changeSize(3.5); // Not integer
             expect(componentInstance.getState().size).toBe(initialSize);
         });
    });

    // Reduced timeout as synchronous waits are removed due to test mode
    describe('Shuffle and Solve', { timeout: 5000 }, () => { // Reduced timeout further
        it('should shuffle the cube and change its logical state', async () => {
            // beforeEach initializes with testOptions
            const initialState = getLogicalState(componentInstance.getState().cubies);

            await componentInstance.shuffle(); // Should be fast in test mode

            const shuffledState = getLogicalState(componentInstance.getState().cubies);
            const shuffleSequence = componentInstance.getState().shuffleSequence;

            expect(shuffledState).not.toEqual(initialState);
            expect(shuffleSequence.length).toBeGreaterThan(0);
            // Check if cubie positions are actually different (shuffle worked)
            expect(initialState.join('') === shuffledState.join('')).toBe(false);
        });

        it('should solve the cube back to its initial state', async () => {
            // beforeEach initializes with testOptions
            const initialState = getLogicalState(componentInstance.getState().cubies);

            await componentInstance.shuffle(); // Shuffle first (fast in test mode)

            const shuffledState = getLogicalState(componentInstance.getState().cubies);
            expect(shuffledState).not.toEqual(initialState); // Verify it shuffled first
            expect(componentInstance.getState().shuffleSequence.length).toBeGreaterThan(0);

            await componentInstance.solve(); // Solve (fast in test mode)

            const solvedState = getLogicalState(componentInstance.getState().cubies);
            const shuffleSequenceAfterSolve = componentInstance.getState().shuffleSequence;

            expect(solvedState).toEqual(initialState);
            expect(shuffleSequenceAfterSolve.length).toBe(0);
        });

         it('solve should do nothing if the cube was not shuffled', async () => {
             // beforeEach initializes with testOptions
             const initialState = getLogicalState(componentInstance.getState().cubies);
             const initialSequence = componentInstance.getState().shuffleSequence;
             expect(initialSequence.length).toBe(0);

             await componentInstance.solve(); // Call solve without prior shuffle

             const finalState = getLogicalState(componentInstance.getState().cubies);
             const finalSequence = componentInstance.getState().shuffleSequence;

             expect(finalState).toEqual(initialState);
             expect(finalSequence.length).toBe(0);
         });
    });

});
