import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// Note: Adjust the path based on the actual file structure relative to this component
import { createNoise2D } from '../vendor/simplex-noise.js';

export function init(container) {
  if (!container) {
    console.error('Container element is required for procedural terrain init.');
    return () => {}; // Return a no-op cleanup function
  }

  let animationFrameId = null;

  // Scene Setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Camera Position
  camera.position.set(0, 50, 50);
  camera.lookAt(0, 0, 0); // Look at the center of the potential terrain

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(50, 50, 50); // Position the light
  directionalLight.castShadow = true; // Optional: if you want shadows
  scene.add(directionalLight);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Optional: makes interaction smoother
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2; // Prevent looking below the horizon

  // Noise
  const simplex = createNoise2D(); // Get the SimplexNoise instance

  // Geometry Setup
  const planeSize = 100;
  const planeSegments = 50;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, planeSegments, planeSegments);
  geometry.rotateX(-Math.PI / 2); // Rotate plane to be horizontal (XZ plane)

  // Vertex Displacement
  const positionAttribute = geometry.attributes.position;
  const scale = 20; // How "zoomed in" the noise pattern is
  const amplitude = 10; // How high the peaks and valleys are

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const z = positionAttribute.getZ(i); // Use Z for the horizontal plane coordinate

    // Calculate noise based on world position (x, z)
    const noiseValue = simplex.noise2D(x / scale, z / scale); // Call noise2D on the instance

    // Update the Y coordinate (height)
    positionAttribute.setY(i, noiseValue * amplitude);
  }
  geometry.computeVertexNormals(); // Recalculate normals for correct lighting
  positionAttribute.needsUpdate = true; // Important: notify Three.js about the changes

  // Material
  const material = new THREE.MeshStandardMaterial({
    color: 0x88aa88, // Greenish color
    wireframe: false,
    side: THREE.DoubleSide, // Render both sides, useful for wireframe or viewing from below
  });

  // Mesh
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Animation Loop
  function animate() {
    if (!renderer.domElement) return; // Stop if cleaned up
    animationFrameId = requestAnimationFrame(animate);
    controls.update(); // Only required if enableDamping or autoRotate are set to true
    renderer.render(scene, camera);
  }

  animate(); // Start the loop

  // Resize Handling
  const handleResize = () => {
    if (!container || !renderer.domElement) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  // Cleanup Function
  const cleanup = () => {
    console.log('Cleaning up procedural terrain component...');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    window.removeEventListener('resize', handleResize);

    if (mesh) {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
         if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.dispose());
        } else {
            mesh.material.dispose();
        }
      }
    }

    if(ambientLight) scene.remove(ambientLight);
    if(directionalLight) scene.remove(directionalLight);

    if (controls) controls.dispose();

    if (renderer) {
      // Check if domElement still exists and has a parent before removing
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose(); // Dispose of the renderer resources
    }

    // Optionally clear the scene explicitly, though disposing objects usually handles it
    // while (scene.children.length > 0) {
    //   scene.remove(scene.children[0]);
    // }
     console.log('Procedural terrain cleanup complete.');
  };

  return cleanup;
}
