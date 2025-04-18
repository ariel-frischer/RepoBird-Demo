import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, sphere, controls, animationFrameId;
let resizeHandler = null;

function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;


    // Geometry and Material
    const geometry = new THREE.SphereGeometry(1, 32, 32); // Radius 1, 32 segments width, 32 segments height
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

    // Mesh
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);


    // Resize handler
    const onWindowResize = () => {
        if (!container || !renderer || !camera) return; // Check if container still exists
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

    if (sphere) {
        sphere.rotation.y += 0.005; // Rotate the sphere
    }
    if (controls) {
        controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function specificCleanup() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
    }
    if (controls) {
        controls.dispose();
    }
    if (renderer) {
        // Traverse scene to dispose geometry and materials
        if (scene) {
             scene.traverse((object) => {
                if (object.isMesh) {
                    if (object.geometry) {
                        object.geometry.dispose();
                        // console.log('Disposed geometry for:', object.name || object.uuid);
                    }
                    if (object.material) {
                        // If material is an array, dispose each element
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                        // console.log('Disposed material for:', object.name || object.uuid);
                    }
                }
            });
        }
        // Dispose renderer itself
        renderer.dispose();
        // console.log('Disposed renderer');

        // Remove canvas from DOM
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
            // console.log('Removed renderer DOM element');
        }
    }

    // Clear references
    scene = null;
    camera = null;
    renderer = null;
    sphere = null;
    controls = null;
    animationFrameId = null;
    resizeHandler = null;
    // console.log('Cleanup complete');
}

export function init(container) {
    if (!container) {
        console.error('Container element not provided for Wireframe Sphere');
        return () => {}; // Return a no-op cleanup function
    }
    if (renderer) {
        console.warn('Wireframe Sphere already initialized. Cleaning up previous instance.');
        specificCleanup();
    }

    try {
        setupScene(container);
        animate();
        // console.log('Wireframe Sphere initialized successfully.');
        return specificCleanup; // Return the actual cleanup function
    } catch (error) {
        console.error('Error initializing Wireframe Sphere:', error);
        specificCleanup(); // Attempt cleanup even if setup failed
        return () => {}; // Return a no-op cleanup function on error
    }
}
