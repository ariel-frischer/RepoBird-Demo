// TODO: Requires Three.js environment via npm install
// TODO: Requires browser environment for DOM access

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function init(container) {
  let scene, camera, renderer, controls, planeMesh, raycaster, mouse, originalPositions;
  let animationFrameId;
  const clock = new THREE.Clock(); // For animation/decay

  // --- Basic Setup ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee); // Light gray background

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 5, 10); // Position camera

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // --- Plane ---
  const planeSize = 10;
  const segments = 50;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
  // Use MeshStandardMaterial for better lighting interaction
  const material = new THREE.MeshStandardMaterial({
      color: 0x44aa88, // Greenish color
      side: THREE.DoubleSide,
      wireframe: false, // Set to true to see segments
      roughness: 0.5,
      metalness: 0.1
  });
  planeMesh = new THREE.Mesh(geometry, material);
  planeMesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
  planeMesh.name = 'interactivePlane';
  scene.add(planeMesh);

  // Store original vertex positions
  originalPositions = planeMesh.geometry.attributes.position.clone();

  // --- Interaction ---
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Optional: adds inertia to camera movement
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0); // Focus controls on the center of the plane

  // --- Event Listeners ---
  function onMouseMove(event) {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObject(planeMesh);

      if (intersects.length > 0) {
          const intersectionPoint = intersects[0].point;
          const positionAttribute = planeMesh.geometry.attributes.position;
          const vertex = new THREE.Vector3();
          const maxDistance = 2.0; // Radius of effect
          const maxDisplacement = 0.5; // Max height of bump

          for (let i = 0; i < positionAttribute.count; i++) {
              vertex.fromBufferAttribute(positionAttribute, i);
              // Transform vertex to world space to compare with intersection point
              const worldVertex = vertex.clone().applyMatrix4(planeMesh.matrixWorld);

              const dist = worldVertex.distanceTo(intersectionPoint);

              if (dist < maxDistance) {
                  // Calculate displacement based on distance (e.g., Gaussian-like)
                  const displacement = maxDisplacement * Math.exp(-(dist * dist) / (maxDistance / 2)); // Gaussian falloff
                  //const displacement = maxDisplacement * (1 - Math.smoothstep(0, maxDistance, dist)); // Smoothstep falloff

                  // Modify the z position (which is y in the mesh's local space due to rotation)
                  const targetZ = originalPositions.getZ(i) + displacement;
                  // Smoothly move towards target Z
                  const currentZ = positionAttribute.getZ(i);
                  positionAttribute.setZ(i, currentZ + (targetZ - currentZ) * 0.1); // Smoothing factor

              }
          }
          positionAttribute.needsUpdate = true;
      }
  }

  function onWindowResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
  }

  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);

  // --- Animation Loop ---
  function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta(); // Time elapsed since last frame

      // --- Gradual Decay of Deformation ---
      const positionAttribute = planeMesh.geometry.attributes.position;
      let needsUpdate = false;
      const decayFactor = 1.0 - Math.min(delta * 5.0, 1.0); // Adjust decay speed (e.g., 5 times per second)

      for (let i = 0; i < positionAttribute.count; i++) {
          const currentZ = positionAttribute.getZ(i);
          const originalZ = originalPositions.getZ(i);
          if (Math.abs(currentZ - originalZ) > 0.01) { // Only decay if significantly displaced
             positionAttribute.setZ(i, originalZ + (currentZ - originalZ) * decayFactor);
             needsUpdate = true;
          } else if (currentZ !== originalZ) {
             // Snap back if very close to avoid tiny perpetual oscillations
             positionAttribute.setZ(i, originalZ);
             needsUpdate = true;
          }
      }

      if (needsUpdate) {
          positionAttribute.needsUpdate = true;
      }

      controls.update(delta); // Update controls if enableDamping is true
      renderer.render(scene, camera);
  }

  animate(); // Start the animation loop

  // --- Cleanup Function ---
  function cleanup() {
      cancelAnimationFrame(animationFrameId);

      // Remove event listeners
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);

      // Dispose Three.js objects
      controls.dispose();
      geometry.dispose();
      material.dispose();
      // Dispose any textures if they were used
      // texture.dispose();

      renderer.dispose();

      // Remove canvas from DOM
      if (renderer.domElement.parentNode === container) {
         container.removeChild(renderer.domElement);
      }


      // Nullify references to help garbage collection
      scene = null;
      camera = null;
      renderer = null;
      controls = null;
      planeMesh = null;
      raycaster = null;
      mouse = null;
      originalPositions = null;
      console.log('Interactive Plane cleanup complete.');
  }

  return cleanup;
}
