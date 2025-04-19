
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'lil-gui';

export function init(container) {
    let scene, camera, renderer, controls, clock, points, gui;
    let geometry, material;
    let animationFrameId;

    // Configuration object
    const config = {
        particleCount: 5000, // Keep existing
        particleSize: 0.1,   // Keep existing
        gravity: -9.8, // Start with negative gravity for upward effect initially
        maxLifetime: 3.0,
        initialVelocityRangeXZ: 5.0, // Controls X and Z spread
        initialVelocityBaseY: 2.0,   // Base Y velocity
        initialVelocityRangeY: 5.0,  // Random Y velocity range on top of base
        particleColor: 0xffffff
    };

    // --- Basic Setup (Scene, Camera, Renderer, Lights, Controls, Clock) ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 15;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    clock = new THREE.Clock();

    // --- Particle System --- 
    function setupParticles() {
        // If existing points object exists, remove it and dispose geometry/material
        if (points) {
            scene.remove(points);
            if (geometry) geometry.dispose();
            if (material) material.dispose();
        }

        geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.particleCount * 3);
        const velocities = new Float32Array(config.particleCount * 3);
        const startTimes = new Float32Array(config.particleCount);

        for (let i = 0; i < config.particleCount; i++) {
            resetParticle(i, positions, velocities, startTimes, 0, true); // Initialize all particles
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        geometry.setAttribute('startTime', new THREE.Float32BufferAttribute(startTimes, 1));

        material = new THREE.PointsMaterial({
            size: config.particleSize,
            color: config.particleColor,
            // Optional: Add transparency and depth testing if needed
            // transparent: true,
            // depthWrite: false,
            // blending: THREE.AdditiveBlending
        });

        points = new THREE.Points(geometry, material);
        scene.add(points);
    }

    function resetParticle(index, positions, velocities, startTimes, elapsedTime, initialize = false) {
        const i3 = index * 3;

        // Use current time as new start, or stagger if initializing
        startTimes[index] = initialize ? Math.random() * config.maxLifetime : elapsedTime; 

        // Initial position (origin)
        positions[i3 + 0] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;

        // Initial velocity (using config values)
        velocities[i3 + 0] = (Math.random() - 0.5) * config.initialVelocityRangeXZ;
        velocities[i3 + 1] = Math.random() * config.initialVelocityRangeY + config.initialVelocityBaseY;
        velocities[i3 + 2] = (Math.random() - 0.5) * config.initialVelocityRangeXZ;
    }

    // --- GUI Setup --- 
    gui = new GUI();
    gui.add(config, 'gravity', -20, 20, 0.1).name('Gravity');
    gui.add(config, 'maxLifetime', 0.5, 10, 0.1).name('Max Lifetime (s)');
    gui.add(config, 'initialVelocityRangeXZ', 0, 20, 0.1).name('Velocity Range XZ');
    gui.add(config, 'initialVelocityBaseY', 0, 20, 0.1).name('Velocity Base Y');
    gui.add(config, 'initialVelocityRangeY', 0, 20, 0.1).name('Velocity Range Y');
    gui.addColor(config, 'particleColor').name('Particle Color').onChange((value) => {
      if (material) { // Safety check
          material.color.set(value);
      }
    });
    // Optional controls (not requested in this task):
    // gui.add(config, 'particleCount', 100, 10000, 100).name('Particle Count').onFinishChange(setupParticles);
    // gui.add(config, 'particleSize', 0.01, 0.5, 0.01).name('Particle Size').onChange((value) => {
    //   if (material) {
    //       material.size = value;
    //   }
    // });

    // --- Animation Loop --- 
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        if (!geometry || !material || !points) return; // Safety check

        const positionsAttribute = geometry.attributes.position;
        const velocitiesAttribute = geometry.attributes.velocity;
        const startTimesAttribute = geometry.attributes.startTime;

        let needsReset = false;
        for (let i = 0; i < config.particleCount; i++) {
            const i3 = i * 3;
            const startTime = startTimesAttribute.array[i];

            // Check lifetime
            if (elapsedTime - startTime > config.maxLifetime) {
                resetParticle(i, positionsAttribute.array, velocitiesAttribute.array, startTimesAttribute.array, elapsedTime);
                needsReset = true;
                continue; // Skip physics update for this frame
            }

            // Apply gravity (update velocity Y) - using config value
            velocitiesAttribute.array[i3 + 1] += config.gravity * deltaTime; // Note: += for gravity effect

            // Update position based on velocity
            positionsAttribute.array[i3 + 0] += velocitiesAttribute.array[i3 + 0] * deltaTime;
            positionsAttribute.array[i3 + 1] += velocitiesAttribute.array[i3 + 1] * deltaTime;
            positionsAttribute.array[i3 + 2] += velocitiesAttribute.array[i3 + 2] * deltaTime;
        }

        // Mark attributes for update
        positionsAttribute.needsUpdate = true;
        if (needsReset) { // Only update velocity/startTime if particles were reset
            velocitiesAttribute.needsUpdate = true;
            startTimesAttribute.needsUpdate = true;
        }

        controls.update(); // Update controls if damping is enabled
        renderer.render(scene, camera);
    }

    // --- Event Listeners --- 
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onWindowResize);

    // --- Initialization --- 
    setupParticles(); // Initial particle setup
    animate(); // Start animation

    // --- Cleanup Function --- 
    function cleanup() {
        console.log("Cleaning up Particle Emitter...");
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);

        // Destroy GUI
        if (gui) {
            gui.destroy();
            gui = null;
        }

        // Dispose Three.js objects
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (points) scene.remove(points);

        scene.remove(ambientLight);
        scene.remove(directionalLight);

        if (controls) controls.dispose();
        if (renderer) {
            renderer.dispose();
            // Check if the renderer element is still in the container before removing
            if (renderer.domElement && renderer.domElement.parentNode === container) {
                try {
                    container.removeChild(renderer.domElement);
                } catch (e) {
                    console.error("Error removing renderer DOM element:", e);
                }
            }
        }

        // Clear references
        scene = null;
        camera = null;
        renderer = null;
        controls = null;
        clock = null;
        points = null;
        geometry = null;
        material = null;
        animationFrameId = null;
        // config is local to init, no need to nullify explicitly
        console.log("Particle emitter cleaned up");
    }

    // Return the cleanup function
    return cleanup;
}
