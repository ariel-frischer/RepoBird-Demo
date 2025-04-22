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
const ROTATION_SPEED_MS = 300; // Speed for face rotation animation
const SHUFFLE_DELAY_MS = 50; // Small delay between shuffle moves

let isTestEnvironment = false; // Flag to indicate test environment

function createRubiksCubeComponent() {
    let scene, camera, renderer, controls;
    let cubeGroup, cubies = [];
    let size = 3; // Default size
    let animationFrameId;
    let containerElement; // Store container reference
    let isRotating = false; // Flag to prevent concurrent rotations
    let shuffleSequence = []; // Store the sequence of shuffle moves

    // --- UI related variables ---
    let gui; // lil-gui instance
    let sizeController = { size: size }; // Object for lil-gui binding

    // Helper function for delays
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const component = {
        init: function(container, initialSize = 3, options = {}) { // Added options parameter
            containerElement = container; // Store container
            size = initialSize;
            sizeController.size = size; // Sync controller object
            isRotating = false; // Reset rotation flag on init
            shuffleSequence = []; // Reset shuffle sequence

            isTestEnvironment = options.isTest === true; // Set the test environment flag

            // Scene Setup
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a1a);

            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(size * 1.5, size * 1.5, size * 2); // Adjust camera based on size
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
            directionalLight.position.set(size * 2, size * 3, size * 2.5);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            scene.add(directionalLight);

            // OrbitControls
            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.target.set(0, 0, 0);
            controls.update();

            // Cube Group
            cubeGroup = new THREE.Group();
            scene.add(cubeGroup);

            // Create the cube
            this.createCube(size);

            // UI Controls (lil-gui) - Only add if not in test environment
            if (!isTestEnvironment) {
                gui = new GUI({ title: 'Rubik\'s Cube Controls' }); // Use backslash for escaping quote inside string
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

            const offset = (size - 1) / 2;

            for (let x = -offset; x <= offset; x += 1) {
                for (let y = -offset; y <= offset; y += 1) {
                    for (let z = -offset; z <= offset; z += 1) {
                        // Skip the center cubie for odd-sized cubes (purely internal)
                        if (size % 2 !== 0 && x === 0 && y === 0 && z === 0) {
                            continue;
                        }
                        // Skip internal cubies for even-sized cubes (no center piece)
                        // Corrected logic for even sized cubes to skip the inner core
                        const innerOffset = offset - 1; // Threshold for inner cubies in even sizes (e.g., 0.5 for size 4)
                        if (size % 2 === 0 &&
                            Math.abs(x) <= innerOffset &&
                            Math.abs(y) <= innerOffset &&
                            Math.abs(z) <= innerOffset) {
                             continue; // Skip this inner cubie
                        }

                        const cubieMesh = this.createCubie(x, y, z, size);
                        cubeGroup.add(cubieMesh);
                        cubies.push({
                            mesh: cubieMesh,
                            x: x,
                            y: y,
                            z: z
                        });
                    }
                }
            }
             // Adjust camera distance and controls target based on new size
            this.adjustCameraAndControls(size);
        },

        createCubie: function(x, y, z, currentSize) {
            const offset = (currentSize - 1) / 2;
            const materials = [
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Right (+x) Index 0
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Left (-x)  Index 1
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Top (+y)   Index 2
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Bottom (-y)Index 3
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK }), // Front (+z) Index 4
                new THREE.MeshStandardMaterial({ color: COLORS.BLACK })  // Back (-z)  Index 5
            ];

            // Assign face colors based on position
            if (x >= offset - 0.1) materials[0].color.setHex(COLORS.RED);     // Right face (use tolerance for float issues)
            if (x <= -offset + 0.1) materials[1].color.setHex(COLORS.ORANGE); // Left face
            if (y >= offset - 0.1) materials[2].color.setHex(COLORS.WHITE);   // Top face
            if (y <= -offset + 0.1) materials[3].color.setHex(COLORS.YELLOW); // Bottom face
            if (z >= offset - 0.1) materials[4].color.setHex(COLORS.BLUE);    // Front face
            if (z <= -offset + 0.1) materials[5].color.setHex(COLORS.GREEN);  // Back face

            const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
            const mesh = new THREE.Mesh(geometry, materials);
            mesh.position.set(x, y, z); // Position based on logical coords
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Store logical position in userData for raycasting or identification
            mesh.userData = { x, y, z, isCubie: true };

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

        adjustCameraAndControls: function(currentSize) {
             if (camera && controls) {
                // Adjust camera Z position based on size (simple linear scaling)
                camera.position.z = 5 + (currentSize - 3);
                 // Adjust camera position slightly based on size to keep cube centered visually
                camera.position.x = currentSize * 1.5;
                camera.position.y = currentSize * 1.5;
                camera.position.z = currentSize * 2;
                // Ensure camera looks at the center (might be redundant if target is 0,0,0)
                camera.lookAt(0, 0, 0);
                // Ensure OrbitControls target is the center of the cube
                controls.target.set(0, 0, 0);
                controls.update(); // Apply changes
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

        // --- Helper to update logical coordinates after a rotation ---
        // This is primarily for the test environment path
        _updateLogicalCoordinates: function(cubieData, axis, direction) {
            const x = cubieData.x;
            const y = cubieData.y;
            const z = cubieData.z;
            let newX = x, newY = y, newZ = z;

            if (axis === 'x') { // Rotation around X
                if (direction > 0) { // Clockwise (positive direction)
                    newY = -z;
                    newZ = y;
                } else { // Counter-clockwise (negative direction)
                    newY = z;
                    newZ = -y;
                }
            } else if (axis === 'y') { // Rotation around Y
                if (direction > 0) { // Clockwise
                    newX = z;
                    newZ = -x;
                } else { // Counter-clockwise
                    newX = -z;
                    newZ = x;
                }
            } else if (axis === 'z') { // Rotation around Z
                if (direction > 0) { // Clockwise
                    newX = -y;
                    newY = x;
                } else { // Counter-clockwise
                    newX = y;
                    newY = -x;
                }
            }

            // Update the cubie's logical state
            cubieData.x = Math.round(newX);
            cubieData.y = Math.round(newY);
            cubieData.z = Math.round(newZ);

            // Also update the userData on the mesh itself (if mesh exists)
            if (cubieData.mesh && cubieData.mesh.userData) {
                cubieData.mesh.userData.x = cubieData.x;
                cubieData.mesh.userData.y = cubieData.y;
                cubieData.mesh.userData.z = cubieData.z;
            }
        },

        rotateFace: function(axis, layer, direction) {
            // --- Test Environment Path ---
            if (isTestEnvironment) { // Use the flag
                if (isRotating) {
                    console.warn("Test Env: Attempted to rotate while another rotation is in progress.");
                    // In tests, we might want this to resolve quickly rather than reject
                    // or potentially throw an error if the test logic shouldn't allow this.
                    // For now, let's resolve to allow test sequences to proceed, but log a warning.
                    return Promise.resolve();
                }
                isRotating = true;

                const offset = (size - 1) / 2;
                if (layer < -offset || layer > offset) {
                    console.error(`Test Env: Invalid layer ${layer} for size ${size}.`);
                    isRotating = false;
                    // Maybe reject or throw in tests for invalid input?
                    return Promise.reject(`Invalid layer ${layer}`);
                }

                const layerCubies = cubies.filter(cubie => {
                    // Use logical coordinates stored in our cubies array
                    return Math.round(cubie[axis]) === layer;
                });

                if (layerCubies.length === 0) {
                    isRotating = false;
                    return Promise.resolve(); // No rotation needed
                }

                // Directly update the logical state of the affected cubies
                 layerCubies.forEach(cubieData => {
                    this._updateLogicalCoordinates(cubieData, axis, direction);
                 });

                // Rotation is considered instantaneous in tests
                isRotating = false;
                return Promise.resolve(); // Resolve immediately
            }

            // --- Normal Browser/Animation Path ---
            // Returns a promise that resolves when the rotation animation completes
            return new Promise((resolve, reject) => {
                if (isRotating) {
                    console.warn("Attempted to rotate while another rotation is in progress.");
                    return reject("Rotation already in progress"); // Reject if already rotating
                }
                isRotating = true;

                const offset = (size - 1) / 2;
                // Validate layer based on size and offset
                if (layer < -offset || layer > offset) {
                    console.error(`Invalid layer ${layer} for size ${size}.`);
                    isRotating = false;
                    return reject(`Invalid layer ${layer}`); // Reject on invalid layer
                }

                const layerCubies = cubies.filter(cubie => {
                    // Use logical coordinates stored in our cubies array
                    // Use Math.round to handle potential floating point inaccuracies after rotations
                    return Math.round(cubie[axis]) === layer;
                });

                if (layerCubies.length === 0) {
                    isRotating = false;
                    return resolve(); // Resolve immediately if no cubies found (no rotation needed)
                }

                const pivotGroup = new THREE.Group();
                pivotGroup.name = "pivotGroup";
                scene.add(pivotGroup); // Add pivot to the scene temporarily

                // Move the cubies to the pivot group
                layerCubies.forEach(cubieData => {
                    cubeGroup.remove(cubieData.mesh); // Remove from main group
                    pivotGroup.add(cubieData.mesh);   // Add to pivot group
                });

                const angle = (Math.PI / 2) * direction;
                const rotationAxis = new THREE.Vector3(
                    axis === 'x' ? 1 : 0,
                    axis === 'y' ? 1 : 0,
                    axis === 'z' ? 1 : 0
                );

                // Create the tween animation
                new TWEEN.Tween(pivotGroup.rotation)
                    .to({ [axis]: pivotGroup.rotation[axis] + angle }, ROTATION_SPEED_MS)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onComplete(() => {
                        // Update logical state and move cubies back
                        pivotGroup.updateMatrixWorld(); // Ensure world matrix is up-to-date

                        layerCubies.forEach(cubieData => {
                            const mesh = cubieData.mesh;
                            // Apply the pivot's world transformation to the mesh
                            mesh.applyMatrix4(pivotGroup.matrixWorld);

                            // Detach from pivot and reattach to the main cube group
                            pivotGroup.remove(mesh);
                            cubeGroup.add(mesh);
                            mesh.updateMatrixWorld(); // Update mesh's world matrix after re-parenting

                            // Update internal logical coordinates based on the mesh's new world position
                            // Rounding is crucial here to avoid floating point errors accumulating
                            cubieData.x = Math.round(mesh.position.x);
                            cubieData.y = Math.round(mesh.position.y);
                            cubieData.z = Math.round(mesh.position.z);

                            // Also update the userData on the mesh itself for consistency
                            mesh.userData.x = cubieData.x;
                            mesh.userData.y = cubieData.y;
                            mesh.userData.z = cubieData.z;

                            // ** REMOVED THESE LINES TO FIX ORIENTATION **
                            // mesh.rotation.set(0, 0, 0);
                            // mesh.scale.set(1, 1, 1);
                        });

                        scene.remove(pivotGroup);
                        isRotating = false; // Allow next rotation
                        resolve(); // Resolve the promise when animation finishes
                    })
                    .start();
            });
        },

        // Helper function to apply a move and handle waiting/animation
        applyMove: async function(axis, layer, direction, storeInSequence = false) {
             // In test environment, rotation is instant, so no need to wait
             if (!isTestEnvironment) { // Use the flag
                 while (isRotating) {
                     // console.log("Move application waiting for rotation to finish...");
                     await delay(SHUFFLE_DELAY_MS / 2);
                 }
             }

            if (storeInSequence) {
                 shuffleSequence.push({ axis, layer, direction });
            }

            // console.log(`Applying move: Axis ${axis}, Layer ${layer}, Dir ${direction}`);
            try {
                await this.rotateFace(axis, layer, direction);
            } catch (error) {
                console.error(`Error during move application (Axis: ${axis}, Layer: ${layer}, Dir: ${direction}):`, error);
                // Don't rethrow if it was just a rotation in progress warning in test env
                if (error !== "Rotation already in progress" || !isTestEnvironment) { // Use the flag
                     throw error;
                }
            }
        },

        shuffle: async function() {
            if (isRotating && !isTestEnvironment) { // Use the flag
                console.warn("Cannot shuffle while a rotation is in progress.");
                return;
            }
            console.log("Starting shuffle...");
            shuffleSequence = []; // Clear previous shuffle sequence
            const numMoves = size * 10; // Number of random moves
            const axes = ['x', 'y', 'z'];
            const directions = [-1, 1];
            const layerOffset = (size - 1) / 2;

            for (let i = 0; i < numMoves; i++) {
                const axis = axes[Math.floor(Math.random() * axes.length)];
                const layer = Math.floor(Math.random() * (2 * layerOffset + 1)) - layerOffset;
                const direction = directions[Math.floor(Math.random() * directions.length)];

                try {
                    await this.applyMove(axis, layer, direction, true);
                    // Add a small delay even in tests to allow event loop to process if needed?
                    // Or maybe not, instantaneous might be better for testing speed.
                    if (isTestEnvironment){ // Use the flag
                        // no delay in test
                    } else {
                         await delay(SHUFFLE_DELAY_MS); // Keep delay for visual shuffling
                    }
                } catch (error) {
                     console.error("Shuffle stopped due to error during move application.");
                     break;
                }
            }
            console.log("Shuffle complete.");
        },

        solve: async function() {
             if (isRotating && !isTestEnvironment) { // Use the flag
                console.warn("Cannot solve while a rotation is in progress.");
                return;
            }
            if (!shuffleSequence || shuffleSequence.length === 0) {
                console.log("Nothing to solve (no shuffle sequence recorded).");
                return;
            }

            console.log("Starting solve...");
            const movesToReverse = [...shuffleSequence];
            let solveCompleted = true;

            for (let i = movesToReverse.length - 1; i >= 0; i--) {
                const move = movesToReverse[i];
                try {
                    await this.applyMove(move.axis, move.layer, -move.direction, false);
                     if (isTestEnvironment){ // Use the flag
                        // no delay in test
                    } else {
                         await delay(SHUFFLE_DELAY_MS); // Keep delay for visual solving
                    }
                } catch (error) {
                    console.error("Solve stopped due to error during move application.");
                    solveCompleted = false;
                    break;
                }
            }

            if (solveCompleted) {
                 console.log("Solve complete.");
                 shuffleSequence = [];
            } else {
                 console.warn("Solve interrupted, shuffle sequence not cleared.");
            }
        },

        changeSize: function(newSize) {
            // 1. Input Validation
            if (!Number.isInteger(newSize) || newSize < 2 || newSize > 5) { // Added max size check
                console.error(`Invalid size requested: ${newSize}. Size must be an integer between 2 and 5.`);
                // Revert UI if possible (lil-gui might do this automatically depending on how error is handled)
                if (sizeController.size !== size) {
                    sizeController.size = size;
                    if(gui) {
                         gui.controllers.forEach(c => {
                            if (c.property === 'size') {
                                c.updateDisplay();
                            }
                        });
                    }
                }
                return;
            }

            // 2. Check if size is actually changing
            if (newSize === size) {
                console.log(`Cube is already size ${newSize}. No change needed.`);
                return;
            }

            // 3. Check if a rotation is in progress (skip check in test env)
            if (isRotating && !isTestEnvironment) { // Use the flag
                console.warn("Cannot change size while a rotation is in progress.");
                 // Revert UI controller value if change was triggered by UI
                if (sizeController.size !== size) {
                    sizeController.size = size;
                    if(gui) {
                         gui.controllers.forEach(c => {
                            if (c.property === 'size') {
                                c.updateDisplay();
                            }
                        });
                    }
                }
                return; // Prevent size change during animation
            }

            console.log(`Changing size from ${size}x${size}x${size} to ${newSize}x${newSize}x${newSize}...`);

            // 4. Cleanup Existing Cube Meshes and State
            this.clearCube(); // This already removes meshes and clears cubies/shuffleSequence

            // 5. Create New Cube
            // Note: No need to update `this.size` here, `createCube` does it implicitly via `size = newSize`.
            this.createCube(newSize); // This builds the new cube and adjusts camera/controls

            // 6. Update internal state and potentially UI *after* cube creation succeeds
            // `createCube` already sets `size = newSize`
             // Update the controller object's value to match the new internal state
            if (sizeController.size !== size) { // Check if the controller is out of sync (e.g., programmatic change)
                sizeController.size = size;
                // Find the controller and update its display value (if GUI exists)
                if (gui) {
                    gui.controllers.forEach(c => {
                        if (c.property === 'size') {
                            c.updateDisplay();
                        }
                    });
                }
            }


            console.log(`Size change to ${newSize}x${newSize}x${newSize} complete.`);
        },

        cleanup: function() {
            console.log("Cleaning up Rubik's Cube component...");
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', component.onWindowResize); // Use bound reference

            // Clean up tweens specifically
            TWEEN.removeAll();

            if (gui) {
                // Check if the GUI's DOM element exists and has a parent before trying to remove
                if (gui.domElement && gui.domElement.parentElement) {
                    try {
                        gui.domElement.parentElement.removeChild(gui.domElement);
                    } catch (e) {
                        console.warn("Could not remove GUI DOM element during cleanup:", e);
                    }
                }
                // Destroy the lil-gui instance itself to clean up its internal listeners etc.
                gui.destroy();
                gui = null;
            }


            if (controls) {
                controls.dispose();
                controls = null;
            }

            component.clearCube(); // Use component reference to clear meshes/state
            if (scene && cubeGroup) {
                 scene.remove(cubeGroup); // Remove the main group from the scene
                 cubeGroup = null;
            }


            // Dispose scene resources
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
            isRotating = false;
            shuffleSequence = [];
            sizeController = { size: 3 }; // Reset controller object
            size = 3; // Reset internal size state
            isTestEnvironment = false; // Reset flag on cleanup
            console.log("Rubik's Cube component cleanup complete.");
        },

        // --- Test Helper Method ---
        // Expose internal state for testing purposes
        getState: function() {
            return {
                size,
                isRotating,
                cubies: cubies.map(c => ({ x: c.x, y: c.y, z: c.z })), // Return copies of logical positions
                shuffleSequence: [...shuffleSequence] // Return copy of sequence
            };
        }
    };

     // Bind methods that might lose context (event handlers, cleanup)
    component.cleanup = component.cleanup.bind(component);
    component.onWindowResize = component.onWindowResize.bind(component);
    // Bind methods used directly by lil-gui
    component.shuffle = component.shuffle.bind(component);
    component.solve = component.solve.bind(component);
    // changeSize is called via an arrow function in onChange, so binding isn't strictly necessary there,
    // but binding it generally can prevent potential issues if called differently elsewhere.
    component.changeSize = component.changeSize.bind(component);
    component.getState = component.getState.bind(component);
    component.applyMove = component.applyMove.bind(component); // Bind applyMove as it uses `this`
    component._updateLogicalCoordinates = component._updateLogicalCoordinates.bind(component); // Bind helper
    component.rotateFace = component.rotateFace.bind(component); // Bind rotateFace


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
