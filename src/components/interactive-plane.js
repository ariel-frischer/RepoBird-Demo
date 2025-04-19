// TODO: Requires Three.js environment via npm install
// TODO: Requires browser environment for DOM access

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Physics constants
const SPRING_K = 30.0; // Spring stiffness - Reduced for less rigidity
const DAMPING = 3.0;  // Damping factor - Reduced to allow more oscillation
const MOUSE_FORCE = 25.0; // Multiplier for the force applied by mouse interaction - Significantly Increased

export function init(container) {
  let scene, camera, renderer, controls, planeMesh, raycaster, mouse, originalPositions, velocityAttribute, targetDisplacements;
  let animationFrameId;
  const clock = new THREE.Clock(); // For animation/decay

  // --- Basic Setup ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // Standardized dark background

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

  // Initialize velocity attribute and target displacements array
  const vertexCount = originalPositions.count;
  velocityAttribute = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3); // Initialize velocity (x, y, z)
  planeMesh.geometry.setAttribute('velocity', velocityAttribute); // Add velocity to geometry
  targetDisplacements = new Float32Array(vertexCount); // Initialize target displacements (stores target Z offset)


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

      // Reset target displacements for this frame before calculating new ones
      targetDisplacements.fill(0);

      if (intersects.length > 0) {
          const intersectionPoint = intersects[0].point;
          const positionAttribute = planeMesh.geometry.attributes.position;
          const vertex = new THREE.Vector3();
          const maxDistance = 2.0; // Radius of effect
          const maxWaveHeight = 2.5; // Max height of the wave caused by mouse - Increased
          const time = clock.getElapsedTime(); // Get time for wave effect


          for (let i = 0; i < positionAttribute.count; i++) {
              vertex.fromBufferAttribute(positionAttribute, i);
              // Transform vertex to world space to compare with intersection point
              const worldVertex = vertex.clone().applyMatrix4(planeMesh.matrixWorld);

              const dist = worldVertex.distanceTo(intersectionPoint);

              if (dist < maxDistance) {
                  // Calculate displacement based on distance (e.g., Gaussian-like)
                  // Calculate displacement using Gaussian falloff combined with a sine wave based on distance and time
                  const falloff = Math.exp(-(dist * dist) / (maxDistance * 0.5)); // Gaussian falloff
                  const wave = Math.sin(dist * 1.5 - time * 5.0); // Sine wave
                  const calculatedDisplacement = maxWaveHeight * falloff * wave;

                  // Store the calculated displacement as the target for this vertex
                  targetDisplacements[i] = calculatedDisplacement;
              }
          }
          // No need to set positionAttribute.needsUpdate = true here,
          // as the physics simulation in animate() handles position updates.
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
      const delta = Math.min(clock.getDelta(), 0.05); // Clamp delta to avoid instability with large steps

      // --- Physics Simulation ---
      const positionAttribute = planeMesh.geometry.attributes.position;
      const velocity = planeMesh.geometry.attributes.velocity; // Get velocity attribute

      for (let i = 0; i < positionAttribute.count; i++) {
          const originalZ = originalPositions.getZ(i);
          const currentZ = positionAttribute.getZ(i);
          const currentVelocityZ = velocity.getZ(i);

          // Calculate forces
          const displacement = currentZ - originalZ;
          const springForce = -SPRING_K * displacement; // Force pulling back to origin
          const dampingForce = -DAMPING * currentVelocityZ; // Force opposing velocity

          // Calculate force from mouse interaction (pushing towards target displacement)
          // This force is stronger if the vertex is further from its target displacement
          const targetDisplacement = targetDisplacements[i];
          const mouseInteractionForce = MOUSE_FORCE * (targetDisplacement - displacement);

          // Total force (mass assumed to be 1)
          const totalForce = springForce + dampingForce + mouseInteractionForce;

          // Update velocity (acceleration = force / mass)
          const newVelocityZ = currentVelocityZ + totalForce * delta;

          // Update position
          const newZ = currentZ + newVelocityZ * delta;

          // Set updated values
          positionAttribute.setZ(i, newZ);
          velocity.setZ(i, newVelocityZ);
      }

      // Mark attributes for update
      positionAttribute.needsUpdate = true;
      velocity.needsUpdate = true;

      // Reset target displacements for the next frame (mouse move will repopulate)
      // targetDisplacements.fill(0); // Moved this to the start of onMouseMove

      controls.update(); // Update controls if enableDamping is true
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
      if (geometry) {
          geometry.dispose(); // Dispose geometry (includes originalPositions implicitly?)
          // Explicitly dispose added attributes
          if (geometry.attributes.velocity) {
              geometry.deleteAttribute('velocity'); // Or velocityAttribute.dispose() if it works
          }
      }
      if (material) material.dispose();
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
      originalPositions = null; // BufferAttribute doesn't have dispose
      velocityAttribute = null; // BufferAttribute doesn't have dispose
      targetDisplacements = null;
      console.log('Interactive Plane cleanup complete.');
  }

  return cleanup;
}
