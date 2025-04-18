import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, cubeGroup, animationFrameId;

// Standard Rubik's Cube face colors
const WHITE = 0xffffff;
const YELLOW = 0xffff00;
const BLUE = 0x0000ff;
const GREEN = 0x00ff00;
const RED = 0xff0000;
const ORANGE = 0xffa500;
const BLACK = 0x111111; // For internal faces

const cubieSize = 1;
const spacing = 0.1;
const totalCubieSize = cubieSize + spacing;

function createCubie(x, y, z) {
    const materials = [
        new THREE.MeshStandardMaterial({ color: BLACK }), // Right (+x)
        new THREE.MeshStandardMaterial({ color: BLACK }), // Left (-x)
        new THREE.MeshStandardMaterial({ color: BLACK }), // Top (+y)
        new THREE.MeshStandardMaterial({ color: BLACK }), // Bottom (-y)
        new THREE.MeshStandardMaterial({ color: BLACK }), // Front (+z)
        new THREE.MeshStandardMaterial({ color: BLACK })  // Back (-z)
    ];

    if (x === 1) materials[0].color.setHex(RED);
    if (x === -1) materials[1].color.setHex(ORANGE);
    if (y === 1) materials[2].color.setHex(WHITE);
    if (y === -1) materials[3].color.setHex(YELLOW);
    if (z === 1) materials[4].color.setHex(BLUE);
    if (z === -1) materials[5].color.setHex(GREEN);

    const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(x * totalCubieSize, y * totalCubieSize, z * totalCubieSize);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function init(container) {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 5); // Adjusted camera position for better initial view

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly brighter ambient
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5); // Adjusted light position
    directionalLight.castShadow = true;
    // Configure shadow properties if needed (e.g., map size)
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Rubik's Cube Model
    cubeGroup = new THREE.Group();
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && y === 0 && z === 0) {
                    // Skip the center cubie (optional, but common)
                    continue;
                }
                const cubie = createCubie(x, y, z);
                cubeGroup.add(cubie);
            }
        }
    }
    scene.add(cubeGroup);

    // Plane for shadows (optional but looks better)
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = - (1.5 * totalCubieSize + 0.5); // Position below the cube
    plane.receiveShadow = true;
    scene.add(plane);


    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1; // Smoother damping
    controls.target.set(0, 0, 0);
    controls.update();

    // Resize listener
    const onWindowResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);


    // Animation Loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        controls.update(); // required if controls.enableDamping or controls.autoRotate are set to true
        renderer.render(scene, camera);
    }
    animate();

    // Return Cleanup Function
    const cleanup = () => {
        console.log("Cleaning up Rubik's Cube demo...");
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize); // Remove resize listener

        if (controls) {
            controls.dispose();
        }

        if (cubeGroup) {
            cubeGroup.children.forEach(mesh => {
                if (mesh.geometry) {
                    mesh.geometry.dispose();
                }
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(mat => mat.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            });
            scene.remove(cubeGroup);
        }
        
        // Dispose other scene objects like lights and plane
        scene.traverse(object => {
             if (object.geometry) object.geometry.dispose();
             if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });


        if (renderer) {
            renderer.dispose();
            if (renderer.domElement && container.contains(renderer.domElement)) {
                 container.removeChild(renderer.domElement);
            }
        }

        // Clear references
        scene = null;
        camera = null;
        renderer = null;
        controls = null;
        cubeGroup = null;
        animationFrameId = null;
        console.log("Rubik's Cube demo cleanup complete.");
    };

    return cleanup;
}

export { init };
