import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function init(container) {
    let scene, camera, renderer, clock, controls, animationFrameId;
    const planets = []; // To store pivot objects for cleanup

    // Scene setup
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 20;
    camera.position.y = 10;

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

    // Sun
    const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: false }); // Basic material, emissive
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Planets Data (radius, color, orbitalRadius, speed)
    const planetData = [
        { name: 'Mercury', radius: 0.5, color: 0xaaaaaa, orbitalRadius: 4, speed: 0.5 },
        { name: 'Earth', radius: 0.8, color: 0x0000ff, orbitalRadius: 7, speed: 0.3 },
        { name: 'Mars', radius: 0.6, color: 0xff0000, orbitalRadius: 10, speed: 0.2 },
    ];

    // Create Planets
    planetData.forEach(data => {
        const planetGeometry = new THREE.SphereGeometry(data.radius, 16, 16);
        const planetMaterial = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1 });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);

        // Pivot for orbit
        const pivot = new THREE.Object3D();
        pivot.add(planet);
        planet.position.x = data.orbitalRadius;
        pivot.userData.speed = data.speed; // Store speed for animation

        scene.add(pivot);
        planets.push(pivot); // Add pivot to array for animation and cleanup
    });

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Animate planets
        planets.forEach(pivot => {
            pivot.rotation.y = elapsedTime * pivot.userData.speed;
        });

        controls.update();
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
        console.log('Cleaning up Solar System demo');
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);

        controls.dispose();

        // Dispose geometries and materials
        sunGeometry.dispose();
        sunMaterial.dispose();

        planets.forEach(pivot => {
            const planetMesh = pivot.children[0]; // Assuming the first child is the planet mesh
            if (planetMesh && planetMesh.geometry) {
                planetMesh.geometry.dispose();
            }
            if (planetMesh && planetMesh.material) {
                planetMesh.material.dispose();
            }
            scene.remove(pivot); // Remove pivot from scene
        });
        scene.remove(sun);
        scene.remove(ambientLight);
        scene.remove(directionalLight);

        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }
    }

    return cleanup;
}
