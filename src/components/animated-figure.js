import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function init(container) {
  let scene, camera, renderer, controls, clock, mixer, model = null;
  let animationFrameId;

  // Basic Setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 5;
  camera.position.y = 2; // Slightly raise camera for better view

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0); // Point controls towards typical character height

  // Clock for AnimationMixer
  clock = new THREE.Clock();

  // GLTF Loading
  const loader = new GLTFLoader();
  loader.load(
    'models/character.gltf', // Path to the model - might not exist yet
    (gltf) => {
      model = gltf.scene;
      scene.add(model);
      console.log('Model loaded successfully', model);

      // Adjust model position/scale if needed (example)
      // model.position.y = 0;
      // model.scale.set(0.5, 0.5, 0.5);

      // Animation Handling
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations[0];
        mixer.clipAction(clip).play();
        console.log('Playing animation:', clip.name);
      } else {
        console.log('Model loaded, but no animations found.');
      }
    },
    undefined, // onProgress callback (optional)
    (error) => {
      console.error('Error loading model:', error);
      // Optionally display an error message in the container
      const errorElement = document.createElement('div');
      errorElement.innerText = 'Error loading character model. See console for details.';
      errorElement.style.color = 'red';
      errorElement.style.position = 'absolute';
      errorElement.style.top = '10px';
      errorElement.style.left = '10px';
      container.appendChild(errorElement);
    }
  );

  // Animation Loop
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    controls.update(); // Required if enableDamping is true

    if (mixer) {
      mixer.update(deltaTime);
    }

    renderer.render(scene, camera);
  }

  animate(); // Start the loop

  // Handle window resize
  function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
  }
  // Using ResizeObserver for better container resize detection
  const resizeObserver = new ResizeObserver(onWindowResize);
  resizeObserver.observe(container);


  // Return cleanup function
  const cleanup = () => {
    console.log('Cleaning up animated-figure');
    cancelAnimationFrame(animationFrameId);
    resizeObserver.unobserve(container); // Stop observing resize

    // Dispose controls
    if (controls) {
      controls.dispose();
    }

    // Dispose renderer and remove canvas
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }

    // Dispose of GLTF resources
    if (model) {
      model.traverse((object) => {
        if (object.isMesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                 if (material.map) material.map.dispose();
                 // Add other texture types if used (normalMap, etc.)
                 material.dispose();
              });
            } else {
               if (object.material.map) object.material.map.dispose();
               // Add other texture types if used
               object.material.dispose();
            }
          }
        }
      });
      scene.remove(model); // Remove model from scene after traversal
    }

    // Dispose lights (optional but good practice)
    scene.remove(ambientLight);
    scene.remove(directionalLight);
    ambientLight.dispose(); // Lights don't have dispose methods in older Three.js? Check docs if needed.
    directionalLight.dispose();

    // Nullify variables to help GC
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    clock = null;
    mixer = null;
    model = null;

    // Remove any error messages added
    const errorElement = container.querySelector('div[style*="color: red"]');
    if (errorElement && errorElement.parentNode === container) {
      container.removeChild(errorElement);
    }
  };

  return cleanup;
}
