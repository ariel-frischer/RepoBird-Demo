""
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Constants
const PARTICLE_COUNT = 5000;
const GRAVITY = 9.8;
const MAX_LIFETIME = 3.0; // seconds

export function init(container) {
    let scene, camera, renderer, controls, clock, points;
    let geometry, material;
    let animationFrameId;

    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 15;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Clock
    clock = new THREE.Clock();

    // Particle Geometry
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const startTimes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Initial position (origin)
        positions[i3 + 0] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;

        // Initial velocity (random direction, slightly upward bias)
        velocities[i3 + 0] = (Math.random() - 0.5) * 5;
        velocities[i3 + 1] = Math.random() * 5 + 2; // Bias upwards
        velocities[i3 + 2] = (Math.random() - 0.5) * 5;

        // Initial start time (staggered)
        startTimes[i] = Math.random() * MAX_LIFETIME;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
    geometry.setAttribute('startTime', new THREE.Float32BufferAttribute(startTimes, 1));

    // Particle Material
    material = new THREE.PointsMaterial({
        size: 0.1,
        color: 0xffffff,
        // Optional: Add transparency and depth testing if needed
        // transparent: true,
        // depthWrite: false, 
        // blending: THREE.AdditiveBlending
    });

    // Points Object
    points = new THREE.Points(geometry, material);
    scene.add(points);

    // Animation Loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        const positionsAttribute = geometry.attributes.position;
        const velocitiesAttribute = geometry.attributes.velocity;
        const startTimesAttribute = geometry.attributes.startTime;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const startTime = startTimesAttribute.array[i];

            // Check lifetime
            if (elapsedTime - startTime > MAX_LIFETIME) {
                // Reset particle
                startTimesAttribute.array[i] = elapsedTime; // Use current time as new start

                positionsAttribute.array[i3 + 0] = 0;
                positionsAttribute.array[i3 + 1] = 0;
                positionsAttribute.array[i3 + 2] = 0;

                velocitiesAttribute.array[i3 + 0] = (Math.random() - 0.5) * 5;
                velocitiesAttribute.array[i3 + 1] = Math.random() * 5 + 2;
                velocitiesAttribute.array[i3 + 2] = (Math.random() - 0.5) * 5;

                continue; // Skip physics update for this frame
            }

            // Apply gravity (update velocity Y)
            velocitiesAttribute.array[i3 + 1] -= GRAVITY * deltaTime;

            // Update position based on velocity
            positionsAttribute.array[i3 + 0] += velocitiesAttribute.array[i3 + 0] * deltaTime;
            positionsAttribute.array[i3 + 1] += velocitiesAttribute.array[i3 + 1] * deltaTime;
            positionsAttribute.array[i3 + 2] += velocitiesAttribute.array[i3 + 2] * deltaTime;
        }

        // Mark attributes for update
        positionsAttribute.needsUpdate = true;
        velocitiesAttribute.needsUpdate = true;
        startTimesAttribute.needsUpdate = true; // Important for resetting particles

        controls.update(); // Update controls if damping is enabled
        renderer.render(scene, camera);
    }

    // Handle Resize
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();

    // Cleanup function
    function cleanup() {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);

        // Dispose Three.js objects
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (points) scene.remove(points);

        scene.remove(ambientLight);
        scene.remove(directionalLight);

        if (controls) controls.dispose();
        if (renderer) {
            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
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
        console.log("Particle emitter cleaned up");
    }

    return cleanup;
}
""