import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, mesh, controls, ambientLight, directionalLight;
let animationFrameId;
let resizeHandler = null;

function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;

    // Geometry and Material
    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 100, 16);
    const material = new THREE.MeshNormalMaterial(); // Simple material
    // Or use MeshStandardMaterial for more realistic lighting:
    // const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, roughness: 0.5, metalness: 0.5 });

    // Mesh
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lights
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5).normalize();
    scene.add(directionalLight);

    // Resize handler
    resizeHandler = () => onWindowResize(container);
    window.addEventListener('resize', resizeHandler);
}

function onWindowResize(container) {
    // Add checks for camera, renderer, and container
    if (!camera || !renderer || !container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (!mesh || !controls || !renderer || !scene || !camera) return;

    // Rotate the torus knot
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.005;

    controls.update();
    renderer.render(scene, camera);
}

// Export the init function
export function init(container) {
    if (!container) {
        console.error("Initialization failed: container element not provided.");
        return () => { console.log("No cleanup needed for failed init."); };
    }
    try {
        setupScene(container);
        animate();
    } catch (error) {
        console.error("Error during torus knot initialization:", error);
        // Perform partial cleanup if setup failed midway
        if (renderer && renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
        }
        return () => { console.log("Cleanup after failed init."); };
    }

    // Return the cleanup function specific to this instance
    return function cleanup() {
        console.log("Cleaning up torus knot component...");
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }

        if (controls) {
            controls.dispose();
            controls = null;
        }

        if (mesh) {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => { if (mat && typeof mat.dispose === 'function') mat.dispose(); });
                } else if (typeof mesh.material.dispose === 'function') {
                    mesh.material.dispose();
                }
            }
            if (scene) scene.remove(mesh);
            mesh = null;
        }

        if (ambientLight && scene) scene.remove(ambientLight);
        if (directionalLight && scene) scene.remove(directionalLight);
        ambientLight = null;
        directionalLight = null;

        // Check renderer and domElement before removing and disposing
        if (renderer) {
            if (renderer.domElement && renderer.domElement.parentNode) {
                 renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer.dispose(); // Dispose after removing from DOM
            renderer = null;
        }

        scene = null; // Scene should be cleared of objects before nullifying
        camera = null;
        animationFrameId = null;
        console.log("Torus knot cleanup finished.");
    };
}
