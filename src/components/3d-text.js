import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let textMesh = null;
let animateId = null;

// Configurable text
const TEXT_TO_DISPLAY = 'Hello 3D';

function animate() {
    animateId = requestAnimationFrame(animate);
    controls.update(); // Update controls in the loop
    renderer.render(scene, camera);
}

export function init(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Dark background

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 50; // Adjusted initial position closer for text visibility

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.target.set(0, 0, 0); // Ensure controls target the origin where text is centered
    controls.update();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Brighter ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Stronger directional
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Font Loading and Text Geometry
    const loader = new THREE.FontLoader();
    loader.load(
        'https://unpkg.com/three/examples/fonts/helvetiker_regular.typeface.json',
        (font) => {
            const textGeometry = new THREE.TextGeometry(TEXT_TO_DISPLAY, {
                font: font,
                size: 10, // Adjusted size for initial view
                height: 1, // Adjusted height
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.5, // Adjusted bevel
                bevelSize: 0.3,    // Adjusted bevel
                bevelOffset: 0,
                bevelSegments: 5
            });

            textGeometry.center(); // Center the geometry

            // Material (Using MeshStandardMaterial as requested)
            const material = new THREE.MeshStandardMaterial({
                color: 0x00ff00, // Example color: green
                roughness: 0.4,
                metalness: 0.6
             });

            textMesh = new THREE.Mesh(textGeometry, material);
            scene.add(textMesh);

            // Start animation only after mesh is added
            if (!animateId) {
                 animate();
            }
        },
        // onProgress callback (optional)
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // onError callback (optional)
        (err) => {
            console.error('An error happened during font loading:', err);
            // Display an error message in the container
            const errorDiv = document.createElement('div');
            errorDiv.id = 'font-error-message'; // Add ID for potential removal in cleanup
            errorDiv.textContent = 'Error loading font. See console for details.';
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '10px';
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '10px';
            errorDiv.style.left = '10px';
            container.appendChild(errorDiv);
        }
    );

    // Handle window resize
    const onWindowResize = () => {
        if (!renderer || !camera || !container) return; // Check if objects exist
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Store resize listener reference on the container for cleanup
    container.dataset.resizeListener = onWindowResize; // Storing function directly might not work, store key/lookup
    window.demoResizeListener = onWindowResize; // Storing globally for simple access in cleanup
}

export function cleanup() {
    console.log("Starting 3D Text Cleanup");
    if (animateId) {
        cancelAnimationFrame(animateId);
        animateId = null;
        console.log("Animation frame cancelled");
    }

    // Remove resize listener
    if (window.demoResizeListener) {
        window.removeEventListener('resize', window.demoResizeListener);
        window.demoResizeListener = null;
        console.log("Resize listener removed");
    }

    // Remove error message if it exists
    const container = renderer?.domElement?.parentNode; // Get container reference before renderer disposal
    if (container) {
        const errorMsg = container.querySelector('#font-error-message');
        if (errorMsg) {
            container.removeChild(errorMsg);
            console.log("Font error message removed");
        }
    }

    // Dispose controls
    if (controls) {
        controls.dispose();
        controls = null;
        console.log("Controls disposed");
    }

    // Dispose scene objects
    if (scene) {
        if (textMesh) {
            scene.remove(textMesh);
            if (textMesh.geometry) textMesh.geometry.dispose();
            if (textMesh.material) textMesh.material.dispose();
            textMesh = null;
            console.log("TextMesh removed and disposed");
        }
        // Optionally clean up lights if they are not managed globally
        // scene.traverse(child => { ... });
        scene = null; // Allow garbage collection
        console.log("Scene nulled");
    }

    // Dispose renderer
    if (renderer) {
        renderer.dispose(); // Release WebGL resources
        console.log("Renderer disposed");
        // Renderer DOM element removal should be handled by main.js when switching demos
        renderer = null;
    }

    camera = null;
    console.log("Camera nulled");

    console.log("3D Text Cleanup Complete");
}
