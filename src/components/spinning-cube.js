import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, cube, controls;
let animationFrameId;
let resizeHandler = null; // Keep track of the resize handler for proper removal

function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 2;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 5;
    // controls.maxPolarAngle = Math.PI / 2;

    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Keep ambient light
    scene.add(ambientLight);

    // Directional Light (Replaces PointLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Store the bound resize handler to allow removal later
    resizeHandler = () => onWindowResize(container); // Define here to capture container
    window.addEventListener('resize', resizeHandler);
}

function onWindowResize(container) {
    if (!renderer || !camera || !container) return;
    // Recalculate aspect ratio based on current container size
    const aspect = container.clientWidth / container.clientHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    // Ensure cleanup hasn't removed objects
    if (!renderer || !scene || !camera || !controls) return;

    animationFrameId = requestAnimationFrame(animate);

    // Only rotate on Y-axis
    if (cube) { // Check if cube exists before rotating
        cube.rotation.y += 0.01;
    }

    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    renderer.render(scene, camera);
}

// Export the init function
export function init(container) {
    if (!container) {
        console.error("Initialization failed: container element not provided.");
        return () => { console.log("No cleanup needed for failed init."); };
    }
    setupScene(container);
    animate();

    // Return the cleanup function specific to this instance
    return function specificCleanup() {
       console.log("Executing specific cleanup for spinning cube...");
       cancelAnimationFrame(animationFrameId);
       animationFrameId = null;

       if(resizeHandler) {
           window.removeEventListener('resize', resizeHandler);
           resizeHandler = null; // Clear handler reference
       }

       if (controls) {
           controls.dispose();
           controls = null;
       }

       if (renderer) {
           renderer.dispose();
           if (renderer.domElement && renderer.domElement.parentNode) {
                // Check parentNode again before removing
                if (renderer.domElement.parentNode === container) {
                    try {
                       container.removeChild(renderer.domElement);
                    } catch (e) {
                        console.error("Error removing renderer dom element:", e);
                    }
                }
           }
           renderer = null;
       }

       if (scene) {
           scene.traverse(object => {
               if (object instanceof THREE.Mesh) {
                   if (object.geometry) object.geometry.dispose();
                   if (object.material) {
                       // Ensure material is disposable
                       if (typeof object.material.dispose === 'function') {
                           if (Array.isArray(object.material)) {
                               object.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
                           } else {
                               object.material.dispose();
                           }
                       }
                   }
               }
               // Dispose lights if necessary (usually not required, but good practice)
               if (object instanceof THREE.Light) {
                   // Lights don't have standard dispose, but remove from scene implicitly handled
               }
           });
           scene = null;
       }

       camera = null;
       cube = null;

       console.log("Specific spinning cube cleanup finished.");
   };
}
