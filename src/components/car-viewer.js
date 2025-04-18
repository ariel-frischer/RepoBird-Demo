import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls, model, animationFrameId;

function init(container) {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee); // Basic background

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Camera Position
    camera.position.set(0, 2, 5);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;

    // GLTF Loader
    const loader = new GLTFLoader();

    // Load Model
    loader.load(
        'models/car.gltf', // This path assumes a 'models' directory at the project root
        (gltf) => {
            console.log('GLTF model loaded successfully.');
            model = gltf.scene;
            // Optional: Scale and center the model if needed
            // const box = new THREE.Box3().setFromObject(model);
            // const center = box.getCenter(new THREE.Vector3());
            // model.position.sub(center); // center the model
            // const size = box.getSize(new THREE.Vector3());
            // const maxDim = Math.max(size.x, size.y, size.z);
            // const scale = 5 / maxDim; // Adjust scale factor as needed
            // model.scale.setScalar(scale);

            scene.add(model);
            console.log('Model added to scene.');
        },
        undefined, // onProgress callback (optional)
        (error) => {
            console.error('Error loading GLTF model:', error);
            // Display error message in the container
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Error loading model. See console for details.';
            errorMsg.style.color = 'red';
            errorMsg.style.position = 'absolute';
            errorMsg.style.top = '10px';
            errorMsg.style.left = '10px';
            container.appendChild(errorMsg);
        }
    );

    // Resize handler
    const onWindowResize = () => {
        if (!container || !renderer) return; // Check if cleanup has happened
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);


    // Animation Loop
    const animate = () => {
        if (!renderer) return; // Stop loop if cleanup called
        animationFrameId = requestAnimationFrame(animate);
        controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
        renderer.render(scene, camera);
    };

    // Start Animation
    animate();

    // Return cleanup function
    return () => cleanup(container, onWindowResize);
}

function cleanup(container, onWindowResize) {
    console.log('Cleaning up car-viewer...');
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    window.removeEventListener('resize', onWindowResize);


    if (controls) {
        controls.dispose();
        controls = null;
    }

    // Dispose Scene Contents
    if (scene) {
         // Dispose loaded model resources
        if (model) {
            model.traverse(obj => {
                if (obj.geometry) {
                    obj.geometry.dispose();
                    console.log('Disposed geometry for:', obj.name || obj.type);
                }
                if (obj.material) {
                    // If material is an array, dispose each element
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(material => {
                            if (material.map) material.map.dispose();
                             if (material.metalnessMap) material.metalnessMap.dispose();
                             if (material.normalMap) material.normalMap.dispose();
                             if (material.roughnessMap) material.roughnessMap.dispose();
                             // Dispose other potential maps
                            material.dispose();
                            console.log('Disposed material (array element) for:', obj.name || obj.type);
                        });
                    } else {
                        // Dispose single material
                        if (obj.material.map) obj.material.map.dispose();
                         if (obj.material.metalnessMap) obj.material.metalnessMap.dispose();
                         if (obj.material.normalMap) obj.material.normalMap.dispose();
                         if (obj.material.roughnessMap) obj.material.roughnessMap.dispose();
                        obj.material.dispose();
                        console.log('Disposed material for:', obj.name || obj.type);
                    }
                }
                 if (obj.texture) {
                    obj.texture.dispose();
                    console.log('Disposed texture for:', obj.name || obj.type);
                 }
            });
            scene.remove(model);
             console.log('Removed model from scene.');
        }
        // Dispose other scene objects (lights, etc. - usually not strictly necessary unless complex)
        while(scene.children.length > 0){
            scene.remove(scene.children[0]);
        }
         scene = null;
    }


    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentElement === container) {
             container.removeChild(renderer.domElement);
        }
         renderer = null;
    }

    camera = null;
    model = null; // Ensure model reference is cleared
    animationFrameId = null;

    console.log('Car-viewer cleanup complete.');
}

export { init };
