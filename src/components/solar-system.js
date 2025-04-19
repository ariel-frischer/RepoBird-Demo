import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function init(container) {
    if (!container || !(container instanceof HTMLElement)) {
        console.error("Initialization failed: container element not provided or invalid.");
        return { cleanup: () => {}, scene: null };
    }

    let scene, camera, renderer, clock, controls, animationFrameId;
    const planets = []; // Stores { pivot, mesh, orbitMesh }
    const textures = {}; // Stores loaded textures { name: texture }
    const disposables = []; // Stores geometries, materials, textures for cleanup
    const textureLoader = new THREE.TextureLoader();

    // Error handling for texture loading
    textureLoader.manager.onError = (url) => console.error(`Error loading texture: ${url}`);

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    clock = new THREE.Clock();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 30, 50); // Adjusted camera position
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    disposables.push(renderer); // Add renderer for disposal

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly brighter ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Slightly stronger directional
    directionalLight.position.set(10, 20, 15);
    scene.add(directionalLight);

    // Sun
    const sunGeometry = new THREE.SphereGeometry(4, 64, 64); // Larger Sun
    disposables.push(sunGeometry);
    const sunTexturePath = 'src/assets/textures/sun_texture.jpg';
    let sunMaterial;
    try {
        const sunTexture = textureLoader.load(sunTexturePath);
        textures['Sun'] = sunTexture;
        disposables.push(sunTexture);
        sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture, name: 'SunMaterial' });
    } catch (error) {
        console.error(`Error loading Sun texture: ${sunTexturePath}`, error);
        sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, name: 'SunMaterialFallback' });
    }
    disposables.push(sunMaterial);
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.name = 'Sun';
    scene.add(sun);

    // Planets Data (radius, orbitalRadius, speed, selfRotationSpeed, textureFile, [ring details])
    const planetData = [
        { name: 'Mercury', radius: 0.5, color: 0xaaaaaa, orbitalRadius: 8, speed: 0.4, selfRotationSpeed: 0.004, textureFile: 'mercury_texture.jpg' },
        { name: 'Venus', radius: 0.9, color: 0xffd700, orbitalRadius: 12, speed: 0.3, selfRotationSpeed: 0.002, textureFile: 'venus_texture.jpg' },
        { name: 'Earth', radius: 1.0, color: 0x0000ff, orbitalRadius: 16, speed: 0.25, selfRotationSpeed: 0.01, textureFile: 'earth_texture.jpg' },
        { name: 'Mars', radius: 0.7, color: 0xff0000, orbitalRadius: 20, speed: 0.2, selfRotationSpeed: 0.009, textureFile: 'mars_texture.jpg' },
        { name: 'Jupiter', radius: 3.5, color: 0xffa500, orbitalRadius: 30, speed: 0.1, selfRotationSpeed: 0.02, textureFile: 'jupiter_texture.jpg' },
        { name: 'Saturn', radius: 3.0, color: 0xf0e68c, orbitalRadius: 40, speed: 0.08, selfRotationSpeed: 0.018, textureFile: 'saturn_texture.jpg', ring: { innerRadius: 4, outerRadius: 6, textureFile: 'saturn_rings_texture.png' } },
        { name: 'Uranus', radius: 2.0, color: 0xadd8e6, orbitalRadius: 50, speed: 0.05, selfRotationSpeed: 0.015, textureFile: 'uranus_texture.jpg' },
        { name: 'Neptune', radius: 1.9, color: 0x00008b, orbitalRadius: 60, speed: 0.03, selfRotationSpeed: 0.014, textureFile: 'neptune_texture.jpg' },
    ];

    // Create Planets, Orbits, and Rings
    planetData.forEach(data => {
        const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
        disposables.push(planetGeometry);
        let planetMaterial;
        const texturePath = `src/assets/textures/${data.textureFile}`;
        try {
            const planetTexture = textureLoader.load(texturePath);
            textures[data.name] = planetTexture;
            disposables.push(planetTexture);
            planetMaterial = new THREE.MeshStandardMaterial({ map: planetTexture, roughness: 0.8, metalness: 0.1, name: `${data.name}Material` });
        } catch (error) {
            console.error(`Error loading texture for ${data.name}: ${texturePath}`, error);
            planetMaterial = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1, name: `${data.name}MaterialFallback` });
        }
        disposables.push(planetMaterial);

        const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
        planetMesh.name = data.name;
        planetMesh.userData.selfRotationSpeed = data.selfRotationSpeed; // Store self-rotation speed

        // Pivot for orbit
        const pivot = new THREE.Object3D();
        pivot.name = `${data.name}Pivot`;
        pivot.add(planetMesh);
        planetMesh.position.x = data.orbitalRadius;
        pivot.userData.speed = data.speed; // Store orbital speed

        scene.add(pivot);

        // Create Orbit Visualization
        const orbitGeometry = new THREE.RingGeometry(data.orbitalRadius - 0.05, data.orbitalRadius + 0.05, 128); // Thin ring
        disposables.push(orbitGeometry);
        const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
        disposables.push(orbitMaterial);
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.name = `${data.name}Orbit`;
        orbitMesh.rotation.x = Math.PI / 2; // Rotate to lie flat on XZ plane
        scene.add(orbitMesh);

        planets.push({ pivot, mesh: planetMesh, orbitMesh }); // Store references

        // Special handling for Earth's Moon
        if (data.name === 'Earth') {
            const moonGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            disposables.push(moonGeometry);
            const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9, name: 'MoonMaterial' });
            disposables.push(moonMaterial);
            const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
            moonMesh.name = 'Moon';
            moonMesh.position.set(1.5, 0, 0); // Position relative to Earth
            planetMesh.add(moonMesh); // Add Moon as child of Earth mesh
        }

        // Special handling for Saturn's Rings
        if (data.name === 'Saturn' && data.ring) {
            const ringTexturePath = `src/assets/textures/${data.ring.textureFile}`;
            let ringMesh;
            try {
                const ringTexture = textureLoader.load(ringTexturePath);
                textures[`${data.name}Ring`] = ringTexture;
                disposables.push(ringTexture);
                const ringGeometry = new THREE.RingGeometry(data.ring.innerRadius, data.ring.outerRadius, 64);
                disposables.push(ringGeometry);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    map: ringTexture,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8, // Make rings slightly transparent
                    name: 'SaturnRingMaterial'
                });
                disposables.push(ringMaterial);
                ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                ringMesh.name = 'SaturnRings';
                ringMesh.rotation.x = Math.PI / 2 + 0.2; // Tilt the rings slightly
                ringMesh.position.set(0, 0, 0); // Center rings on Saturn's pivot origin
                // Add rings as a child of the *pivot* so they orbit with Saturn but don't spin with it
                pivot.add(ringMesh);
            } catch (error) {
                console.error(`Error loading or creating Saturn rings: ${ringTexturePath}`, error);
            }
        }
    });

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    disposables.push(controls); // Add controls for disposal

    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Animate planets: orbital rotation (pivots) and self-rotation (meshes)
        planets.forEach(p => {
            p.pivot.rotation.y = elapsedTime * p.pivot.userData.speed;
            p.mesh.rotation.y += p.mesh.userData.selfRotationSpeed;

            // Animate Moon orbit around Earth (simple rotation around Earth's local Y)
            if (p.mesh.name === 'Earth') {
                const moon = p.mesh.getObjectByName('Moon');
                if (moon) {
                    // Simple orbit: rotate the moon mesh around its local Y axis relative to Earth.
                    // More complex orbit would involve another pivot.
                     moon.rotation.y += 0.02; // Make moon orbit Earth
                }
            }
        });

        // Animate Sun's self-rotation (slowly)
        sun.rotation.y += 0.0005;

        controls.update();
        renderer.render(scene, camera);
    }

    // Handle Resize
    function onWindowResize() {
        if (!container || !renderer || !camera) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;

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

        // Dispose all tracked resources
        disposables.forEach(item => {
            if (item && typeof item.dispose === 'function') {
                item.dispose();
            }
        });
        disposables.length = 0; // Clear the array

        // Remove all objects from the scene
        if (scene) {
            while(scene.children.length > 0){
                const object = scene.children[0];
                // If it's a pivot, ensure its children (planet, rings, moon) are handled
                if (object instanceof THREE.Object3D) {
                     // Geometries/materials are disposed via `disposables` array
                     // We just need to remove from scene hierarchy
                }
                scene.remove(object);
            }
        }

        // Clear arrays and references
        planets.length = 0;
        Object.keys(textures).forEach(key => delete textures[key]);


        if (renderer && renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }

        // Nullify Three.js objects
        scene = null;
        camera = null;
        renderer = null;
        controls = null;
        clock = null;
    }

    return { cleanup, scene };
}
