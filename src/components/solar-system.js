import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function init(container) {
    let scene, camera, renderer, clock, controls, animationFrameId;
    const planets = []; // To store pivot objects for cleanup
    const orbitMeshes = []; // To store orbit meshes for cleanup

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    clock = new THREE.Clock();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 35; // Adjusted for larger system
    camera.position.y = 15; // Adjusted for larger system

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
        { name: 'Mercury', radius: 0.4, color: 0xaaaaaa, orbitalRadius: 4, speed: 0.5 },
        { name: 'Venus', radius: 0.7, color: 0xffd700, orbitalRadius: 6, speed: 0.4 },
        { name: 'Earth', radius: 0.8, color: 0x0000ff, orbitalRadius: 8, speed: 0.3 },
        { name: 'Mars', radius: 0.6, color: 0xff0000, orbitalRadius: 11, speed: 0.25 },
        { name: 'Jupiter', radius: 2.0, color: 0xffa500, orbitalRadius: 16, speed: 0.15 },
        { name: 'Saturn', radius: 1.7, color: 0xf4a460, orbitalRadius: 21, speed: 0.1 },
        { name: 'Uranus', radius: 1.2, color: 0xadd8e6, orbitalRadius: 26, speed: 0.05 },
        { name: 'Neptune', radius: 1.1, color: 0x00008b, orbitalRadius: 30, speed: 0.03 }
    ];

    // Create Planets and Orbits
    planetData.forEach(data => {
        // Planet
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

        // Orbit Visual
        const orbitRadius = data.orbitalRadius;
        const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.05, orbitRadius + 0.05, 64); // Use RingGeometry for a thin line
        const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, opacity: 0.3, transparent: true });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2; // Rotate to lie flat on the XZ plane
        scene.add(orbitMesh);
        orbitMeshes.push(orbitMesh); // Add orbit mesh for cleanup
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

        // Dispose orbit geometries and materials
        orbitMeshes.forEach(orbitMesh => {
            if (orbitMesh.geometry) {
                orbitMesh.geometry.dispose();
            }
            if (orbitMesh.material) {
                orbitMesh.material.dispose();
            }
            scene.remove(orbitMesh); // Remove orbit mesh from scene
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
