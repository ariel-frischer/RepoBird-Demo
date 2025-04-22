
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRubiksCubeComponent } from './rubiks-cube.js'; // Import the creator function
import TWEEN from '@tweenjs/tween.js';

// Helper to get a simplified, sortable state representation
function getLogicalState(cubies) {
    // Map logical positions which are stored in mesh.userData
    return cubies.map(c => {
        // Access logicalPosition via c.mesh.userData
        const lp = c.mesh && c.mesh.userData ? c.mesh.userData.logicalPosition : undefined;
        // Handle potential undefined logicalPosition during initialization or edge cases
        if (!lp) return 'undefined';
        return `${lp.x.toFixed(1)},${lp.y.toFixed(1)},${lp.z.toFixed(1)}`; // Use fixed precision for comparison
    }).sort(); // Sort for consistent comparison regardless of cubie order
}

// Helper to find cubie by initial position (used across multiple test suites)
const findCubieByInitialPosition = (instance, x, y, z) => {
    const cubies = instance.getState().cubies; // Gets array [{ mesh, x, y, z }, ...]
    for (const cubie of cubies) {
        const ip = cubie.mesh && cubie.mesh.userData ? cubie.mesh.userData.initialPosition : undefined;
        if (ip &&
            Math.abs(ip.x - x) < 0.01 &&
            Math.abs(ip.y - y) < 0.01 &&
            Math.abs(ip.z - z) < 0.01) {
            return cubie; // Return the object { mesh, x, y, z }
        }
    }
    return null; // Return null if not found
};

// Define CubeState Enum locally for testing (mirroring the one in rubiks-cube.js)
const CubeState = {
    IDLE: 'idle',
    ROTATING: 'rotating',
    SHUFFLING: 'shuffling',
    SOLVING: 'solving',
    RESIZING: 'resizing'
};


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
            expect(state.currentCubeState).toBe(CubeState.IDLE); // Check initial state
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
            expect(state.currentCubeState).toBe(CubeState.IDLE);
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
            expect(state.currentCubeState).toBe(CubeState.IDLE);
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
            expect(state.currentCubeState).toBe(CubeState.IDLE);

            componentInstance.changeSize(2);

            state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);
            expect(state.currentCubeState).toBe(CubeState.IDLE); // Should be IDLE after resize
        });

        it('should change size from 2x2x2 to 4x4x4 via changeSize()', () => {
            // Start at size 2 with test options
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 2, testOptions); // Pass options
            let state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);
            expect(state.currentCubeState).toBe(CubeState.IDLE);

            componentInstance.changeSize(4);

            state = componentInstance.getState();
            expect(state.size).toBe(4);
            expect(state.cubies.length).toBe(56); // Assert the corrected count
            expect(state.currentCubeState).toBe(CubeState.IDLE); // Should be IDLE after resize
        });

        it('should change size even if rotation is logically "in progress" in test mode', async () => {
            // In test mode, rotations are instant, and the state should reset immediately.
            // `changeSize` should proceed without being blocked because the state is IDLE.
            const stateBefore = componentInstance.getState();
            expect(stateBefore.size).toBe(3);
            expect(stateBefore.currentCubeState).toBe(CubeState.IDLE);

            // Perform a rotation (this is synchronous in test mode and resets state)
            await componentInstance.rotateFace('y', 1, 1);
            // Check that the state is IDLE immediately after the instant rotation
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            // Attempt to change size - should be allowed because state is IDLE
            componentInstance.changeSize(2);

            // Size should have changed, and state should remain IDLE
            const stateAfter = componentInstance.getState();
            expect(stateAfter.size).toBe(2);
            expect(stateAfter.cubies.length).toBe(8);
            expect(stateAfter.currentCubeState).toBe(CubeState.IDLE);
        });

         it('should reject invalid sizes', () => {
             // beforeEach initializes with size 3 and testOptions
            const initialSize = componentInstance.getState().size;
            const initialState = componentInstance.getState().currentCubeState;
            componentInstance.changeSize(1); // Too small
            expect(componentInstance.getState().size).toBe(initialSize);
            expect(componentInstance.getState().currentCubeState).toBe(initialState); // State should not change
            componentInstance.changeSize(6); // Too large
            expect(componentInstance.getState().size).toBe(initialSize);
            expect(componentInstance.getState().currentCubeState).toBe(initialState);
            componentInstance.changeSize(3.5); // Not integer
             expect(componentInstance.getState().size).toBe(initialSize);
             expect(componentInstance.getState().currentCubeState).toBe(initialState);
         });
    });

    describe('Rotation Logic', () => {
        // Separate beforeEach/afterEach for rotation tests to avoid conflicts with main ones if needed,
        // or ensure cleanup happens correctly. Using local setup/cleanup for now.
        let rotationTestContainer;
        let rotationInstance;
        let rotationCleanup;

        // Uses the global findCubieByInitialPosition helper defined above

        beforeEach(() => {
            // Mock TWEEN globally if needed for rotation tests, though isTest should bypass it
             vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
             vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
        });

        afterEach(() => {
            TWEEN.removeAll(); // Ensure any stray tweens are cleared
            vi.restoreAllMocks(); // Restore mocks after each rotation test

            if (typeof rotationCleanup === 'function') {
                try {
                    rotationCleanup();
                } catch (e) {
                    console.error("Error during rotation test cleanup:", e);
                }
            }
            if (rotationTestContainer && rotationTestContainer.parentNode) {
                rotationTestContainer.parentNode.removeChild(rotationTestContainer);
            }
            rotationTestContainer = null;
            rotationInstance = null;
            rotationCleanup = null;
        });

        it('should correctly rotate the top layer on a size 4 cube', async () => {
            // Initialize size 4 cube specifically for this test
            rotationTestContainer = document.createElement('div');
            document.body.appendChild(rotationTestContainer);
            rotationInstance = createRubiksCubeComponent();
            const options = { isTest: true };
            rotationCleanup = rotationInstance.init(rotationTestContainer, 4, options); // Init size 4 with test mode

            // Find a corner cubie on the top face, e.g., initial position (-1.5, 1.5, 1.5)
            const initialPos = { x: -1.5, y: 1.5, z: 1.5 };
            let targetCubie = findCubieByInitialPosition(rotationInstance, initialPos.x, initialPos.y, initialPos.z);

            expect(targetCubie).toBeDefined();
            expect(targetCubie).not.toBeNull(); // Ensure cubie was found
            expect(targetCubie.mesh).toBeDefined(); // Ensure mesh exists
            expect(targetCubie.mesh.userData).toBeDefined(); // Ensure userData exists

            // Verify initial logical position matches initial position before rotation
            const initialLogicalPos = targetCubie.mesh.userData.logicalPosition;
            expect(initialLogicalPos).toBeDefined();
            expect(initialLogicalPos.x).toBeCloseTo(initialPos.x);
            expect(initialLogicalPos.y).toBeCloseTo(initialPos.y);
            expect(initialLogicalPos.z).toBeCloseTo(initialPos.z);


            // Rotate the top layer (y = 1.5) by 90 degrees counter-clockwise (+1 direction)
            await rotationInstance.rotateFace('y', 1.5, 1);

            // Expected new logical position after +90 deg Y rotation (CCW): (z, y, -x) based on RHR
            // initial: (-1.5, 1.5, 1.5) -> expected: (1.5, 1.5, -(-1.5)) -> (1.5, 1.5, 1.5)
            const expectedPos = { x: 1.5, y: 1.5, z: 1.5 }; // <<< CORRECTED EXPECTATION

            // Verify the cubie's logical position has updated
            targetCubie = findCubieByInitialPosition(rotationInstance, initialPos.x, initialPos.y, initialPos.z);
            expect(targetCubie).toBeDefined(); // Make sure it's still findable
            expect(targetCubie).not.toBeNull();
            expect(targetCubie.mesh).toBeDefined();
            expect(targetCubie.mesh.userData).toBeDefined();

            const finalLogicalPos = targetCubie.mesh.userData.logicalPosition;
            expect(finalLogicalPos).toBeDefined(); // Check if logical position exists
            expect(finalLogicalPos.x).toBeCloseTo(expectedPos.x);
            expect(finalLogicalPos.y).toBeCloseTo(expectedPos.y);
            expect(finalLogicalPos.z).toBeCloseTo(expectedPos.z);
        });

         it('should correctly rotate an inner layer on a size 4 cube', async () => {
             // Initialize size 4 cube
             rotationTestContainer = document.createElement('div');
             document.body.appendChild(rotationTestContainer);
             rotationInstance = createRubiksCubeComponent();
             const options = { isTest: true };
             rotationCleanup = rotationInstance.init(rotationTestContainer, 4, options);

             // Find an edge cubie on an inner layer, e.g., initial position (0.5, 0.5, 1.5)
             const initialPos = { x: 0.5, y: 0.5, z: 1.5 };
             let targetCubie = findCubieByInitialPosition(rotationInstance, initialPos.x, initialPos.y, initialPos.z);
             expect(targetCubie).toBeDefined();
             expect(targetCubie).not.toBeNull();
             expect(targetCubie.mesh).toBeDefined();
             expect(targetCubie.mesh.userData).toBeDefined();

             // Verify initial logical position
             const initialLogicalPos = targetCubie.mesh.userData.logicalPosition;
             expect(initialLogicalPos).toBeDefined();
             expect(initialLogicalPos.x).toBeCloseTo(initialPos.x);
             expect(initialLogicalPos.y).toBeCloseTo(initialPos.y);
             expect(initialLogicalPos.z).toBeCloseTo(initialPos.z);

             // Rotate the inner layer (y = 0.5) by 90 degrees clockwise (-1 direction)
             await rotationInstance.rotateFace('y', 0.5, -1);

             // Expected new logical position after -90 deg Y rotation (CW): (-z, y, x) based on RHR
             // initial: (0.5, 0.5, 1.5) -> expected: (-1.5, 0.5, 0.5)
             const expectedPos = { x: -1.5, y: 0.5, z: 0.5 }; // <<< CORRECTED EXPECTATION

             // Verify the cubie's logical position has updated
             targetCubie = findCubieByInitialPosition(rotationInstance, initialPos.x, initialPos.y, initialPos.z); // Re-find cubie
             expect(targetCubie).toBeDefined();
             expect(targetCubie).not.toBeNull();
             expect(targetCubie.mesh).toBeDefined();
             expect(targetCubie.mesh.userData).toBeDefined();

             const finalLogicalPos = targetCubie.mesh.userData.logicalPosition;
             expect(finalLogicalPos).toBeDefined();
             expect(finalLogicalPos.x).toBeCloseTo(expectedPos.x);
             expect(finalLogicalPos.y).toBeCloseTo(expectedPos.y);
             expect(finalLogicalPos.z).toBeCloseTo(expectedPos.z);
         });

          it('should correctly rotate a face layer on a size 3 cube (sanity check)', async () => {
             // Initialize size 3 cube
             rotationTestContainer = document.createElement('div');
             document.body.appendChild(rotationTestContainer);
             rotationInstance = createRubiksCubeComponent();
             const options = { isTest: true };
             rotationCleanup = rotationInstance.init(rotationTestContainer, 3, options);

             // Find a corner cubie on the top face, e.g., initial position (-1, 1, 1)
             const initialPos = { x: -1, y: 1, z: 1 };
             let targetCubie = findCubieByInitialPosition(rotationInstance, initialPos.x, initialPos.y, initialPos.z);
             expect(targetCubie).toBeDefined();
             expect(targetCubie).not.toBeNull();
             expect(targetCubie.mesh).toBeDefined();
             expect(targetCubie.mesh.userData).toBeDefined();

             // Verify initial logical position
             const initialLogicalPos = targetCubie.mesh.userData.logicalPosition;
             expect(initialLogicalPos).toBeDefined();
             expect(initialLogicalPos.x).toBeCloseTo(initialPos.x);
             expect(initialLogicalPos.y).toBeCloseTo(initialPos.y);
             expect(initialLogicalPos.z).toBeCloseTo(initialPos.z);

             // Rotate the top layer (y = 1) by 180 degrees (+2 direction)
             await rotationInstance.rotateFace('y', 1, 2);

             // Expected new logical position after +180 deg Y rotation: (-x, y, -z)
             // initial: (-1, 1, 1) -> expected: (1, 1, -1)
             const expectedPos = { x: 1, y: 1, z: -1 }; // <<< REMAINS CORRECT

             // Verify the cubie's logical position has updated
             targetCubie = findCubieByInitialPosition(rotationInstance, initialPos.x, initialPos.y, initialPos.z); // Re-find cubie
             expect(targetCubie).toBeDefined();
             expect(targetCubie).not.toBeNull();
             expect(targetCubie.mesh).toBeDefined();
             expect(targetCubie.mesh.userData).toBeDefined();

             const finalLogicalPos = targetCubie.mesh.userData.logicalPosition;
             expect(finalLogicalPos).toBeDefined();
             expect(finalLogicalPos.x).toBeCloseTo(expectedPos.x);
             expect(finalLogicalPos.y).toBeCloseTo(expectedPos.y);
             expect(finalLogicalPos.z).toBeCloseTo(expectedPos.z);
         });
    });

    describe('Shuffle and Solve', { timeout: 5000 }, () => {
        it('should shuffle the cube and change its logical state', async () => {
            // Uses the global findCubieByInitialPosition helper
            const initialPosRef = { x: -1, y: 1, z: 1 }; // Choose a corner cubie

            // 1. Get initial state of the reference cubie
            const initialCubie = findCubieByInitialPosition(componentInstance, initialPosRef.x, initialPosRef.y, initialPosRef.z);
            expect(initialCubie).toBeDefined();
            expect(initialCubie.mesh.userData.logicalPosition).toBeDefined();
            // Deep copy the initial logical position object for later comparison
            const initialLogicalPosition = JSON.parse(JSON.stringify(initialCubie.mesh.userData.logicalPosition));

            // 2. Perform shuffle
            await componentInstance.shuffle();

            // 3. Get final state of the SAME reference cubie (find by initial position)
            const finalCubie = findCubieByInitialPosition(componentInstance, initialPosRef.x, initialPosRef.y, initialPosRef.z);
            expect(finalCubie).toBeDefined();
            expect(finalCubie.mesh.userData.logicalPosition).toBeDefined();
            const finalLogicalPosition = finalCubie.mesh.userData.logicalPosition;

            // 4. Assert that the logical position object has changed
            // Use toEqual for deep comparison of the object values
            expect(finalLogicalPosition).not.toEqual(initialLogicalPosition);

            // Optional: Keep the sequence length check
            const shuffleSequence = componentInstance.getState().shuffleSequence;
            expect(shuffleSequence.length).toBeGreaterThan(0);
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);
        });

        it('should solve the cube back to its initial state after one shuffle', async () => {
            // beforeEach initializes with testOptions
            const initialStateString = getLogicalState(componentInstance.getState().cubies).join('|');
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            await componentInstance.shuffle(); // Shuffle first (fast in test mode)

            // Verify shuffle actually happened (using the modified check from the test above)
            const initialPosRef = { x: -1, y: 1, z: 1 };
            const cubieAfterShuffle = findCubieByInitialPosition(componentInstance, initialPosRef.x, initialPosRef.y, initialPosRef.z);
            expect(cubieAfterShuffle.mesh.userData.logicalPosition).not.toEqual(initialPosRef);

            expect(componentInstance.getState().shuffleSequence.length).toBeGreaterThan(0);
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            await componentInstance.solve(); // Solve (fast in test mode)

            const solvedStateString = getLogicalState(componentInstance.getState().cubies).join('|');
            const shuffleSequenceAfterSolve = componentInstance.getState().shuffleSequence;
            const finalState = componentInstance.getState().currentCubeState;

            // Use join for robust comparison of sorted states
            expect(solvedStateString).toEqual(initialStateString);
            expect(shuffleSequenceAfterSolve.length).toBe(0);
            expect(finalState).toBe(CubeState.IDLE); // Should return to IDLE after solve
        });

        it('should return to solved state after multiple shuffles and a solve', async () => {
            // beforeEach initializes with testOptions
            const initialCubiesState = componentInstance.getState().cubies.map(c => ({
                initialPosition: JSON.parse(JSON.stringify(c.mesh.userData.initialPosition)), // Deep copy initial
                id: c.mesh.uuid // Use UUID as a unique identifier
            }));
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            // Shuffle twice
            await componentInstance.shuffle();
            const sequenceLengthAfterFirstShuffle = componentInstance.getState().shuffleSequence.length;
            expect(sequenceLengthAfterFirstShuffle).toBeGreaterThan(0);
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE); // Should return to IDLE after shuffle

            await componentInstance.shuffle();
            const sequenceLengthAfterSecondShuffle = componentInstance.getState().shuffleSequence.length;
            // The sequence length should now be roughly double the first shuffle's length
            expect(sequenceLengthAfterSecondShuffle).toBeGreaterThan(sequenceLengthAfterFirstShuffle);
             // It should be exactly double if numMoves is constant and no errors occur (size 3 -> 30 moves per shuffle)
            expect(sequenceLengthAfterSecondShuffle).toEqual(sequenceLengthAfterFirstShuffle * 2);
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE); // Should return to IDLE

            // Solve
            await componentInstance.solve();

            // Verify final state matches initial state
            const finalCubies = componentInstance.getState().cubies;
            const finalSequence = componentInstance.getState().shuffleSequence;
            const finalCubeState = componentInstance.getState().currentCubeState;

            expect(finalCubies.length).toEqual(initialCubiesState.length);

            // Check each cubie's final logical position against its original initial position
            finalCubies.forEach(finalCubie => {
                // Find the corresponding initial data using the UUID
                const initialData = initialCubiesState.find(ic => ic.id === finalCubie.mesh.uuid);
                expect(initialData).toBeDefined(); // Ensure we found the corresponding initial data
                expect(finalCubie.mesh.userData.logicalPosition).toEqual(initialData.initialPosition);
            });

            expect(finalSequence.length).toBe(0); // Sequence should be cleared after successful solve
            expect(finalCubeState).toBe(CubeState.IDLE); // Should return to IDLE after solve
        });

         it('solve should do nothing if the cube was not shuffled', async () => {
             // beforeEach initializes with testOptions
             const initialStateString = getLogicalState(componentInstance.getState().cubies).join('|');
             const initialSequence = componentInstance.getState().shuffleSequence;
             expect(initialSequence.length).toBe(0);
             expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

             await componentInstance.solve(); // Call solve without prior shuffle

             const finalStateString = getLogicalState(componentInstance.getState().cubies).join('|');
             const finalSequence = componentInstance.getState().shuffleSequence;
             const finalCubeState = componentInstance.getState().currentCubeState;

             expect(finalStateString).toEqual(initialStateString); // Use join
             expect(finalSequence.length).toBe(0);
             expect(finalCubeState).toBe(CubeState.IDLE); // State should remain IDLE
         });
    });

}); // End of main describe block
