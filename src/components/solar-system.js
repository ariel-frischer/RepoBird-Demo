import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function init(container) {
    // Check if container is provided and valid
    if (!container || !(container instanceof HTMLElement)) {
        console.error("Initialization failed: container element not provided or invalid.");
        // Return a no-op cleanup function and null scene
        return { cleanup: () => {}, scene: null };
    }

    let scene, camera, renderer, clock, controls, animationFrameId, earthMesh;
    const planets = []; // To store pivot objects for cleanup
    const textureLoader = new THREE.TextureLoader(); // Instantiate TextureLoader

    // Load textures
    // Use placeholder paths for now, actual paths might differ or require setup
    const sunTexturePath = 'src/assets/textures/sun_texture.jpg';
    const earthTexturePath = 'src/assets/textures/earth_texture.jpg';
    let sunTexture, earthTexture;
    try {
        sunTexture = textureLoader.load(sunTexturePath);
        earthTexture = textureLoader.load(earthTexturePath);
        // Add error handling for texture loading
        textureLoader.manager.onError = (url) => console.error(`Error loading texture: ${url}`);
    } catch (error) {
        console.error("Error initializing TextureLoader or loading textures:", error);
        // If textures fail, maybe proceed with basic materials or return error?
        // For now, log error and continue, materials will be basic.
        sunTexture = null; // Ensure these are null if loading fails
        earthTexture = null;
    }


    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
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
    // Apply sun texture if loaded, otherwise basic yellow
    const sunMaterial = sunTexture
        ? new THREE.MeshBasicMaterial({ map: sunTexture, name: 'SunMaterial' })
        : new THREE.MeshBasicMaterial({ color: 0xffff00, name: 'SunMaterialFallback' });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.name = 'Sun'; // Assign name for testing
    scene.add(sun);

    // Planets Data (radius, color, orbitalRadius, speed)
    const planetData = [
        { name: 'Mercury', radius: 0.5, color: 0xaaaaaa, orbitalRadius: 4, speed: 0.5 },
        { name: 'Earth', radius: 0.8, color: 0x0000ff, orbitalRadius: 7, speed: 0.3 }, // Earth data
        { name: 'Mars', radius: 0.6, color: 0xff0000, orbitalRadius: 10, speed: 0.2 },
    ];

    // Create Planets
    planetData.forEach(data => {
        const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32); // Increased segments for texture
        let planetMaterial;

        if (data.name === 'Earth') {
            // Apply earth texture if loaded, otherwise basic blue
            planetMaterial = earthTexture
                ? new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.8, metalness: 0.1, name: 'EarthMaterial' })
                : new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1, name: 'EarthMaterialFallback' });
        } else {
            planetMaterial = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1, name: `${data.name}Material` });
        }

        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.name = data.name; // Assign name for identification

        // Pivot for orbit
        const pivot = new THREE.Object3D();
        pivot.name = `${data.name}Pivot`; // Name the pivot too
        pivot.add(planet);
        planet.position.x = data.orbitalRadius;
        pivot.userData.speed = data.speed; // Store speed for animation

        scene.add(pivot);
        planets.push(pivot); // Add pivot to array for animation and cleanup

        // Store Earth mesh reference
        if (data.name === 'Earth') {
            earthMesh = planet;
        }
    });

    // Create Moon
    if (earthMesh) { // Only create moon if Earth was created
        const moonGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9, name: 'MoonMaterial' });
        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
        moonMesh.name = 'Moon';

        // Position moon relative to Earth
        moonMesh.position.set(1.5, 0, 0); // Orbit distance from Earth surface

        // Add moon as a child of Earth mesh
        earthMesh.add(moonMesh);
    } else {
        console.warn("Earth mesh not found during initialization, cannot add moon.");
    }


    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Animate planets orbital rotation (pivots)
        planets.forEach(pivot => {
            pivot.rotation.y = elapsedTime * pivot.userData.speed;
        });

        // Animate Earth's axial rotation
        if (earthMesh) {
            earthMesh.rotation.y += 0.005; // Earth spins on its axis
             // Animate Moon's rotation around Earth (relative to Earth's frame)
            const moon = earthMesh.getObjectByName('Moon');
            if (moon) {
                // This makes the moon orbit Earth as Earth spins.
                // If we want moon orbit independent of Earth spin, attach moon to a pivot parented to Earth.
                // For simplicity, we'll rotate the moon directly for now.
                // A simple rotation around Earth's Y axis (local)
                // moon.rotation.y += 0.01; // Moon could spin itself
                // To make it orbit, we could rotate the *parent* but moon is direct child.
                // Let's rotate earthMesh's child moon around earthmesh's center.
                // This requires moving the moon out and rotating a pivot, or complex math.
                // For now, let's just let it be attached and spin with earth + slightly faster
                 moon.rotation.y += 0.01; // Moon spins slightly faster than earth
            }
        }


        controls.update();
        renderer.render(scene, camera);
    }

    // Handle Resize
    function onWindowResize() {
        if (!container) return; // Prevent errors if container is gone
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return; // Avoid issues with 0 dimensions

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();

    // Cleanup function
    function cleanup() {
        console.log('Cleaning up Solar System demo');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);

        if (controls) controls.dispose();

        // Dispose textures only if they were loaded
        if (sunTexture) sunTexture.dispose();
        if (earthTexture) earthTexture.dispose();

        // Dispose geometries and materials
        // Make sure objects exist before accessing properties
        if (sun && sun.geometry) sun.geometry.dispose();
        if (sun && sun.material) sun.material.dispose();

        planets.forEach(pivot => {
            // Iterate through children safely
            if (pivot && pivot.children) {
                pivot.children.forEach(child => {
                    if (child instanceof THREE.Mesh) {
                        const mesh = child;
                         // Dispose moon resources if this is Earth
                        if (mesh.name === 'Earth' && mesh.children) {
                            mesh.children.forEach(grandchild => {
                                if (grandchild instanceof THREE.Mesh && grandchild.name === 'Moon') {
                                    if (grandchild.geometry) grandchild.geometry.dispose();
                                    if (grandchild.material) grandchild.material.dispose();
                                }
                            });
                            // Clear children array after disposing
                            mesh.children.length = 0;
                        }
                         // Dispose planet resources
                        if (mesh.geometry) mesh.geometry.dispose();
                        if (mesh.material) mesh.material.dispose();
                    }
                });
                 // Clear children array after disposing
                 pivot.children.length = 0;
            }
            if (scene && pivot) scene.remove(pivot); // Remove pivot from scene
        });
        planets.length = 0; // Clear the planets array

        // Remove other scene objects
        if (scene && sun) scene.remove(sun);
        if (scene && ambientLight) scene.remove(ambientLight);
        if (scene && directionalLight) scene.remove(directionalLight);

        if (renderer) {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        }
        // Nullify references
        earthMesh = null;
        // Consider nullifying scene, camera, renderer etc. if needed for GC
        scene = null;
        camera = null;
        renderer = null;
        controls = null;
        clock = null;
        // Make sure container is not accessed after cleanup
        // container = null; // Don't nullify container, it's managed by the test's afterEach
    }

    // Return both cleanup function and the scene object
    return { cleanup, scene };
}
