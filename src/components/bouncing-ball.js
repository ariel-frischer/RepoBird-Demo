import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Import OrbitControls

export function init(container) {
    let animationFrameId;
    let scene, camera, renderer, clock, controls; // Add controls variable
    let ball, floor;
    let velocity = new THREE.Vector3(0, 0, 0); // Initial velocity
    const gravity = new THREE.Vector3(0, -9.8, 0);
    const raycaster = new THREE.Raycaster(); // Add Raycaster
    const mouse = new THREE.Vector2();       // Add mouse vector
    const restitution = 0.8; // Bounciness
    const ballRadius = 0.5;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Optional: makes camera movement smoother
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Configure shadow properties for the light
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;


    // Ball
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red ball
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 5, 0); // Start above the floor
    ball.castShadow = true; // Ball casts shadows
    scene.add(ball);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    floor.position.y = 0; // Position at the base
    floor.receiveShadow = true; // Floor receives shadows
    scene.add(floor);

    // Clock for delta time
    clock = new THREE.Clock();

    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();

        // Apply gravity
        velocity.addScaledVector(gravity, deltaTime);

        // Update position
        ball.position.addScaledVector(velocity, deltaTime);

        // Floor collision detection
        if (ball.position.y < ballRadius) {
            ball.position.y = ballRadius; // Correct position
            velocity.y *= -restitution; // Reverse and dampen vertical velocity

            // Optional: Stop bounce if velocity is very small to prevent jittering
            if (Math.abs(velocity.y) < 0.1) {
                 velocity.y = 0;
            }
        }

        // Update controls
        controls.update(); // Required if enableDamping is true

        // Render the scene
        renderer.render(scene, camera);
    }

    // Handle window resize
    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onWindowResize);

    // Handle mouse clicks
    function onMouseDown(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObject(ball); // Check only against the ball

        if (intersects.length > 0) {
            // Ball was clicked, give it an upward velocity
            velocity.y = 5; // Adjust this value for desired bounce height
            // Optional: Move the ball slightly up immediately to avoid getting stuck
            ball.position.y = Math.max(ball.position.y, ballRadius + 0.01);
        }
    }
    renderer.domElement.addEventListener('mousedown', onMouseDown);


    // Start animation
    animate();

    // Cleanup function
    function cleanup() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        window.removeEventListener('resize', onWindowResize);
        renderer.domElement.removeEventListener('mousedown', onMouseDown); // Remove click listener

        // Dispose controls
        if (controls) {
            controls.dispose();
        }

        // Dispose Three.js objects
        scene.remove(ball);
        ball.geometry.dispose();
        ball.material.dispose();

        scene.remove(floor);
        floor.geometry.dispose();
        floor.material.dispose();

        scene.remove(ambientLight);
        scene.remove(directionalLight);

        if (renderer.domElement.parentElement) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
        console.log('Bouncing ball demo cleaned up');
    }

    console.log('Bouncing ball demo initialized');
    return cleanup;
}
