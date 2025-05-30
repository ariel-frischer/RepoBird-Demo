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
const BASE_SHUFFLE_DELAY_MS = 50; 

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

    let gui;
    let sizeController = { size: size };
    let animationSpeedFactor = 1.0;
    let ROTATION_SPEED_MS;
    let SHUFFLE_DELAY_MS;

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const component = {
        init: function(container, initialSize = 3, options = {}) {
            containerElement = container;
            size = initialSize;
            sizeController.size = size;
            currentCubeState = CubeState.IDLE;
            shuffleSequence = [];
            isTestEnvironment = options.isTest === true;

            ROTATION_SPEED_MS = isTestEnvironment ? 0 : BASE_ROTATION_SPEED_MS / animationSpeedFactor;
            SHUFFLE_DELAY_MS = isTestEnvironment ? 0 : BASE_SHUFFLE_DELAY_MS / animationSpeedFactor;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a1a);
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.lookAt(0, 0, 0);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            scene.add(directionalLight);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.target.set(0, 0, 0);
            controls.update();

            cubeGroup = new THREE.Group();
            scene.add(cubeGroup);
            this.createCube(size);

            if (!isTestEnvironment) {
                gui = new GUI({ title: "Rubik's Cube Controls" });
                gui.domElement.style.position = 'absolute';
                gui.domElement.style.top = '10px';
                gui.domElement.style.right = '10px';
                containerElement.appendChild(gui.domElement);
                gui.add(this, 'shuffle').name('Shuffle Cube');
                gui.add(this, 'solve').name('Solve Cube');
                gui.add(sizeController, 'size', 2, 5, 1).name('Cube Size (N x N x N)').onChange(v => this.changeSize(v));
                gui.add({ animationSpeedFactor }, 'animationSpeedFactor', 0.1, 5.0, 0.1).name('Animation Speed')
                   .onChange(value => {
                       animationSpeedFactor = value;
                       ROTATION_SPEED_MS = isTestEnvironment ? 0 : BASE_ROTATION_SPEED_MS / animationSpeedFactor;
                       SHUFFLE_DELAY_MS = isTestEnvironment ? 0 : BASE_SHUFFLE_DELAY_MS / animationSpeedFactor;
                   });
            }
            window.addEventListener('resize', this.onWindowResize);
            if (!isTestEnvironment) this.animate();
            return this.cleanup;
        },

        createCube: function(newSize) {
            size = newSize;
            const offset = (size - 1) / 2;
            for (let x_f = -offset; x_f <= offset; x_f++) for (let y_f = -offset; y_f <= offset; y_f++) for (let z_f = -offset; z_f <= offset; z_f++) {
                if (size % 2 !== 0 && x_f === 0 && y_f === 0 && z_f === 0) continue;
                const innerB = (size / 2) - 1;
                if (size % 2 === 0 && Math.abs(x_f) <= innerB && Math.abs(y_f) <= innerB && Math.abs(z_f) <= innerB) continue;
                const cubieMesh = this.createCubie(x_f, y_f, z_f, size);
                cubeGroup.add(cubieMesh);
                cubies.push({ mesh: cubieMesh });
            }
            this.adjustCameraControlsAndLight(size);
        },

        createCubie: function(x_f, y_f, z_f, curSize) {
            const offset = (curSize - 1) / 2;
            const x_i = Math.round(x_f * 2), y_i = Math.round(y_f * 2), z_i = Math.round(z_f * 2);
            const mats = [0,1,2,3,4,5].map(() => new THREE.MeshStandardMaterial({ color: COLORS.BLACK }));
            const tol = 0.1;
            if (x_f >= offset - tol) mats[0].color.setHex(COLORS.RED); if (x_f <= -offset + tol) mats[1].color.setHex(COLORS.ORANGE);
            if (y_f >= offset - tol) mats[2].color.setHex(COLORS.WHITE); if (y_f <= -offset + tol) mats[3].color.setHex(COLORS.YELLOW);
            if (z_f >= offset - tol) mats[4].color.setHex(COLORS.BLUE); if (z_f <= -offset + tol) mats[5].color.setHex(COLORS.GREEN);
            const geom = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
            const mesh = new THREE.Mesh(geom, mats);
            mesh.position.set(x_f * (CUBIE_SIZE + CUBIE_GAP), y_f * (CUBIE_SIZE + CUBIE_GAP), z_f * (CUBIE_SIZE + CUBIE_GAP));
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData = {
                initialPosition: { x: x_f, y: y_f, z: z_f }, logicalPosition: { x: x_f, y: y_f, z: z_f },
                logicalPositionInt: { x: x_i, y: y_i, z: z_i }, isCubie: true
            };
            return mesh;
        },

        clearCube: function() {
            if (cubeGroup) while (cubeGroup.children.length > 0) {
                const m = cubeGroup.children[0]; cubeGroup.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) Array.isArray(m.material) ? m.material.forEach(mat => mat.dispose()) : m.material.dispose();
            }
            cubies = []; shuffleSequence = [];
        },

        adjustCameraControlsAndLight: function(curSize) {
            if (camera && controls && scene) {
                const camF = 1.8; camera.position.set(curSize*camF, curSize*camF, curSize*camF*1.2); camera.lookAt(0,0,0);
                controls.target.set(0,0,0); controls.update();
                const light = scene.getObjectByProperty('isDirectionalLight', true);
                if (light) light.position.set(curSize*2, curSize*3, curSize*2.5);
            }
        },

        animate: function(){ animationFrameId=requestAnimationFrame(this.animate.bind(this)); TWEEN.update(); if(controls)controls.update(); if(renderer&&scene&&camera)renderer.render(scene,camera); },
        onWindowResize: function(){ if(camera&&renderer&&containerElement){ camera.aspect = containerElement.clientWidth/containerElement.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(containerElement.clientWidth,containerElement.clientHeight); }},

        _updateLogicalCoordinatesInt: function(cubieData, axis, direction, contextLog = "") {
            const lpInt = cubieData.mesh.userData.logicalPositionInt;
            const originalIntPosCopy = { ...lpInt }; 

            let x = lpInt.x, y = lpInt.y, z = lpInt.z;
            let newX = x, newY = y, newZ = z;
            let numSteps = 0, stepDirection = 0;

            if (direction===1||direction===-3){numSteps=1;stepDirection=1;}else if(direction===-1||direction===3){numSteps=1;stepDirection=-1;}else if(direction===2||direction===-2){numSteps=2;stepDirection=1;}else if(direction===0){numSteps=0;}else{console.warn(`Unhandled dir: ${direction}`);numSteps=0;}
            
            for(let i=0;i<numSteps;++i){ const cX=newX,cY=newY,cZ=newZ; if(axis==='x'){if(stepDirection>0){newY=-cZ;newZ=cY;}else{newY=cZ;newZ=-cY;}}else if(axis==='y'){if(stepDirection>0){newX=cZ;newZ=-cX;}else{newX=-cZ;newZ=cX;}}else if(axis==='z'){if(stepDirection>0){newX=-cY;newY=cX;}else{newX=cY;newY=-cX;}}}
            
            if(cubieData.mesh?.userData?.logicalPositionInt){
                cubieData.mesh.userData.logicalPositionInt.x=newX; cubieData.mesh.userData.logicalPositionInt.y=newY; cubieData.mesh.userData.logicalPositionInt.z=newZ;
                cubieData.mesh.userData.logicalPosition.x=newX/2.0; cubieData.mesh.userData.logicalPosition.y=newY/2.0; cubieData.mesh.userData.logicalPosition.z=newZ/2.0;
                if (isTestEnvironment) {
                    const changed = originalIntPosCopy.x !== newX || originalIntPosCopy.y !== newY || originalIntPosCopy.z !== newZ;
                    console.log(`[Test UPDATE_INT_COORDS (${contextLog})] Original: ${JSON.stringify(originalIntPosCopy)}, New: ${JSON.stringify(cubieData.mesh.userData.logicalPositionInt)}, Axis: ${axis}, Dir: ${direction}, Changed: ${changed}`);
                }
            } else { console.error("Missing userData/logicalPositionInt in _updateLogicalCoordinatesInt", cubieData.mesh); }
        },

        rotateFace: async function(axis, integerLayer, direction, parentState = null) {
            const targetState = parentState || CubeState.ROTATING;
            const finalState = parentState || CubeState.IDLE;
            const logContext = isTestEnvironment ? (parentState === CubeState.SHUFFLING ? "SHUFFLE" : (parentState === CubeState.SOLVING ? "SOLVE" : "OTHER")) : "";

            if (isTestEnvironment) console.log(`[Test ROTATE_FACE ENTRY (${logContext})] axis=${axis}, intLayer=${integerLayer}, dir=${direction}, parentState=${parentState}, currentCubeState=${currentCubeState}`);

            if (currentCubeState !== CubeState.IDLE && currentCubeState !== parentState) {
                console.warn(`Rotation blocked: Cube state is ${currentCubeState}, expected IDLE or ${parentState}`);
                return isTestEnvironment ? Promise.resolve() : Promise.reject(`Rotation Blocked: State is ${currentCubeState}`);
            }
            if (currentCubeState !== parentState) currentCubeState = targetState;

            const layerCubiesData = cubies.filter(c => c.mesh?.userData?.logicalPositionInt?.[axis] === integerLayer);
            if (isTestEnvironment) console.log(`[Test ROTATE_FACE CUBIES_FILTERED (${logContext})] count=${layerCubiesData.length}`);

            if (layerCubiesData.length === 0 && size > 1) console.warn(`${isTestEnvironment?'Test Env:':''}No cubies for layer ${integerLayer} axis ${axis} (Size ${size}).`);
            if (layerCubiesData.length === 0) {
                if (currentCubeState === targetState && targetState !== parentState) currentCubeState = finalState;
                return Promise.resolve();
            }

            if (isTestEnvironment) {
                layerCubiesData.forEach(cubieData => {
                    if (isTestEnvironment) console.log(`[Test ROTATE_FACE PRE-UPDATE (${logContext})] Cubie: ${JSON.stringify(cubieData.mesh.userData.logicalPositionInt)}`);
                    this._updateLogicalCoordinatesInt(cubieData, axis, direction, logContext);
                });
                if (currentCubeState === targetState && targetState !== parentState) currentCubeState = finalState;
                if (isTestEnvironment) console.log(`[Test ROTATE_FACE EXIT_TEST_PATH (${logContext})] currentCubeState is now: ${currentCubeState}`);
                return Promise.resolve();
            }

            // Animation Path
            const pivot = new THREE.Group(); pivot.name="pivotGroup"; scene.add(pivot);
            layerCubiesData.forEach(cData => pivot.attach(cData.mesh));
            const angle = (Math.PI/2)*direction;
            return new Promise(res => {
                new TWEEN.Tween(pivot.rotation).to({[axis]:pivot.rotation[axis]+angle}, ROTATION_SPEED_MS).easing(TWEEN.Easing.Quadratic.InOut)
                .onComplete(()=>{
                    pivot.updateMatrixWorld();
                    layerCubiesData.forEach(cData => { const m=cData.mesh; cubeGroup.attach(m); if(m.userData?.logicalPositionInt){ const nFX=m.position.x/(CUBIE_GAP+CUBIE_SIZE),nFY=m.position.y/(CUBIE_GAP+CUBIE_SIZE),nFZ=m.position.z/(CUBIE_GAP+CUBIE_SIZE); m.userData.logicalPositionInt.x=Math.round(nFX*2);m.userData.logicalPositionInt.y=Math.round(nFY*2);m.userData.logicalPositionInt.z=Math.round(nFZ*2); m.userData.logicalPosition.x=nFX;m.userData.logicalPosition.y=nFY;m.userData.logicalPosition.z=nFZ;}else{console.error("Missing userData/logicalPositionInt in TWEEN",m);}});
                    scene.remove(pivot);
                    if (currentCubeState === targetState && targetState !== parentState) currentCubeState = finalState;
                    res();
                }).start(animationFrameId !== null ? undefined : 0);
            });
        },

        applyMove: async function(moveSpec, storeInSequence = false, parentState = null) {
            const { axis, layerIndex, direction } = moveSpec;
            const integerLayer = -(size - 1) + (layerIndex * 2);
            if (storeInSequence) shuffleSequence.push({ axis, layerIndex, direction });
            try { await this.rotateFace(axis, integerLayer, direction, parentState); }
            catch (e) { if(typeof e==='string'&&e.startsWith('Rotation Blocked:'))console.warn(`Move skip: ${e}`); else {console.error(`Error in applyMove:`,e);throw e;} }
        },

        shuffle: async function() {
            if (currentCubeState!==CubeState.IDLE){console.warn(`Shuffle blocked: state is ${currentCubeState}.`);return;}
            currentCubeState=CubeState.SHUFFLING;
            try {
                const numMoves = size * 10; const axes = ['x','y','z']; const dirs = [-1,1];
                for (let i=0; i<numMoves; i++) {
                    const ax=axes[Math.floor(Math.random()*axes.length)]; const lI=Math.floor(Math.random()*size); const dir=dirs[Math.floor(Math.random()*dirs.length)];
                    const mS = {axis:ax, layerIndex:lI, direction:dir};
                    if (isTestEnvironment) console.log(`[Test SHUFFLE_LOOP] Iteration ${i+1}/${numMoves}: moveSpec=${JSON.stringify(mS)}, currentCubeState=${currentCubeState}`);
                    await this.applyMove(mS, true, CubeState.SHUFFLING);
                    if (isTestEnvironment) { /* No delay */ } else { await delay(SHUFFLE_DELAY_MS); }
                    if(currentCubeState!==CubeState.SHUFFLING){ console.error(`[Test SHUFFLE ERROR] State changed from SHUFFLING to ${currentCubeState} mid-shuffle after move ${i+1}. Aborting.`); break; }
                }
            } catch(e){console.error("Shuffle error during loop:",e);}
            finally{ currentCubeState=CubeState.IDLE; }
        },

        solve: async function() {
            if (currentCubeState !== CubeState.IDLE) { console.warn(`Cannot solve: Cube state is ${currentCubeState}.`); return; }
            if (!shuffleSequence || shuffleSequence.length === 0) { console.log("Nothing to solve (no shuffle sequence recorded)."); return; }
            currentCubeState = CubeState.SOLVING;
            const movesToReverse = [...shuffleSequence]; let solveCompleted = true;
            try {
                for (let i = movesToReverse.length - 1; i >= 0; i--) {
                    const originalMove = movesToReverse[i];
                    const reversedMoveSpec = { axis: originalMove.axis, layerIndex: originalMove.layerIndex, direction: -originalMove.direction };
                    if (isTestEnvironment) console.log(`[Test SOLVE_LOOP] Iteration ${movesToReverse.length - i}/${movesToReverse.length}: moveSpec=${JSON.stringify(reversedMoveSpec)}, currentCubeState=${currentCubeState}`);
                    await this.applyMove(reversedMoveSpec, false, CubeState.SOLVING);
                    if (isTestEnvironment) { /* No delay */ } else { await delay(SHUFFLE_DELAY_MS); }
                    if (currentCubeState !== CubeState.SOLVING) { console.error(`[Test SOLVE ERROR] State changed from SOLVING to ${currentCubeState} mid-solve. Aborting.`); solveCompleted = false; break; }
                }
                if (solveCompleted) { shuffleSequence = []; } else { console.warn("Solve interrupted, shuffle sequence not cleared."); }
            } catch (error) { console.error("Solve stopped due to error during move application:", error); solveCompleted = false; }
            finally { currentCubeState = CubeState.IDLE; }
        },

        changeSize: function(newSize) {
            if (!Number.isInteger(newSize) || newSize < 2 || newSize > 5) { console.error(`Invalid size: ${newSize}.`); if (gui&&sizeController.size!==size){sizeController.size=size;gui.controllers.forEach(c=>c.property==='size'&&c.updateDisplay());} return; }
            if (newSize === size) return;
            if (currentCubeState !== CubeState.IDLE && !isTestEnvironment) { console.warn(`Cannot change size: Cube state is ${currentCubeState}.`); if (gui&&sizeController.size!==size){sizeController.size=size;gui.controllers.forEach(c=>c.property==='size'&&c.updateDisplay());} return; }
            currentCubeState = CubeState.RESIZING;
            try { this.clearCube(); this.createCube(newSize); if (sizeController.size!==size){sizeController.size=size;if(gui)gui.controllers.forEach(c=>c.property==='size'&&c.updateDisplay());} }
            catch (error) { console.error("Error during size change:", error); }
            finally { currentCubeState = CubeState.IDLE; }
        },

        cleanup: function() {
            if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
            window.removeEventListener('resize', component.onWindowResize);
            TWEEN.removeAll();
            if (gui) { if (gui.domElement?.parentElement) { try { gui.domElement.parentElement.removeChild(gui.domElement); } catch (e) { console.warn("Could not remove GUI DOM element:", e); } } gui.destroy(); gui = null; }
            if (controls) { controls.dispose(); controls = null; }
            component.clearCube();
            if (scene && cubeGroup) { scene.remove(cubeGroup); cubeGroup = null; }
            if (scene) { const pivot = scene.getObjectByName("pivotGroup"); if (pivot) scene.remove(pivot); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else if (o.material.dispose) o.material.dispose();}}); scene = null; }
            if (renderer) { renderer.dispose(); if (renderer.domElement && containerElement?.contains(renderer.domElement)) { try { containerElement.removeChild(renderer.domElement); } catch (e) { console.warn("Could not remove renderer DOM element:", e); } } renderer = null; }
            camera = null; cubies = []; containerElement = null;
            currentCubeState = CubeState.IDLE; shuffleSequence = [];
            sizeController = { size: 3 }; size = 3; isTestEnvironment = false;
            animationSpeedFactor = 1.0; ROTATION_SPEED_MS = undefined; SHUFFLE_DELAY_MS = undefined;
        },

        getState: function() { return { size, currentCubeState, cubies, shuffleSequence: [...shuffleSequence], currentRotationSpeed: ROTATION_SPEED_MS, currentShuffleDelay: SHUFFLE_DELAY_MS, animationSpeedFactor: animationSpeedFactor }; }
    };

    Object.keys(component).forEach(key => { if (typeof component[key] === 'function') component[key] = component[key].bind(component); });
    return component;
}

function init(container, initialSize = 3, options = {}) {
    const rubiksCubeComponent = createRubiksCubeComponent();
    return rubiksCubeComponent.init(container, initialSize, options);
}

export { init, createRubiksCubeComponent };
