import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'lil-gui';

let scene, camera, renderer, controls, gui;
let animationFrameId;
const boids = [];
let boundingBox = { xMin: -15, xMax: 15, yMin: -15, yMax: 15, zMin: -15, zMax: 15 }; // Increased bounding box slightly

const flockParams = {
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    perceptionRadius: 5.0,
    maxSpeed: 3.0,
    maxForce: 0.05,
    numBoids: 100,
};

class Boid {
    constructor(x, y, z) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * (flockParams.maxSpeed * 0.5) + (flockParams.maxSpeed * 0.5)); // Initial speed up to maxSpeed
        this.acceleration = new THREE.Vector3();
        
        // Per-boid properties that can be influenced by flockParams but allow individual variation if needed later
        this.maxSpeed = flockParams.maxSpeed;
        this.maxForce = flockParams.maxForce;
        this.perceptionRadius = flockParams.perceptionRadius;

        const geometry = new THREE.ConeGeometry(0.15, 0.5, 4); // Slightly larger boid
        geometry.rotateX(Math.PI / 2); // Orient cone to point along its local +Z (or -Z depending on lookAt)
        const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, flatShading: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity.clone().multiplyScalar(1/60)); // Assuming 60FPS for consistent speed

        this.acceleration.multiplyScalar(0);

        this.mesh.position.copy(this.position);
        // Ensure velocity is not zero before lookAt
        if (this.velocity.lengthSq() > 0.0001) {
            const lookTarget = this.position.clone().add(this.velocity);
            this.mesh.lookAt(lookTarget);
        }
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    steer(target) {
        let desired = new THREE.Vector3().subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);
        let steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        return steer;
    }

    separation(allBoids) {
        let steer = new THREE.Vector3();
        let count = 0;
        for (let otherBoid of allBoids) {
            if (otherBoid === this) continue;
            let d = this.position.distanceTo(otherBoid.position);
            if (d > 0 && d < this.perceptionRadius / 2) { // Separation radius is half perception
                let diff = new THREE.Vector3().subVectors(this.position, otherBoid.position);
                diff.normalize();
                diff.divideScalar(d); // Weight by distance (closer = stronger)
                steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer.divideScalar(count);
        }
        if (steer.lengthSq() > 0) {
            steer.normalize();
            steer.multiplyScalar(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }
        return steer.multiplyScalar(flockParams.separationWeight);
    }

    alignment(allBoids) {
        let sum = new THREE.Vector3();
        let count = 0;
        for (let otherBoid of allBoids) {
            if (otherBoid === this) continue;
            let d = this.position.distanceTo(otherBoid.position);
            if (d > 0 && d < this.perceptionRadius) {
                sum.add(otherBoid.velocity);
                count++;
            }
        }
        if (count > 0) {
            sum.divideScalar(count);
            sum.normalize();
            sum.multiplyScalar(this.maxSpeed);
            let steer = sum.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
            return steer.multiplyScalar(flockParams.alignmentWeight);
        }
        return new THREE.Vector3();
    }

    cohesion(allBoids) {
        let sum = new THREE.Vector3();
        let count = 0;
        for (let otherBoid of allBoids) {
            if (otherBoid === this) continue;
            let d = this.position.distanceTo(otherBoid.position);
            if (d > 0 && d < this.perceptionRadius) {
                sum.add(otherBoid.position);
                count++;
            }
        }
        if (count > 0) {
            sum.divideScalar(count);
            return this.steer(sum).multiplyScalar(flockParams.cohesionWeight);
        }
        return new THREE.Vector3();
    }
    
    behaviors(allBoids) {
        // Update boid's internal perception, maxSpeed, maxForce from global flockParams
        // This allows GUI changes to propagate to boids dynamically
        this.perceptionRadius = flockParams.perceptionRadius;
        this.maxSpeed = flockParams.maxSpeed;
        this.maxForce = flockParams.maxForce;

        let sep = this.separation(allBoids);
        let ali = this.alignment(allBoids);
        let coh = this.cohesion(allBoids);

        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }

    boundaries() {
        if (this.position.x < boundingBox.xMin) this.position.x = boundingBox.xMax;
        if (this.position.x > boundingBox.xMax) this.position.x = boundingBox.xMin;
        if (this.position.y < boundingBox.yMin) this.position.y = boundingBox.yMax;
        if (this.position.y > boundingBox.yMax) this.position.y = boundingBox.yMin;
        if (this.position.z < boundingBox.zMin) this.position.z = boundingBox.zMax;
        if (this.position.z > boundingBox.zMax) this.position.z = boundingBox.zMin;
    }
}


function init(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010); // Darker background

    // Camera
    const aspectRatio = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.set(0, 10, 25); // Adjusted camera for new bounding box

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0); // Ensure controls orbit around the center of the flock

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Brighter ambient
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter directional
    directionalLight.position.set(10, 20, 15);
    scene.add(directionalLight);
    
    // Optional: Add helper for directional light
    // const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 1);
    // scene.add(lightHelper);

    // Initialize Boids
    boids.length = 0; // Clear boids array for re-initialization if called multiple times
    for (let i = 0; i < flockParams.numBoids; i++) {
        const x = Math.random() * (boundingBox.xMax - boundingBox.xMin) + boundingBox.xMin;
        const y = Math.random() * (boundingBox.yMax - boundingBox.yMin) + boundingBox.yMin;
        const z = Math.random() * (boundingBox.zMax - boundingBox.zMin) + boundingBox.zMin;
        const boid = new Boid(x, y, z);
        boids.push(boid);
        scene.add(boid.mesh);
    }

    // GUI
    if (gui) { // Destroy old GUI if it exists (e.g., on hot-reload or re-init)
      gui.destroy();
    }
    gui = new GUI();
    gui.domElement.style.position = 'absolute'; // Ensure it's positioned correctly within the container
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    container.appendChild(gui.domElement);
    
    gui.add(flockParams, 'separationWeight', 0, 5, 0.1).name('Separation');
    gui.add(flockParams, 'alignmentWeight', 0, 5, 0.1).name('Alignment');
    gui.add(flockParams, 'cohesionWeight', 0, 5, 0.1).name('Cohesion');
    gui.add(flockParams, 'perceptionRadius', 1, 20, 0.5).name('Perception');
    gui.add(flockParams, 'maxSpeed', 1, 10, 0.1).name('Max Speed');
    gui.add(flockParams, 'maxForce', 0.01, 0.5, 0.01).name('Max Force');
    // gui.add(flockParams, 'numBoids', 10, 200, 10).name('Num Boids').onChange(reinitializeBoids); // Optional: re-init boids

    // function reinitializeBoids(value) {
    //     // Clean up existing boids
    //     boids.forEach(boid => {
    //         if (boid.mesh) scene.remove(boid.mesh);
    //         if (boid.mesh && boid.mesh.geometry) boid.mesh.geometry.dispose();
    //         if (boid.mesh && boid.mesh.material) boid.mesh.material.dispose();
    //     });
    //     boids.length = 0;

    //     // Create new boids
    //     for (let i = 0; i < value; i++) {
    //         const x = Math.random() * (boundingBox.xMax - boundingBox.xMin) + boundingBox.xMin;
    //         const y = Math.random() * (boundingBox.yMax - boundingBox.yMin) + boundingBox.yMin;
    //         const z = Math.random() * (boundingBox.zMax - boundingBox.zMin) + boundingBox.zMin;
    //         const boid = new Boid(x, y, z);
    //         boids.push(boid);
    //         scene.add(boid.mesh);
    //     }
    // }
    
    // Optional: Bounding box helper
    // const boxGeom = new THREE.BoxGeometry(
    //     boundingBox.xMax - boundingBox.xMin,
    //     boundingBox.yMax - boundingBox.yMin,
    //     boundingBox.zMax - boundingBox.zMin
    // );
    // const boxMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    // const boxMesh = new THREE.Mesh(boxGeom, boxMat);
    // scene.add(boxMesh);


    // Animation Loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        boids.forEach(boid => {
          boid.boundaries();
          boid.behaviors(boids); // Pass all boids
          boid.update();
        });

        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    const onWindowResize = () => {
        if (!renderer || !camera || !container) return; // Prevent errors during cleanup
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);


    // Cleanup function
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onWindowResize);

        // Dispose boids
        boids.forEach(boid => {
            if (boid.mesh) {
                scene.remove(boid.mesh);
                if (boid.mesh.geometry) boid.mesh.geometry.dispose();
                if (boid.mesh.material) boid.mesh.material.dispose();
            }
        });
        boids.length = 0; // Clear the array

        if (gui) {
            // Check if domElement is still part of container before removing
            if (gui.domElement && gui.domElement.parentElement === container) {
                container.removeChild(gui.domElement);
            }
            gui.destroy();
            gui = null; 
        }
        
        if (controls) {
            controls.dispose();
            controls = null;
        }

        if (scene) { // Dispose scene objects, but not the scene itself if it might be reused
            // The scene.traverse method used before is good for general cleanup
            // but here we are more specific with boids.
            // Other objects like lights are simple and might not need explicit disposal beyond scene = null.
        }

        if (renderer) {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentElement) {
                renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
            renderer = null;
        }
        
        // scene.dispose(); // If THREE.Scene had a dispose method
        scene = null;
        camera = null;
    };
}

export { init };
