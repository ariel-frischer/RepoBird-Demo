import * as THREE from 'three';

let scene, camera, renderer, points, animationFrameId;
let resizeHandler = null;
const starCount = 5000;
const speed = 1.0;
const volumeDepth = 1000; // Depth of the volume where stars are generated

function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, volumeDepth);
    camera.position.z = 1; // Position camera slightly in front of the origin

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Starfield Geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = THREE.MathUtils.randFloatSpread(1000); // x: -500 to 500
        positions[i3 + 1] = THREE.MathUtils.randFloatSpread(1000); // y: -500 to 500
        positions[i3 + 2] = THREE.MathUtils.randFloat(-volumeDepth, 0); // z: -1000 to 0
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Starfield Material
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.0,
        sizeAttenuation: true // Make points smaller further away
    });

    // Starfield Points Object
    points = new THREE.Points(geometry, material);
    scene.add(points);

    // Resize handler
    const onWindowResize = () => {
        if (!container || !renderer || !camera) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    resizeHandler = onWindowResize; // Store the reference
    window.addEventListener('resize', resizeHandler);

    // Initial resize call
    onWindowResize();
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (points && camera && renderer && scene) {
        const positions = points.geometry.attributes.position;
        const array = positions.array;

        for (let i = 2; i < starCount * 3; i += 3) {
            // Increment Z position
            array[i] += speed;

            // Reset Logic: If the star passed the camera (z > camera.position.z)
            if (array[i] > camera.position.z) {
                array[i] = THREE.MathUtils.randFloat(-volumeDepth, camera.position.z - volumeDepth * 0.1); // Reset z to the back, slightly spread out
                // Randomize X and Y again to prevent lines
                array[i - 2] = THREE.MathUtils.randFloatSpread(1000); // x
                array[i - 1] = THREE.MathUtils.randFloatSpread(1000); // y
            }
        }

        // Mark the position attribute as needing update
        positions.needsUpdate = true;

        // Render the scene
        renderer.render(scene, camera);
    }
}

function specificCleanup() {
    // console.log('Starfield cleanup started');
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        // console.log('Cancelled animation frame');
    }
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
        // console.log('Removed resize listener');
    }

    if (renderer) {
        if (scene) {
             scene.traverse((object) => {
                if (object.isPoints) { // Check for Points instead of Mesh
                    if (object.geometry) {
                        object.geometry.dispose();
                        // console.log('Disposed points geometry');
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                        // console.log('Disposed points material');
                    }
                }
            });
            scene = null; // Clear scene reference after traversal
        }
        renderer.dispose();
        // console.log('Disposed renderer');
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
            // console.log('Removed renderer DOM element');
        }
        renderer = null; // Clear renderer reference
    }


    // Clear other references
    camera = null;
    points = null;
    // console.log('Starfield cleanup complete');
}

export function init(container) {
    if (!container) {
        console.error('Container element not provided for Starfield');
        return { cleanup: () => {}, scene: null };
    }
    // Handle re-initialization
    if (renderer) {
        console.warn('Starfield already initialized. Cleaning up previous instance.');
        specificCleanup();
    }

    try {
        setupScene(container);
        animate();
        // console.log('Starfield initialized successfully.');
        // Return cleanup function and scene for testing/management
        return { cleanup: specificCleanup, scene: scene };
    } catch (error) {
        console.error('Error initializing Starfield:', error);
        specificCleanup(); // Attempt cleanup even if setup failed
        return { cleanup: () => {}, scene: null };
    }
}
