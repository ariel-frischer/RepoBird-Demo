import * as THREE from 'three';

export function init(container) {
    let animationFrameId;
    let scene, camera, renderer, clock;
    let ball, floor;
    let velocity = new THREE.Vector3(0, 0, 0); // Initial velocity
    const gravity = new THREE.Vector3(0, -9.8, 0);
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

        // Render the scene
        if (renderer) {
            renderer.render(scene, camera);
        }
    }

    // Handle window resize
    function onWindowResize() {
        if (camera && renderer && container) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
    window.addEventListener('resize', onWindowResize);


    // Start animation
    animate();

    // Cleanup function
    function cleanup() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        window.removeEventListener('resize', onWindowResize);

        // Dispose Three.js objects
        if (scene && ball) {
            scene.remove(ball);
        }
        if (ball && ball.geometry) ball.geometry.dispose();
        if (ball && ball.material) ball.material.dispose();

        if (scene && floor) {
            scene.remove(floor);
        }
        if (floor && floor.geometry) floor.geometry.dispose();
        if (floor && floor.material) floor.material.dispose();

        if (scene && ambientLight) scene.remove(ambientLight);
        if (scene && directionalLight) scene.remove(directionalLight);

        // Check renderer and domElement before removing and disposing
        if (renderer && renderer.domElement && renderer.domElement.parentElement) {
            // Assuming container is always valid if renderer.domElement.parentElement exists
            renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
        if (renderer) {
            renderer.dispose();
        }
        console.log('Bouncing ball demo cleaned up');

        // Nullify references
        scene = null;
        camera = null;
        renderer = null;
        clock = null;
        ball = null;
        floor = null;
    }

    console.log('Bouncing ball demo initialized');
    return cleanup;
}
