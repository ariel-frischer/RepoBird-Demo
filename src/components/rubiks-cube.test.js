
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRubiksCubeComponent } from './rubiks-cube.js'; // Import the creator function
import TWEEN from '@tweenjs/tween.js';

// Helper to get a simplified, sortable state representation based on INTEGER logical positions
function getLogicalStateInt(cubies) {
    // Map INTEGER logical positions which are stored in mesh.userData.logicalPositionInt
    return cubies.map(c => {
        const lpInt = c.mesh?.userData?.logicalPositionInt;
        // Handle potential undefined logicalPositionInt
        if (!lpInt) return 'undefined-int';
        // Format as string: "x,y,z"
        return `${lpInt.x},${lpInt.y},${lpInt.z}`;
    }).sort(); // Sort for consistent comparison regardless of cubie order
}

// Helper to calculate initial INTEGER logical position from float coordinates
function getInitialIntPosition(x_float, y_float, z_float) {
    return {
        x: Math.round(x_float * 2),
        y: Math.round(y_float * 2),
        z: Math.round(z_float * 2)
    };
}


// Helper to find cubie by initial FLOAT position (remains unchanged)
const findCubieByInitialPosition = (instance, x, y, z) => {
    const cubies = instance.getState().cubies; // Gets array [{ mesh }, ...]
    for (const cubieData of cubies) {
        const mesh = cubieData.mesh;
        const ip = mesh?.userData?.initialPosition;
        if (ip &&
            Math.abs(ip.x - x) < 0.01 &&
            Math.abs(ip.y - y) < 0.01 &&
            Math.abs(ip.z - z) < 0.01) {
            return cubieData; // Return the object { mesh }
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


describe('Rubiks Cube Component Logic (Integer Coordinates)', () => {
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
        it('should initialize with default size 3x3x3 and correct integer coordinates', () => {
            const state = componentInstance.getState();
            expect(state.size).toBe(3);
            expect(state.cubies.length).toBe(26); // 3*3*3 - 1
            expect(state.currentCubeState).toBe(CubeState.IDLE);

            // Check a corner cubie's initial integer position
            const cornerCubieData = findCubieByInitialPosition(componentInstance, 1, 1, 1); // Float coords
            expect(cornerCubieData).toBeDefined();
            expect(cornerCubieData.mesh?.userData?.logicalPositionInt).toEqual({ x: 2, y: 2, z: 2 }); // Integer coords

            // Check an edge cubie's initial integer position
            const edgeCubieData = findCubieByInitialPosition(componentInstance, 0, 1, 1); // Float coords
            expect(edgeCubieData).toBeDefined();
            expect(edgeCubieData.mesh?.userData?.logicalPositionInt).toEqual({ x: 0, y: 2, z: 2 }); // Integer coords

            // Check a face cubie's initial integer position
             const faceCubieData = findCubieByInitialPosition(componentInstance, 0, 0, 1); // Float coords
             expect(faceCubieData).toBeDefined();
             expect(faceCubieData.mesh?.userData?.logicalPositionInt).toEqual({ x: 0, y: 0, z: 2 }); // Integer coords
        });

        it('should initialize with size 4x4x4 and correct integer coordinates', () => {
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 4, testOptions);

            const state = componentInstance.getState();
            expect(state.size).toBe(4);
            expect(state.cubies.length).toBe(56); // 4*4*4 - 8
            expect(state.currentCubeState).toBe(CubeState.IDLE);

            // Check a corner cubie's initial integer position (e.g., float 1.5, 1.5, 1.5)
            const cornerCubieData = findCubieByInitialPosition(componentInstance, 1.5, 1.5, 1.5);
            expect(cornerCubieData).toBeDefined();
            expect(cornerCubieData.mesh?.userData?.logicalPositionInt).toEqual({ x: 3, y: 3, z: 3 });

            // Check an inner edge cubie's initial integer position (e.g., float 0.5, 1.5, 1.5)
            const edgeCubieData = findCubieByInitialPosition(componentInstance, 0.5, 1.5, 1.5);
            expect(edgeCubieData).toBeDefined();
            expect(edgeCubieData.mesh?.userData?.logicalPositionInt).toEqual({ x: 1, y: 3, z: 3 });

             // Check an inner face cubie's initial integer position (e.g., float 0.5, 0.5, 1.5)
             const faceCubieData = findCubieByInitialPosition(componentInstance, 0.5, 0.5, 1.5);
             expect(faceCubieData).toBeDefined();
             expect(faceCubieData.mesh?.userData?.logicalPositionInt).toEqual({ x: 1, y: 1, z: 3 });
        });

        it('should add canvas BUT NOT lil-gui element to the container in test mode', () => {
            // Test unchanged, still relevant
            const canvas = container.querySelector('canvas');
            expect(canvas).not.toBeNull();
            expect(canvas).toBeInstanceOf(HTMLCanvasElement);
            const guiElement = container.querySelector('.lil-gui');
            expect(guiElement).toBeNull();
        });

         it('cleanup function should remove canvas', () => {
             // Test unchanged, still relevant
            cleanupFunction();
            const canvas = container.querySelector('canvas');
            expect(canvas).toBeNull();
            const guiElement = container.querySelector('.lil-gui');
            expect(guiElement).toBeNull();
            cleanupFunction = null; // Prevent afterEach call
        });
    });

    describe('Size Change', () => {
        it('should change size from 3x3x3 to 2x2x2 via changeSize()', () => {
            // Test unchanged, functional check
            componentInstance.changeSize(2);
            const state = componentInstance.getState();
            expect(state.size).toBe(2);
            expect(state.cubies.length).toBe(8);
            expect(state.currentCubeState).toBe(CubeState.IDLE);
        });

        it('should change size from 2x2x2 to 4x4x4 via changeSize()', () => {
            // Test unchanged, functional check
            cleanupFunction();
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 2, testOptions);
            componentInstance.changeSize(4);
            const state = componentInstance.getState();
            expect(state.size).toBe(4);
            expect(state.cubies.length).toBe(56);
            expect(state.currentCubeState).toBe(CubeState.IDLE);
        });

        it('should change size even if rotation is logically "in progress" in test mode', async () => {
            // Test unchanged, functional check (test mode rotations are instant)
            await componentInstance.rotateFace('y', 2, 1); // Use integer layer (top layer for size 3 is y=2)
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);
            componentInstance.changeSize(2);
            const stateAfter = componentInstance.getState();
            expect(stateAfter.size).toBe(2);
            expect(stateAfter.cubies.length).toBe(8);
            expect(stateAfter.currentCubeState).toBe(CubeState.IDLE);
        });

         it('should reject invalid sizes', () => {
             // Test unchanged, functional check
            const initialSize = componentInstance.getState().size;
            componentInstance.changeSize(1);
            expect(componentInstance.getState().size).toBe(initialSize);
            componentInstance.changeSize(6);
            expect(componentInstance.getState().size).toBe(initialSize);
            componentInstance.changeSize(3.5);
             expect(componentInstance.getState().size).toBe(initialSize);
         });
    });

    describe('Rotation Logic (Integer Coordinates)', () => {
        // Uses global findCubieByInitialPosition helper
        // Uses global getInitialIntPosition helper

        beforeEach(() => {
             // Mocks applied in main beforeEach
        });

        afterEach(() => {
             // Mocks restored in main afterEach
        });

        it('should correctly rotate the top layer (y=3) on a size 4 cube', async () => {
            // Initialize size 4 cube
            cleanupFunction(); // Clean up default 3x3
            componentInstance = createRubiksCubeComponent();
            cleanupFunction = componentInstance.init(container, 4, testOptions);

            // Find a corner cubie on the top face, e.g., initial float position (-1.5, 1.5, 1.5)
            const initialFloatPos = { x: -1.5, y: 1.5, z: 1.5 };
            const initialIntPos = getInitialIntPosition(initialFloatPos.x, initialFloatPos.y, initialFloatPos.z); // {x: -3, y: 3, z: 3}
            let targetCubieData = findCubieByInitialPosition(componentInstance, initialFloatPos.x, initialFloatPos.y, initialFloatPos.z);

            expect(targetCubieData).toBeDefined();
            expect(targetCubieData.mesh?.userData?.logicalPositionInt).toEqual(initialIntPos);

            // Rotate the top layer (integer layer y=3) by 90 degrees counter-clockwise (+1 direction)
            const integerLayerY = 3; // Top layer for size 4
            await componentInstance.rotateFace('y', integerLayerY, 1);

            // Expected new INTEGER position after +90 deg Y rotation (CCW): (z, y, -x)
            // initialInt: (-3, 3, 3) -> expectedInt: (3, 3, -(-3)) -> (3, 3, 3)
            const expectedIntPos = { x: 3, y: 3, z: 3 };

            // Verify the cubie's logicalPositionInt has updated
            // Re-find the cubie using its *initial* float position
            targetCubieData = findCubieByInitialPosition(componentInstance, initialFloatPos.x, initialFloatPos.y, initialFloatPos.z);
            expect(targetCubieData).toBeDefined();
            expect(targetCubieData.mesh?.userData?.logicalPositionInt).toEqual(expectedIntPos);
        });

         it('should correctly rotate an inner layer (y=1) on a size 4 cube', async () => {
             // Initialize size 4 cube
             cleanupFunction();
             componentInstance = createRubiksCubeComponent();
             cleanupFunction = componentInstance.init(container, 4, testOptions);

             // Find an inner face cubie, e.g., initial float position (0.5, 0.5, 1.5)
             const initialFloatPos = { x: 0.5, y: 0.5, z: 1.5 };
             const initialIntPos = getInitialIntPosition(initialFloatPos.x, initialFloatPos.y, initialFloatPos.z); // {x: 1, y: 1, z: 3}
             let targetCubieData = findCubieByInitialPosition(componentInstance, initialFloatPos.x, initialFloatPos.y, initialFloatPos.z);

             expect(targetCubieData).toBeDefined();
             expect(targetCubieData.mesh?.userData?.logicalPositionInt).toEqual(initialIntPos);


             // Rotate the inner layer (integer layer y=1) by 90 degrees clockwise (-1 direction)
             const integerLayerY = 1; // Inner layer for size 4
             await componentInstance.rotateFace('y', integerLayerY, -1);

             // Expected new INTEGER position after -90 deg Y rotation (CW): (-z, y, x)
             // initialInt: (1, 1, 3) -> expectedInt: (-3, 1, 1)
             const expectedIntPos = { x: -3, y: 1, z: 1 };

             // Verify the cubie's logicalPositionInt has updated
             targetCubieData = findCubieByInitialPosition(componentInstance, initialFloatPos.x, initialFloatPos.y, initialFloatPos.z);
             expect(targetCubieData).toBeDefined();
             expect(targetCubieData.mesh?.userData?.logicalPositionInt).toEqual(expectedIntPos);
         });

          it('should correctly rotate a face layer (y=2) on a size 3 cube (180 deg)', async () => {
             // Default 3x3 instance is already set up

             // Find a corner cubie on the top face, e.g., initial float position (-1, 1, 1)
             const initialFloatPos = { x: -1, y: 1, z: 1 };
             const initialIntPos = getInitialIntPosition(initialFloatPos.x, initialFloatPos.y, initialFloatPos.z); // {x: -2, y: 2, z: 2}
             let targetCubieData = findCubieByInitialPosition(componentInstance, initialFloatPos.x, initialFloatPos.y, initialFloatPos.z);

             expect(targetCubieData).toBeDefined();
             expect(targetCubieData.mesh?.userData?.logicalPositionInt).toEqual(initialIntPos);

             // Rotate the top layer (integer layer y=2) by 180 degrees (+2 direction)
             const integerLayerY = 2; // Top layer for size 3
             await componentInstance.rotateFace('y', integerLayerY, 2);

             // Expected new INTEGER position after +180 deg Y rotation: (-x, y, -z)
             // initialInt: (-2, 2, 2) -> expectedInt: (-(-2), 2, -2) -> (2, 2, -2)
             const expectedIntPos = { x: 2, y: 2, z: -2 };

             // Verify the cubie's logicalPositionInt has updated
             targetCubieData = findCubieByInitialPosition(componentInstance, initialFloatPos.x, initialFloatPos.y, initialFloatPos.z);
             expect(targetCubieData).toBeDefined();
             expect(targetCubieData.mesh?.userData?.logicalPositionInt).toEqual(expectedIntPos);
         });
    });

    describe('Shuffle and Solve (Integer Coordinates)', { timeout: 5000 }, () => {
        it('should shuffle the cube and change its integer logical state', async () => {
            // 1. Get initial FULL logical state
            const initialFullLogicalState = getLogicalStateInt(componentInstance.getState().cubies);

            // 2. Perform shuffle
            await componentInstance.shuffle();

            // 3. Get final FULL logical state
            const finalFullLogicalState = getLogicalStateInt(componentInstance.getState().cubies);

            // 4. Assert that the FULL integer logical state of the cube has changed
            expect(finalFullLogicalState).not.toEqual(initialFullLogicalState);

            // 5. Keep other checks
            const shuffleSequence = componentInstance.getState().shuffleSequence;
            expect(shuffleSequence.length).toBeGreaterThan(0);
            // Check sequence items structure { axis, layerIndex, direction }
            expect(shuffleSequence[0]).toHaveProperty('axis');
            expect(shuffleSequence[0]).toHaveProperty('layerIndex');
            expect(shuffleSequence[0]).toHaveProperty('direction');
            expect(shuffleSequence[0]).not.toHaveProperty('layer'); // Ensure float layer is not stored

            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);
        });

        it('should solve the cube back to its initial integer state after one shuffle', async () => {
            // Uses getLogicalStateInt, findCubieByInitialPosition, getInitialIntPosition

            const initialIntStateString = getLogicalStateInt(componentInstance.getState().cubies).join('|');
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            // --- Verification Setup (using a single cubie to ensure shuffle *did* change something before solve) ---
            const initialFloatPosRef = { x: -1, y: 1, z: 1 }; // Choose a corner cubie (float)
            const initialIntPosRef = getInitialIntPosition(initialFloatPosRef.x, initialFloatPosRef.y, initialFloatPosRef.z); // {x: -2, y: 2, z: 2}
            // --- End Verification Setup ---

            await componentInstance.shuffle(); // Shuffle first

            // Verify shuffle actually changed the state of at least one cubie (or the whole cube)
            const cubieDataAfterShuffle = findCubieByInitialPosition(componentInstance, initialFloatPosRef.x, initialFloatPosRef.y, initialFloatPosRef.z);
            expect(cubieDataAfterShuffle.mesh?.userData?.logicalPositionInt).not.toEqual(initialIntPosRef); // Check the specific cubie for change
            // Also verify the whole cube state changed for robustness
            const shuffledIntStateString = getLogicalStateInt(componentInstance.getState().cubies).join('|');
            expect(shuffledIntStateString).not.toEqual(initialIntStateString);
            // --- End Verification --


            expect(componentInstance.getState().shuffleSequence.length).toBeGreaterThan(0);
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            await componentInstance.solve(); // Solve

            const solvedIntStateString = getLogicalStateInt(componentInstance.getState().cubies).join('|');
            const shuffleSequenceAfterSolve = componentInstance.getState().shuffleSequence;
            const finalState = componentInstance.getState().currentCubeState;

            // Assert solved state matches initial state (using integer helper)
            expect(solvedIntStateString).toEqual(initialIntStateString);
            expect(shuffleSequenceAfterSolve.length).toBe(0);
            expect(finalState).toBe(CubeState.IDLE);
        });

        it('should return to solved integer state after multiple shuffles and a solve', async () => {
            // Uses findCubieByInitialPosition, getInitialIntPosition

            // Store initial INTEGER positions along with UUID
            const initialCubiesState = componentInstance.getState().cubies.map(c => ({
                initialIntPosition: JSON.parse(JSON.stringify(c.mesh.userData.logicalPositionInt)), // Deep copy initial INT position
                initialFloatPosition: JSON.parse(JSON.stringify(c.mesh.userData.initialPosition)), // Store float too for lookup
                id: c.mesh.uuid // Use UUID as a unique identifier
            }));
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            // Shuffle twice
            await componentInstance.shuffle();
            const sequenceLengthAfterFirstShuffle = componentInstance.getState().shuffleSequence.length;
            expect(sequenceLengthAfterFirstShuffle).toBeGreaterThan(0);
            await componentInstance.shuffle();
            const sequenceLengthAfterSecondShuffle = componentInstance.getState().shuffleSequence.length;
            expect(sequenceLengthAfterSecondShuffle).toBeGreaterThan(sequenceLengthAfterFirstShuffle);
            expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

            // Solve
            await componentInstance.solve();

            // Verify final state matches initial state using INTEGER positions
            const finalCubiesData = componentInstance.getState().cubies;
            const finalSequence = componentInstance.getState().shuffleSequence;
            const finalCubeState = componentInstance.getState().currentCubeState;

            expect(finalCubiesData.length).toEqual(initialCubiesState.length);

            // Check each cubie's final INTEGER logical position against its original initial INTEGER position
            finalCubiesData.forEach(finalCubieData => {
                const finalMesh = finalCubieData.mesh;
                // Find the corresponding initial data using the UUID
                const initialData = initialCubiesState.find(ic => ic.id === finalMesh.uuid);
                expect(initialData).toBeDefined();
                // Assert that the final INTEGER logical position matches the stored initial INTEGER position
                expect(finalMesh.userData.logicalPositionInt).toEqual(initialData.initialIntPosition);
            });

            expect(finalSequence.length).toBe(0); // Sequence should be cleared
            expect(finalCubeState).toBe(CubeState.IDLE);
        });

         it('solve should do nothing if the cube was not shuffled', async () => {
             // Uses getLogicalStateInt
             const initialIntStateString = getLogicalStateInt(componentInstance.getState().cubies).join('|');
             const initialSequence = componentInstance.getState().shuffleSequence;
             expect(initialSequence.length).toBe(0);
             expect(componentInstance.getState().currentCubeState).toBe(CubeState.IDLE);

             await componentInstance.solve(); // Call solve without prior shuffle

             const finalIntStateString = getLogicalStateInt(componentInstance.getState().cubies).join('|');
             const finalSequence = componentInstance.getState().shuffleSequence;
             const finalCubeState = componentInstance.getState().currentCubeState;

             expect(finalIntStateString).toEqual(initialIntStateString); // Compare integer states
             expect(finalSequence.length).toBe(0);
             expect(finalCubeState).toBe(CubeState.IDLE);
         });
    });

}); // End of main describe block
