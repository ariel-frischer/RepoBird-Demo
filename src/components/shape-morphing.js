
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Initializes the shape morphing demo.
 *
 * @param {HTMLElement} container The container element to render the demo into.
 * @returns {Function} A cleanup function to stop the animation and dispose resources.
 */
export function init(container) {
  if (!container) {
    console.error('Shape Morphing: Container element not provided.');
    return () => {}; // Return a no-op cleanup function
  }

  let isAnimating = true;
  let animationFrameId;

  // Basic Three.js Setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  camera.position.z = 3;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);

  // Geometry Creation & Morph Target Setup
  const baseGeometry = new THREE.SphereGeometry(1, 32, 16);
  const basePositionAttribute = baseGeometry.attributes.position;
  const vertexCount = basePositionAttribute.count;
  const targetPositionArray = new Float32Array(vertexCount * 3);
  const tempVertex = new THREE.Vector3();

  for (let i = 0; i < vertexCount; i++) {
    tempVertex.fromBufferAttribute(basePositionAttribute, i);

    // Project sphere vertex onto a cube
    const x = tempVertex.x;
    const y = tempVertex.y;
    const z = tempVertex.z;
    const maxAbs = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));

    // Scale the vertex to lie on the cube surface
    if (maxAbs > 0) { // Avoid division by zero for center vertex if any
        tempVertex.multiplyScalar(1 / maxAbs);
    }

    targetPositionArray[i * 3] = tempVertex.x;
    targetPositionArray[i * 3 + 1] = tempVertex.y;
    targetPositionArray[i * 3 + 2] = tempVertex.z;
  }

  const targetPositionAttribute = new THREE.Float32BufferAttribute(targetPositionArray, 3);
  baseGeometry.morphAttributes.position = [targetPositionAttribute];

  // Material
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    morphTargets: true,
    metalness: 0.1,
    roughness: 0.5
  });

  // Mesh
  const mesh = new THREE.Mesh(baseGeometry, material);
  scene.add(mesh);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Animation Loop
  function animate() {
    if (!isAnimating) return;

    animationFrameId = requestAnimationFrame(animate);

    controls.update();

    // Calculate morph influence (oscillates between 0 and 1)
    const influence = (Math.sin(Date.now() * 0.001) + 1) / 2;
    if (mesh.morphTargetInfluences) { // Ensure morphTargetInfluences exists
        mesh.morphTargetInfluences[0] = influence;
    }

    renderer.render(scene, camera);
  }

  // Handle window resize
  const handleResize = () => {
      if (!container) return; // Check if container still exists
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  // Start animation
  animate();

  // Cleanup function
  function cleanup() {
    isAnimating = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener('resize', handleResize);

    if (controls) controls.dispose();
    if (baseGeometry) baseGeometry.dispose();
    if (material) material.dispose();
    if (renderer) {
        if (renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
    }

    // Clean up scene children if necessary (meshes, lights, etc.)
    // Three.js doesn't automatically dispose of everything in the scene
    while(scene.children.length > 0){
        const object = scene.children[0];
        if(object.geometry) object.geometry.dispose();
        if(object.material) {
            // If the material is an array, dispose each element
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        scene.remove(object);
    }

    console.log('Shape Morphing: Cleaned up resources.');
  }

  return cleanup;
}
