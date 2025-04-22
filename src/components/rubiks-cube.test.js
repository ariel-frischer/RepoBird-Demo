
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRubiksCubeComponent } from './rubiks-cube.js'; // Import the creator function
import TWEEN from '@tweenjs/tween.js';

// Helper to advance Tween animations
async function advanceTweens(duration) {
    const start = performance.now();
    let now = start;
    while (now - start < duration) {
        TWEEN.update(now);
        // Use a small delay to yield control and allow async operations
        await new Promise(resolve => setTimeout(resolve, 10)); 
        now = performance.now();
    }
    TWEEN.update(start + duration); // Ensure final update
}

// Helper to get a simplified, sortable state representation
function getLogicalState(cubies) {
    return cubies.map(c => `${c.x},${c.y},${c.z}`).sort();
}

describe('Rubiks Cube Component Logic', () => {
    let container;
    let componentInstance;
    let cleanupFunction;

    beforeEach(() => {
        container = document.createElement('div');
        container.style.width = '500px'; // Provide dimensions for renderer/camera
        container.style.height = '500px';
        document.body.appendChild(container);

        // Use the creator function to get the instance
        componentInstance = createRubiksCubeComponent();
        // Call init on the instance
        cleanupFunction = componentInstance.init(container); 

        // Mock requestAnimationFrame for TWEEN updates in tests
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            // Call the callback immediately for testing purposes, 
            // or use setTimeout for more realistic async behavior if needed
            // setTimeout(() => cb(performance.now()), 16); 
            cb(performance.now()); // Simplified immediate call
            return 0; // Return a dummy ID
        });
        vi.spyOn(window, 'cancelAnimationFrame');
    });

    afterEach(() => {
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
        it('should initialize with default size 3x3x3', () => {
            const state = componentInstance.getState();
            expect(state.size).toBe(3);
            // Correct cubie count for 3x3x3 is 3*3*3 - 1 (center) = 26
            expect(state.cubies.length).toBe(26);
        });

        it('should initialize with a specific size (2x2x2)', () => {
            // Need to cleanup default instance first
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 2); // Initialize with size 2

            const state = componentInstance.getState();
            expect(state.size).toBe(2);
            // Correct cubie count for 2x2x2 is 2*2*2 = 8
            expect(state.cubies.length).toBe(8);
        });

        it('should initialize with a specific size (4x4x4)', () => {
            // Cleanup default
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 4); // Initialize with size 4

            const state = componentInstance.getState();
            expect(state.size).toBe(4);
            // Correct cubie count for 4x4x4 is 4*4*4 - (inner 2*2*2) = 64 - 8 = 56
            expect(state.cubies.length).toBe(56);
        });

        it('should add canvas and lil-gui elements to the container', () => {
            const canvas = container.querySelector('canvas');
            expect(canvas).not.toBeNull();
            expect(canvas).toBeInstanceOf(HTMLCanvasElement);

            const guiElement = container.querySelector('.lil-gui');
            expect(guiElement).not.toBeNull();
            expect(guiElement).toBeInstanceOf(HTMLElement);
        });

         it('cleanup function should remove canvas and lil-gui', () => {
            cleanupFunction(); // Call cleanup

            const canvas = container.querySelector('canvas');
            expect(canvas).toBeNull();

            // lil-gui removes its own element on destroy(), which is called in cleanup
            const guiElement = container.querySelector('.lil-gui');
            expect(guiElement).toBeNull();
            cleanupFunction = null; // Prevent afterEach call
        });
    });

    describe('Size Change', () => {
        it('should change size from 3x3x3 to 2x2x2 via changeSize()', () => {
            let state = componentInstance.getState();
            expect(state.size).toBe(3); // Initial state

            componentInstance.changeSize(2);

            state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);
        });

        it('should change size from 2x2x2 to 4x4x4 via changeSize()', () => {
            // Start at size 2
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 2);
            let state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);

            componentInstance.changeSize(4);

            state = componentInstance.getState();
            expect(state.size).toBe(4);
            expect(state.cubies.length).toBe(56);
        });

        it('should not change size if rotation is in progress', async () => {
            const stateBefore = componentInstance.getState();
            expect(stateBefore.size).toBe(3);

            // Simulate starting a rotation (but don't wait for it)
            componentInstance.rotateFace('y', 1, 1); 
            expect(componentInstance.getState().isRotating).toBe(true);

            // Attempt to change size while rotating
            componentInstance.changeSize(2);

            // Size should not have changed
            const stateAfter = componentInstance.getState();
            expect(stateAfter.size).toBe(3); // Still 3
            expect(stateAfter.cubies.length).toBe(26);

             // Wait for the rotation to actually finish to avoid issues in cleanup
            await advanceTweens(400); // Allow rotation to complete
            expect(componentInstance.getState().isRotating).toBe(false); 
        });

         it('should reject invalid sizes', () => {
            const initialSize = componentInstance.getState().size;
            componentInstance.changeSize(1); // Too small
            expect(componentInstance.getState().size).toBe(initialSize);
            componentInstance.changeSize(6); // Too large
            expect(componentInstance.getState().size).toBe(initialSize);
            componentInstance.changeSize(3.5); // Not integer
             expect(componentInstance.getState().size).toBe(initialSize);
         });
    });

    describe('Shuffle and Solve', { timeout: 15000 }, () => { // Increase timeout for async operations
        it('should shuffle the cube and change its logical state', async () => {
            const initialState = getLogicalState(componentInstance.getState().cubies);

            await componentInstance.shuffle();
            
            // Need to wait for potentially stacked animations from shuffle
            // A simple wait might work, or checking isRotating repeatedly
            while(componentInstance.getState().isRotating) {
                await new Promise(resolve => setTimeout(resolve, 50));
                TWEEN.update(performance.now()); // Keep updating tweens
            }

            const shuffledState = getLogicalState(componentInstance.getState().cubies);
            const shuffleSequence = componentInstance.getState().shuffleSequence;

            expect(shuffledState).not.toEqual(initialState);
            expect(shuffleSequence.length).toBeGreaterThan(0);
            // Check if cubie positions are actually different (shuffle worked)
            expect(initialState.join('') === shuffledState.join('')).toBe(false);
        });

        it('should solve the cube back to its initial state', async () => {
            const initialState = getLogicalState(componentInstance.getState().cubies);
            
            await componentInstance.shuffle();
             while(componentInstance.getState().isRotating) {
                await new Promise(resolve => setTimeout(resolve, 50));
                TWEEN.update(performance.now());
            }
            const shuffledState = getLogicalState(componentInstance.getState().cubies);
            expect(shuffledState).not.toEqual(initialState); // Verify it shuffled first
            expect(componentInstance.getState().shuffleSequence.length).toBeGreaterThan(0);

            await componentInstance.solve();
            while(componentInstance.getState().isRotating) {
                await new Promise(resolve => setTimeout(resolve, 50));
                TWEEN.update(performance.now());
            }

            const solvedState = getLogicalState(componentInstance.getState().cubies);
            const shuffleSequenceAfterSolve = componentInstance.getState().shuffleSequence;
            
            expect(solvedState).toEqual(initialState);
            expect(shuffleSequenceAfterSolve.length).toBe(0);
        });

         it('solve should do nothing if the cube was not shuffled', async () => {
             const initialState = getLogicalState(componentInstance.getState().cubies);
             const initialSequence = componentInstance.getState().shuffleSequence;
             expect(initialSequence.length).toBe(0);

             await componentInstance.solve(); // Call solve without prior shuffle
              while(componentInstance.getState().isRotating) {
                 await new Promise(resolve => setTimeout(resolve, 50));
                 TWEEN.update(performance.now());
             }

             const finalState = getLogicalState(componentInstance.getState().cubies);
             const finalSequence = componentInstance.getState().shuffleSequence;

             expect(finalState).toEqual(initialState);
             expect(finalSequence.length).toBe(0);
         });
    });

});
