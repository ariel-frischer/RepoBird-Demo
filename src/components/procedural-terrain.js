import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Updated import path
import { createNoise2D } from '../vendor/simplex-noise.js';

export function init(container) {
  if (!container) {
    console.error('Container element is required for procedural terrain init.');
    return () => {}; // Return a no-op cleanup function
  }

  let animationFrameId = null;
  let lastTime = performance.now();

  // Scene Setup
  const scene = new THREE.Scene();

  // Fog
  const fogColor = 0xcccccc; // Light grey fog
  const fogDensity = 0.0075; // Adjust this for desired effect
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);

  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(fogColor); // Match fog color to background
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

  // Controls - Keyboard
  const keyState = {};
  const onKeyDown = (event) => { keyState[event.code] = true; };
  const onKeyUp = (event) => { keyState[event.code] = false; };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Noise
  const simplex = createNoise2D(); // Get the SimplexNoise instance

  // Geometry Setup
  const planeSize = 100;
  const planeSegments = 20;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, planeSegments, planeSegments);
  geometry.rotateX(-Math.PI / 2); // Rotate plane to be horizontal (XZ plane)

  // Vertex Displacement and Min/Max Y calculation
  const positionAttribute = geometry.attributes.position;
  const scale = 20; // How "zoomed in" the noise pattern is
  const amplitude = 10; // How high the peaks and valleys are

  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const z = positionAttribute.getZ(i);

    const noiseValue = simplex.noise2D(x / scale, z / scale);
    const y = noiseValue * amplitude;
    positionAttribute.setY(i, y);

    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  geometry.computeVertexNormals(); // Recalculate normals for correct lighting
  positionAttribute.needsUpdate = true; // Important: notify Three.js about the changes

  // Vertex Colors
  const colors = new Float32Array(positionAttribute.count * 3);
  const reusableColor = new THREE.Color(); // Create a reusable Color object

  const waterColor = new THREE.Color(0x4466aa);
  const grassColor = new THREE.Color(0x66aa66);
  const rockColor = new THREE.Color(0xaa8866);
  const snowColor = new THREE.Color(0xffffff);

  for (let i = 0; i < positionAttribute.count; i++) {
    const y = positionAttribute.getY(i);
    // Normalize height from minY to maxY to 0-1 range
    const normalizedHeight = (maxY === minY) ? 0.5 : (y - minY) / (maxY - minY);

    if (normalizedHeight < 0.2) {
      reusableColor.copy(waterColor);
    } else if (normalizedHeight < 0.4) {
      reusableColor.copy(waterColor).lerp(grassColor, (normalizedHeight - 0.2) / 0.2);
    } else if (normalizedHeight < 0.7) {
      reusableColor.copy(grassColor).lerp(rockColor, (normalizedHeight - 0.4) / 0.3);
    } else {
      reusableColor.copy(rockColor).lerp(snowColor, (normalizedHeight - 0.7) / 0.3);
    }

    colors[i * 3] = reusableColor.r;
    colors[i * 3 + 1] = reusableColor.g;
    colors[i * 3 + 2] = reusableColor.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Material
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, // Use vertex colors
    side: THREE.DoubleSide, // Render both sides, useful for wireframe or viewing from below
    flatShading: true
  });

  // Mesh
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Animation Loop
  function animate() {
    if (!renderer.domElement) return; // Stop if cleaned up
    animationFrameId = requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // seconds
    lastTime = currentTime;

    const moveSpeed = 50.0; // Units per second
    const rotateSpeed = 1.5; // Radians per second

    // Movement
    if (keyState['KeyW']) {
      camera.translateZ(-moveSpeed * deltaTime);
    }
    if (keyState['KeyS']) {
      camera.translateZ(moveSpeed * deltaTime);
    }
    if (keyState['KeyA']) {
      camera.translateX(-moveSpeed * deltaTime);
    }
    if (keyState['KeyD']) {
      camera.translateX(moveSpeed * deltaTime);
    }
    if (keyState['Space']) { // Fly up
        camera.position.y += moveSpeed * deltaTime;
    }
    if (keyState['ShiftLeft'] || keyState['ControlLeft']) { // Fly down
        camera.position.y -= moveSpeed * deltaTime;
    }


    // Rotation
    if (keyState['ArrowUp']) {
      camera.rotateX(rotateSpeed * deltaTime);
    }
    if (keyState['ArrowDown']) {
      camera.rotateX(-rotateSpeed * deltaTime);
    }
    if (keyState['ArrowLeft']) {
      camera.rotateY(rotateSpeed * deltaTime);
    }
    if (keyState['ArrowRight']) {
      camera.rotateY(-rotateSpeed * deltaTime);
    }
    
    // Optional: Prevent camera from going too low (e.g., below terrain minY + a small offset)
    // This is a very basic check. A more robust solution would involve raycasting or checking against terrain height at camera's XZ.
    // For now, let's use a fixed minimum height slightly above the lowest possible terrain point.
    const minCameraHeight = minY + 2.0; // 2 units above lowest terrain point
    if (camera.position.y < minCameraHeight) {
        camera.position.y = minCameraHeight;
    }


    // controls.update(); // Removed OrbitControls
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
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);

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
    
    scene.fog = null; // Remove fog from scene

    // if (controls) controls.dispose(); // Removed OrbitControls

    if (renderer) {
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }
     console.log('Procedural terrain cleanup complete.');
  };

  return cleanup;
}
