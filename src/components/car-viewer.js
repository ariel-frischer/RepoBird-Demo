import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function init(container) {
    let scene, camera, renderer, controls, model, animationFrameId;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 2, 10); // Adjust initial camera position

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Optional damping effect
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Softer ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Stronger directional light
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // GLTF Loader setup
    const loader = new GLTFLoader();
    // Note: The path 'models/car.gltf.txt' assumes the web server serves 'models' from the root.
    // If the file is served relative to the HTML file's location, this path should work.
    loader.load(
        'models/car.gltf.txt', // Path relative to the HTML file or served root
        function (gltf) {
            model = gltf.scene;

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // Calculate scale factor to fit within a desired size (e.g., max dimension = 5)
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) { // Avoid division by zero
                const scale = 5 / maxDim;
                model.scale.set(scale, scale, scale);
            }


            // Recalculate box and center after scaling
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

            // Translate model to origin
            model.position.sub(scaledCenter);


            scene.add(model);
            console.log('Model loaded successfully.');
        },
        undefined, // onProgress callback (optional)
        function (error) {
            console.error('An error happened loading the model:', error);
        }
    );

    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        controls.update(); // Only required if enableDamping or autoRotate are set to true
        renderer.render(scene, camera);
    }

    // Handle window resize
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onWindowResize);


    animate(); // Start the animation loop

    // Cleanup function
    function cleanup() {
        console.log('Cleaning up car-viewer');
        window.removeEventListener('resize', onWindowResize);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (controls) {
            controls.dispose();
        }
        if (renderer) {
            // Dispose geometries and materials in the loaded model
            if (model) {
                model.traverse((object) => {
                    if (object.isMesh) {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => material.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    }
                });
                scene.remove(model); // Remove model from scene
            }

             // Dispose scene lights etc if needed (though often shared)
            scene.remove(ambientLight);
            scene.remove(directionalLight);

            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                 container.removeChild(renderer.domElement);
            }
        }

        // Optional: Clear scene children more broadly if necessary
        // while(scene.children.length > 0){
        //     scene.remove(scene.children[0]);
        // }

    }

    return cleanup;
}
