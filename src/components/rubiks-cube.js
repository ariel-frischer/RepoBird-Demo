import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'lil-gui';
import TWEEN from '@tweenjs/tween.js';

// Standard Rubik's Cube face colors
const COLORS = {
    WHITE: 0xffffff,
    YELLOW: 0xffff00,
    BLUE: 0x0000ff,
    GREEN: 0x00ff00,
    RED: 0xff0000,
    ORANGE: 0xffa500,
    BLACK: 0x111111, // For internal faces
    GRAY: 0x888888, // For neutral internal faces if needed
};

const CUBIE_SIZE = 0.95; // Slightly smaller than 1 to create gaps
const CUBIE_GAP = 1.0 - CUBIE_SIZE; // Gap between cubies
const BASE_ROTATION_SPEED_MS = 300; // Base speed for face rotation animation
const BASE_SHUFFLE_DELAY_MS = 50; // Base small delay between shuffle moves

let isTestEnvironment = false; // Flag to indicate test environment

// Define Cube State Enum
const CubeState = {
    IDLE: 'idle',
    ROTATING: 'rotating', // For individual face rotations
    SHUFFLING: 'shuffling',
    SOLVING: 'solving',
    RESIZING: 'resizing'
};

function createRubiksCubeComponent() {
    let scene, camera, renderer, controls;
    let cubeGroup, cubies = [];
    let size = 3; // Default size
    let animationFrameId;
    let containerElement; // Store container reference
    let currentCubeState = CubeState.IDLE; // Initialize state
    let shuffleSequence = []; // Store the sequence of shuffle moves { axis, layerIndex, direction }

    // --- UI related variables ---
    let gui; // lil-gui instance
    let sizeController = { size: size }; // Object for lil-gui binding

    // --- Speed Control Variables ---
    let animationSpeedFactor = 1.0; // Initial speed factor
    let ROTATION_SPEED_MS; // Dynamic speed, calculated in init
    let SHUFFLE_DELAY_MS; // Dynamic delay, calculated in init

    // Helper function for delays
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const component = {
        init: function(container, initialSize = 3, options = {}) { // Added options parameter
            containerElement = container; // Store container
            size = initialSize;
            sizeController.size = size; // Sync controller object
            currentCubeState = CubeState.IDLE; // Reset state on init
            shuffleSequence = []; // Reset shuffle sequence

            isTestEnvironment = options.isTest === true; // Set the test environment flag

            // Calculate initial dynamic speeds
            ROTATION_SPEED_MS = BASE_ROTATION_SPEED_MS / animationSpeedFactor;
            SHUFFLE_DELAY_MS = BASE_SHUFFLE_DELAY_MS / animationSpeedFactor;

            // Scene Setup
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a1a);

            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            // Camera position adjusted in createCube -> adjustCameraAndControls
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            // Light position adjusted dynamically based on size later
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            scene.add(directionalLight);

            // OrbitControls
            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.target.set(0, 0, 0); // Target set in adjustCameraAndControls
            controls.update();

            // Cube Group
            cubeGroup = new THREE.Group();
            scene.add(cubeGroup);

            // Create the cube
            this.createCube(size); // This also adjusts camera, controls, and light

            // UI Controls (lil-gui) - Only add if not in test environment
            if (!isTestEnvironment) {
                gui = new GUI({ title: "Rubik's Cube Controls" }); // Use double quotes to avoid escaping
                gui.domElement.style.position = 'absolute'; // Ensure it's positioned correctly if container is relative/absolute
                gui.domElement.style.top = '10px';
                gui.domElement.style.right = '10px';
                containerElement.appendChild(gui.domElement); // Append GUI to the container

                // Shuffle Button
                gui.add(this, 'shuffle').name('Shuffle Cube');

                // Solve Button
                gui.add(this, 'solve').name('Solve Cube');

                // Size Controller
                gui.add(sizeController, 'size', 2, 5, 1) // Min 2, Max 5, Step 1
                    .name('Cube Size (N x N x N)')
                    .onChange(value => {
                        this.changeSize(value);
                    });

                // Speed Controller
                gui.add({ animationSpeedFactor }, 'animationSpeedFactor', 0.1, 5.0, 0.1)
                   .name('Animation Speed')
                   .onChange(value => {
                       animationSpeedFactor = value;
                       // Recalculate dynamic speeds
                       ROTATION_SPEED_MS = BASE_ROTATION_SPEED_MS / animationSpeedFactor;
                       SHUFFLE_DELAY_MS = BASE_SHUFFLE_DELAY_MS / animationSpeedFactor;
                   });
            }

            // Resize listener
            window.addEventListener('resize', this.onWindowResize);

            // Animation Loop
            this.animate();

            return this.cleanup; // Return cleanup function
        },

        createCube: function(newSize) {
            // Note: This function now assumes the cube has been cleared before calling.
            // It primarily focuses on building the new cube structure.
            size = newSize; // Update the internal size state

            const offset = (size - 1) / 2; // Float offset (e.g., 1.0 for 3x3, 1.5 for 4x4)

            for (let x_float = -offset; x_float <= offset; x_float += 1) {
                for (let y_float = -offset; y_float <= offset; y_float += 1) {
                    for (let z_float = -offset; z_float <= offset; z_float += 1) {
                        // Skip the center cubie for odd-sized cubes (purely internal)
                        if (size % 2 !== 0 && x_float === 0 && y_float === 0 && z_float === 0) {
                            continue;
                        }
                         // Correctly skip the inner core for even sizes
                         const innerBoundary = (size / 2) - 1; // e.g., for size 4, this is 1. Skip if abs(coord) <= 1 (i.e., is +/- 0.5)
                         if (size % 2 === 0 &&
                             Math.abs(x_float) <= innerBoundary &&
                             Math.abs(y_float) <= innerBoundary &&
                             Math.abs(z_float) <= innerBoundary) {
                             continue; // Skip the 2x2x2 core for 4x4x4, etc.
                         }

                        const cubieMesh = this.createCubie(x_float, y_float, z_float, size);
                        cubeGroup.add(cubieMesh);
                        // Store mesh reference in cubies array (logical positions are now primarily in userData)
                        cubies.push({ mesh: cubieMesh });
                    }
                }
            }
             // Adjust camera distance, controls target, and light based on new size
            this.adjustCameraControlsAndLight(size);
        },

        createCubie: function(x_float, y_float, z_float, currentSize) {
            const offset = (currentSize - 1) / 2;
             // Integer coordinates: - (N-1) to +(N-1) in steps of 2
             // E.g., N=3: -2, 0, 2
             // E.g., N=4: -3, -1, 1, 3
            const x_int = Math.round(x_float * 2);
            const y_int = Math.round(y_float * 2);
            const z_int = Math.round(z_float * 2);

            const materials = [
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Right (+x) Index 0
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Left (-x)  Index 1
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Top (+y)   Index 2
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Bottom (-y)Index 3
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Front (+z) Index 4
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK })  // Back (-z)  Index 5
            ];

            // Assign face colors based on position (using float offset for boundaries)
            const tolerance = 0.1; // Tolerance for float boundary checks
            if (x_float >= offset - tolerance) materials[0].color.setHex(COLORS.RED);     // Right face
            if (x_float <= -offset + tolerance) materials[1].color.setHex(COLORS.ORANGE); // Left face
            if (y_float >= offset - tolerance) materials[2].color.setHex(COLORS.WHITE);   // Top face
            if (y_float <= -offset + tolerance) materials[3].color.setHex(COLORS.YELLOW); // Bottom face
            if (z_float >= offset - tolerance) materials[4].color.setHex(COLORS.BLUE);    // Front face
            if (z_float <= -offset + tolerance) materials[5].color.setHex(COLORS.GREEN);  // Back face

            const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
            const mesh = new THREE.Mesh(geometry, materials);
            // Set visual position using float coordinates multiplied by spacing
            mesh.position.set(x_float * (CUBIE_SIZE + CUBIE_GAP), y_float * (CUBIE_SIZE + CUBIE_GAP), z_float * (CUBIE_SIZE + CUBIE_GAP));
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Store initial float pos, current float pos, and current integer pos in userData
            mesh.userData = {
                initialPosition: { x: x_float, y: y_float, z: z_float }, // Initial float position (won't change)
                logicalPosition: { x: x_float, y: y_float, z: z_float }, // Current float logical position (updated for compatibility/debugging)
                logicalPositionInt: { x: x_int, y: y_int, z: z_int }, // Current INTEGER logical position
                isCubie: true
            };

            return mesh;
        },

        clearCube: function() {
             if (cubeGroup) {
                // Remove all children from the group and dispose them
                while (cubeGroup.children.length > 0) {
                    const mesh = cubeGroup.children[0];
                    cubeGroup.remove(mesh);
                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    if (mesh.material) {
                         if (Array.isArray(mesh.material)) {
                            mesh.material.forEach(mat => mat.dispose());
                        } else {
                            mesh.material.dispose();
                        }
                    }
                }
            }
            cubies = []; // Reset the internal state array
            shuffleSequence = []; // Clear shuffle sequence when cube changes
        },

        adjustCameraControlsAndLight: function(currentSize) {
             if (camera && controls && scene) {
                // Adjust camera position based on size
                const camDistFactor = 1.8; // Factor to scale camera distance
                camera.position.set(currentSize * camDistFactor, currentSize * camDistFactor, currentSize * camDistFactor * 1.2);
                camera.lookAt(0, 0, 0); // Ensure camera looks at the center

                // Ensure OrbitControls target is the center of the cube
                controls.target.set(0, 0, 0);
                controls.update(); // Apply changes

                // Adjust directional light position based on size
                const light = scene.getObjectByProperty('isDirectionalLight', true);
                if (light) {
                    light.position.set(currentSize * 2, currentSize * 3, currentSize * 2.5);
                    // Optionally adjust shadow camera if needed
                    // light.shadow.camera.left = -currentSize * 2;
                    // light.shadow.camera.right = currentSize * 2;
                    // ... etc.
                }
            }
        },

        animate: function() {
            animationFrameId = requestAnimationFrame(this.animate.bind(this));
            TWEEN.update(); // Update animations
            if (controls) controls.update(); // Required for damping
            if (renderer && scene && camera) renderer.render(scene, camera);
        },

        onWindowResize: function() {
            if (camera && renderer && containerElement) {
                camera.aspect = containerElement.clientWidth / containerElement.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
            }
        },

        // --- Helper to update INTEGER logical coordinates after a rotation ---
        // This is primarily for the test environment path where no animation occurs.
        _updateLogicalCoordinatesInt: function(cubieData, axis, direction) {
            const lpInt = cubieData.mesh.userData.logicalPositionInt;
            let x = lpInt.x;
            let y = lpInt.y;
            let z = lpInt.z;
            let newX = x, newY = y, newZ = z;

            // Normalize direction to handle 180 degrees etc.
            // direction: +1 (CCW 90), -1 (CW 90), +2 (180), -2 (180)
            // We treat +2 as two +1 steps, -2 as two -1 steps.
            let numSteps = 0;
            let stepDirection = 0;
            if (direction === 1 || direction === -3) { // +90 CCW
                numSteps = 1;
                stepDirection = 1;
            } else if (direction === -1 || direction === 3) { // -90 CW
                numSteps = 1;
                stepDirection = -1;
            } else if (direction === 2 || direction === -2) { // 180
                numSteps = 2;
                stepDirection = Math.sign(direction) || 1; // Use sign, default to +1 (CCW steps)
            } else if (direction === 0) {
                 numSteps = 0;
            } else {
                console.warn(`Unhandled rotation direction: ${direction}. Treating as no rotation.`);
                numSteps = 0;
            }


            for (let i = 0; i < numSteps; ++i) {
                const currentX = newX;
                const currentY = newY;
                const currentZ = newZ;

                if (axis === 'x') {
                    // Right-Hand Rule: Point thumb along +X. Fingers curl Y -> Z -> -Y -> -Z
                    // +90 CCW (stepDirection > 0): (x, -z, y)
                    // -90 CW  (stepDirection < 0): (x, z, -y)
                    if (stepDirection > 0) { // CCW
                        newY = -currentZ;
                        newZ = currentY;
                    } else { // CW
                        newY = currentZ;
                        newZ = -currentY;
                    }
                } else if (axis === 'y') {
                    // Right-Hand Rule: Point thumb along +Y. Fingers curl Z -> X -> -Z -> -X
                    // +90 CCW (stepDirection > 0): (z, y, -x)
                    // -90 CW  (stepDirection < 0): (-z, y, x)
                    if (stepDirection > 0) { // CCW
                        newX = currentZ;
                        newZ = -currentX;
                    } else { // CW
                        newX = -currentZ;
                        newZ = currentX;
                    }
                } else if (axis === 'z') {
                    // Right-Hand Rule: Point thumb along +Z. Fingers curl X -> Y -> -X -> -Y
                    // +90 CCW (stepDirection > 0): (-y, x, z)
                    // -90 CW  (stepDirection < 0): (y, -x, z)
                    if (stepDirection > 0) { // CCW
                        newX = -currentY;
                        newY = currentX;
                    } else { // CW
                        newX = currentY;
                        newY = -currentX;
                    }
                }
            }

            // Update the INTEGER logical state on the mesh itself
            if (cubieData.mesh && cubieData.mesh.userData && cubieData.mesh.userData.logicalPositionInt) {
                cubieData.mesh.userData.logicalPositionInt.x = newX;
                cubieData.mesh.userData.logicalPositionInt.y = newY;
                cubieData.mesh.userData.logicalPositionInt.z = newZ;

                // Also update the float logical position for compatibility/debugging (derived from int)
                cubieData.mesh.userData.logicalPosition.x = newX / 2.0;
                cubieData.mesh.userData.logicalPosition.y = newY / 2.0;
                cubieData.mesh.userData.logicalPosition.z = newZ / 2.0;

            } else {
                 console.error("Missing userData or logicalPositionInt during _updateLogicalCoordinatesInt", cubieData.mesh);
            }
        },

        // rotateFace now expects an INTEGER layer coordinate
        rotateFace: async function(axis, integerLayer, direction, parentState = null) {
            const targetState = parentState || CubeState.ROTATING;
            const finalState = parentState || CubeState.IDLE;

            // Allow rotation only if IDLE or if initiated by the correct parent process (shuffle/solve)
            if (currentCubeState !== CubeState.IDLE && currentCubeState !== parentState) {
                console.warn(`Rotation blocked on [${axis}, layerInt=${integerLayer}, dir=${direction}]: Cube state is ${currentCubeState}, expected IDLE or ${parentState}`);
                return isTestEnvironment ? Promise.resolve() : Promise.reject(`Rotation Blocked: State is ${currentCubeState}`);
            }
            currentCubeState = targetState; // Set to ROTATING or the parent state (SHUFFLING/SOLVING)

            // --- REMOVED: Float layer validation and tolerance ---
            // const offset = (size - 1) / 2;
            // const tolerance = 0.1;
            // if (layer < -offset - tolerance || layer > offset + tolerance) { ... }

            // Filter cubies based on INTEGER logical position
            const layerCubiesData = cubies.filter(cubieData => {
                const posInt = cubieData.mesh?.userData?.logicalPositionInt;
                // Ensure posInt exists and the axis matches the integerLayer
                return posInt && posInt[axis] === integerLayer;
            });

            if (layerCubiesData.length === 0 && size > 1) {
                // This might happen legitimately for center layers on even cubes, but log anyway
                console.warn(`${isTestEnvironment ? 'Test Env:' : 'Animation:'} No cubies found for integer layer ${integerLayer} on axis ${axis} (Size ${size}).`);
            }

            // If no cubies to rotate, reset state and resolve/return immediately
            if (layerCubiesData.length === 0) {
                currentCubeState = finalState;
                return Promise.resolve();
            }

            // --- Test Environment Path ---
            if (isTestEnvironment) {
                layerCubiesData.forEach(cubieData => {
                    // Call the INT version directly
                    this._updateLogicalCoordinatesInt(cubieData, axis, direction);
                });
                currentCubeState = finalState; // Reset to IDLE or parent state
                return Promise.resolve(); // Rotation is instantaneous
            }

            // --- Normal Browser/Animation Path ---
            const pivotGroup = new THREE.Group();
            pivotGroup.name = "pivotGroup";
            scene.add(pivotGroup);

            // Important: Use the mesh's world position before attaching to pivot
            // This assumes the cubeGroup itself is at the origin (0,0,0)
            layerCubiesData.forEach(cubieData => {
                 const mesh = cubieData.mesh;
                 // Convert mesh's world position to pivot's local space (which is world space initially)
                 pivotGroup.attach(mesh); // Preserves world position
            });


            const angle = (Math.PI / 2) * direction;

            return new Promise((resolve) => { // No reject needed here, handled by state check earlier
                new TWEEN.Tween(pivotGroup.rotation)
                    .to({ [axis]: pivotGroup.rotation[axis] + angle }, ROTATION_SPEED_MS)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onComplete(() => {
                        pivotGroup.updateMatrixWorld(); // Ensure pivot matrix is up-to-date

                        layerCubiesData.forEach(cubieData => {
                            const mesh = cubieData.mesh;
                            // Get world position *after* rotation within the pivot
                            const worldPosition = new THREE.Vector3();
                            mesh.getWorldPosition(worldPosition);

                             // Detach from pivot and re-attach to cubeGroup (main scene graph)
                             // Use attach to preserve the new world position
                            cubeGroup.attach(mesh);

                            // Update INTEGER logical position based on the *final mesh position*
                            if (mesh.userData && mesh.userData.logicalPositionInt) {
                                // Infer logical position from visual position
                                // Divide by spacing (CUBIE_SIZE + CUBIE_GAP = 1.0) and convert to integer coords
                                const newFloatX = mesh.position.x / (CUBIE_SIZE + CUBIE_GAP);
                                const newFloatY = mesh.position.y / (CUBIE_SIZE + CUBIE_GAP);
                                const newFloatZ = mesh.position.z / (CUBIE_SIZE + CUBIE_GAP);

                                mesh.userData.logicalPositionInt.x = Math.round(newFloatX * 2);
                                mesh.userData.logicalPositionInt.y = Math.round(newFloatY * 2);
                                mesh.userData.logicalPositionInt.z = Math.round(newFloatZ * 2);

                                // Also update the float logical position for compatibility/debugging
                                mesh.userData.logicalPosition.x = newFloatX;
                                mesh.userData.logicalPosition.y = newFloatY;
                                mesh.userData.logicalPosition.z = newFloatZ;
                            } else {
                                console.error("Missing userData or logicalPositionInt during TWEEN update", mesh);
                            }
                            // --- REMOVED: Direct call to _updateLogicalCoordinates ---
                            // this._updateLogicalCoordinates(cubieData, axis, direction);
                        });

                        scene.remove(pivotGroup); // Clean up the pivot
                        currentCubeState = finalState; // Reset to IDLE or parent state
                        resolve(); // Resolve the promise when animation finishes
                    })
                    // Pass undefined if animation loop running, otherwise 0 to start it
                    .start(animationFrameId !== null ? undefined : 0);
            });
        },

        // Helper function to apply a move specification { axis, layerIndex, direction }
        applyMove: async function(moveSpec, storeInSequence = false, parentState = null) {
            const { axis, layerIndex, direction } = moveSpec;

             // Calculate the INTEGER layer coordinate from the layerIndex
             // Integer layers: -(N-1) to +(N-1) in steps of 2
             // layerIndex: 0 to N-1
            const integerLayer = -(size - 1) + (layerIndex * 2);

            if (storeInSequence) {
                 shuffleSequence.push({ axis, layerIndex, direction }); // Store index, not calculated layer
            }

            try {
                // Pass the calculated INTEGER layer and parentState down to rotateFace
                await this.rotateFace(axis, integerLayer, direction, parentState);
            } catch (error) {
                // Log error but don't rethrow if it's just a state-blocking warning
                if (typeof error === 'string' && error.startsWith('Rotation Blocked:')) {
                     console.warn(`Move application skipped: ${error}`);
                } else {
                    console.error(`Error during move application (Axis: ${axis}, LayerIndex: ${layerIndex} -> IntLayer: ${integerLayer}, Dir: ${direction}, Parent: ${parentState}):`, error);
                    throw error; // Rethrow actual errors
                }
            }
        },

        shuffle: async function() {
            // Check if cube is busy (not IDLE)
            if (currentCubeState !== CubeState.IDLE) {
                console.warn(`Cannot shuffle: Cube state is ${currentCubeState}.`);
                return;
            }

            console.log("Starting shuffle...");
            currentCubeState = CubeState.SHUFFLING; // Set state
            // shuffleSequence = []; // Keep accumulating sequence across multiple shuffles if desired

            try {
                const numMoves = size * 10; // Number of random moves
                const axes = ['x', 'y', 'z'];
                const directions = [-1, 1]; // Clockwise (-1), Counter-Clockwise (1)

                for (let i = 0; i < numMoves; i++) {
                    const axis = axes[Math.floor(Math.random() * axes.length)];
                    const layerIndex = Math.floor(Math.random() * size); // Index from 0 to size-1
                    const direction = directions[Math.floor(Math.random() * directions.length)];

                    const moveSpec = { axis, layerIndex, direction };

                    if (isTestEnvironment) {
                        const integerLayer = -(size - 1) + (layerIndex * 2); // Calculate for logging
                        console.log(`[Test Env] Shuffle Move ${i+1}/${numMoves}: spec=${JSON.stringify(moveSpec)}, calculatedIntLayer=${integerLayer}`);
                    }

                    // Apply move using the moveSpec, passing SHUFFLING state
                    await this.applyMove(moveSpec, true, CubeState.SHUFFLING);

                    if (!isTestEnvironment) {
                        // Use the DYNAMIC delay for visual shuffling
                        await delay(SHUFFLE_DELAY_MS);
                    }
                     // Check if state changed unexpectedly
                     if (currentCubeState !== CubeState.SHUFFLING) {
                        console.warn("Shuffle interrupted by state change.");
                        break;
                    }
                }
                 console.log("Shuffle potentially complete (check state).");

            } catch (error) {
                 console.error("Shuffle stopped due to error during move application:", error);
                 // State will be reset in finally block
            } finally {
                // Ensure state is reset regardless of success or failure
                console.log(`Shuffle finished, resetting state from ${currentCubeState} to IDLE.`);
                currentCubeState = CubeState.IDLE;
            }
        },

        solve: async function() {
            // Check if cube is busy (not IDLE)
            if (currentCubeState !== CubeState.IDLE) {
                console.warn(`Cannot solve: Cube state is ${currentCubeState}.`);
                return;
            }
            if (!shuffleSequence || shuffleSequence.length === 0) {
                console.log("Nothing to solve (no shuffle sequence recorded).");
                return;
            }

            console.log("Starting solve...");
            currentCubeState = CubeState.SOLVING; // Set state
            const movesToReverse = [...shuffleSequence]; // Copy sequence
            let solveCompleted = true;

            try {
                for (let i = movesToReverse.length - 1; i >= 0; i--) {
                    const originalMove = movesToReverse[i];
                    // Create the reversed move spec (same axis, same layerIndex, opposite direction)
                    const reversedMoveSpec = {
                        axis: originalMove.axis,
                        layerIndex: originalMove.layerIndex,
                        direction: -originalMove.direction
                    };

                    if (isTestEnvironment) {
                         const integerLayer = -(size - 1) + (reversedMoveSpec.layerIndex * 2); // Calculate for logging
                        console.log(`[Test Env] Solve Move ${movesToReverse.length - i}/${movesToReverse.length}: reversedSpec=${JSON.stringify(reversedMoveSpec)}, calculatedIntLayer=${integerLayer}`);
                    }

                    // Apply reversed move, passing SOLVING state, DO NOT store in sequence
                    await this.applyMove(reversedMoveSpec, false, CubeState.SOLVING);

                    if (!isTestEnvironment) {
                        // Use the DYNAMIC delay for visual solving
                        await delay(SHUFFLE_DELAY_MS);
                    }
                     // Check if state changed unexpectedly
                     if (currentCubeState !== CubeState.SOLVING) {
                        console.warn("Solve interrupted by state change.");
                        solveCompleted = false;
                        break;
                    }
                }

                if (solveCompleted) {
                    console.log("Solve process completed.");
                    shuffleSequence = []; // Clear sequence only on successful completion
                } else {
                    console.warn("Solve interrupted, shuffle sequence not cleared.");
                }

            } catch (error) {
                console.error("Solve stopped due to error during move application:", error);
                solveCompleted = false; // Mark as incomplete on error
                 // State will be reset in finally block
            } finally {
                 // Ensure state is reset regardless of success or failure
                 console.log(`Solve finished (Completed: ${solveCompleted}), resetting state from ${currentCubeState} to IDLE.`);
                 currentCubeState = CubeState.IDLE;
            }
        },

        changeSize: function(newSize) {
            // 1. Input Validation (unchanged)
            if (!Number.isInteger(newSize) || newSize < 2 || newSize > 5) {
                console.error(`Invalid size requested: ${newSize}. Size must be an integer between 2 and 5.`);
                if (gui && sizeController.size !== size) {
                    sizeController.size = size;
                    gui.controllers.forEach(c => c.property === 'size' && c.updateDisplay());
                }
                return;
            }

            // 2. Check if size is actually changing (unchanged)
            if (newSize === size) {
                console.log(`Cube is already size ${newSize}. No change needed.`);
                return;
            }

            // 3. Check if cube is busy (not IDLE) - skip check in test env
            if (currentCubeState !== CubeState.IDLE && !isTestEnvironment) {
                console.warn(`Cannot change size: Cube state is ${currentCubeState}.`);
                // Revert UI controller value if change was triggered by UI
                if (gui && sizeController.size !== size) {
                    sizeController.size = size;
                    gui.controllers.forEach(c => c.property === 'size' && c.updateDisplay());
                }
                return; // Prevent size change during other operations
            }

            console.log(`Changing size from ${size}x${size}x${size} to ${newSize}x${newSize}x${newSize}...`);
            currentCubeState = CubeState.RESIZING; // Set state

            try {
                // 4. Cleanup Existing Cube Meshes and State
                this.clearCube(); // This already removes meshes and clears cubies/shuffleSequence

                // 5. Create New Cube
                this.createCube(newSize); // This builds the new cube and adjusts camera/controls/light

                // 6. Update internal state and potentially UI *after* cube creation succeeds
                // `createCube` already sets `size = newSize`
                if (sizeController.size !== size) { // Check if the controller is out of sync
                    sizeController.size = size;
                    if (gui) {
                        gui.controllers.forEach(c => c.property === 'size' && c.updateDisplay());
                    }
                }
                console.log(`Size change to ${newSize}x${newSize}x${newSize} complete.`);

            } catch (error) {
                 console.error("Error during size change:", error);
                 // Attempt to revert size state if possible? Difficult.
                 // State will be reset in finally block
            } finally {
                 // Ensure state is reset regardless of success or failure
                 console.log(`Size change finished, resetting state from ${currentCubeState} to IDLE.`);
                 currentCubeState = CubeState.IDLE;
            }
        },

        cleanup: function() {
            console.log("Cleaning up Rubik's Cube component...");
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', component.onWindowResize); // Use bound reference

            // Clean up tweens specifically
            TWEEN.removeAll();

            if (gui) {
                if (gui.domElement && gui.domElement.parentElement) {
                    try {
                        gui.domElement.parentElement.removeChild(gui.domElement);
                    } catch (e) {
                        console.warn("Could not remove GUI DOM element during cleanup:", e);
                    }
                }
                gui.destroy();
                gui = null;
            }

            if (controls) {
                controls.dispose();
                controls = null;
            }

            component.clearCube(); // Use component reference to clear meshes/state
            if (scene && cubeGroup) {
                 scene.remove(cubeGroup);
                 cubeGroup = null;
            }

             if (scene) {
                const pivot = scene.getObjectByName("pivotGroup");
                if (pivot) scene.remove(pivot);

                scene.traverse(object => {
                     if (object.geometry) object.geometry.dispose();
                     if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else if (object.material.dispose) {
                             object.material.dispose();
                        }
                    }
                });
                scene = null;
             }

            if (renderer) {
                renderer.dispose();
                if (renderer.domElement && containerElement && containerElement.contains(renderer.domElement)) {
                    try {
                       containerElement.removeChild(renderer.domElement);
                    } catch (e) {
                        console.warn("Could not remove renderer DOM element during cleanup:", e);
                    }
                }
                renderer = null;
            }

            camera = null;
            // Reset internal state variables
            cubies = [];
            containerElement = null;
            animationFrameId = null;
            currentCubeState = CubeState.IDLE; // Reset state
            shuffleSequence = [];
            sizeController = { size: 3 }; // Reset controller object
            size = 3; // Reset internal size state
            isTestEnvironment = false; // Reset flag on cleanup
             // Reset speed control variables
            animationSpeedFactor = 1.0;
            ROTATION_SPEED_MS = undefined; // Indicate they need recalculation on next init
            SHUFFLE_DELAY_MS = undefined;
            console.log("Rubik's Cube component cleanup complete.");
        },

        // --- Test Helper Method ---
        // Expose internal state for testing purposes
        getState: function() {
            return {
                size,
                currentCubeState,
                // Return the cubies array containing objects with mesh references
                // Tests will access mesh.userData for positions (float and int)
                cubies: cubies,
                shuffleSequence: [...shuffleSequence], // Return copy of sequence { axis, layerIndex, direction }
                currentRotationSpeed: ROTATION_SPEED_MS,
                currentShuffleDelay: SHUFFLE_DELAY_MS,
                animationSpeedFactor: animationSpeedFactor
            };
        }
    };

     // Bind methods that might lose context
    component.cleanup = component.cleanup.bind(component);
    component.onWindowResize = component.onWindowResize.bind(component);
    component.shuffle = component.shuffle.bind(component);
    component.solve = component.solve.bind(component);
    component.changeSize = component.changeSize.bind(component);
    component.getState = component.getState.bind(component);
    component.applyMove = component.applyMove.bind(component);
    component._updateLogicalCoordinatesInt = component._updateLogicalCoordinatesInt.bind(component); // Renamed
    component.rotateFace = component.rotateFace.bind(component);
    component.createCube = component.createCube.bind(component);
    component.createCubie = component.createCubie.bind(component); // Bind createCubie
    component.clearCube = component.clearCube.bind(component);
    component.adjustCameraControlsAndLight = component.adjustCameraControlsAndLight.bind(component); // Renamed
    component.animate = component.animate.bind(component);

    return component; // Return the component object
}

// Export a function that creates and returns the component instance
// Modified to pass options through
function init(container, initialSize = 3, options = {}) {
    const rubiksCubeComponent = createRubiksCubeComponent();
    // Return the cleanup function provided by the component's init method
    return rubiksCubeComponent.init(container, initialSize, options);
}

// Export the creator function for testing and potentially direct use
export { init, createRubiksCubeComponent };
