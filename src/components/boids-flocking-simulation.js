import * as THREE from 'three';
import GUI from 'lil-gui';

// Global Variables for Scene Scope
let scene, camera, renderer, boidsArray = [], gui;
let animationFrameId;
const NUM_BOIDS = 100; // Configurable number of boids
// Define simulation bounds (will be used in boundary handling task)
const bounds = {
    x: 150, // Scene will be roughly -150 to +150 in X
    y: 100, // Scene will be roughly -100 to +100 in Y
    z: 150  // Scene will be roughly -150 to +150 in Z
};
const cleanupGlobals = {}; // To store resize handler or other items for cleanup

// Module scope, near other global vars like scene, camera etc.
const simParams = {
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    perceptionRadius: 50,
    maxSpeed: 4,
    maxForce: 0.1,
    // Add a helper to re-apply settings to existing boids
    applyToBoids: function() {
        if (boidsArray && boidsArray.length > 0) {
            boidsArray.forEach(boid => {
                boid.separationWeight = this.separationWeight;
                boid.alignmentWeight = this.alignmentWeight;
                boid.cohesionWeight = this.cohesionWeight;
                boid.perceptionRadius = this.perceptionRadius;
                boid.maxSpeed = this.maxSpeed;
                boid.maxForce = this.maxForce;
            });
        }
    }
};

class Boid {
    constructor(initialPosition, initialVelocity) {
        this.position = initialPosition || new THREE.Vector3(
            Math.random() * 200 - 100, // Spread them out a bit
            Math.random() * 200 - 100,
            Math.random() * 200 - 100
        );
        this.velocity = initialVelocity || new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize().multiplyScalar(Math.random() * 2 + 2); // speed 2 to 4

        this.acceleration = new THREE.Vector3();

        // Initialize from global simParams
        this.separationWeight = simParams.separationWeight;
        this.alignmentWeight = simParams.alignmentWeight;
        this.cohesionWeight = simParams.cohesionWeight;
        this.perceptionRadius = simParams.perceptionRadius;
        this.maxSpeed = simParams.maxSpeed;
        this.maxForce = simParams.maxForce;
        
        this.perceptionAngle = Math.PI; // Keep this for now, or add to GUI if desired


        const geometry = new THREE.ConeGeometry(3, 10, 5); // base radius, height, radial segments
        // Rotate geometry so the cone's tip points along its local +Z axis
        geometry.rotateX(Math.PI / 2);
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xffffff, // Random color for fun
            metalness: 0.3,
            roughness: 0.6
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);

        // Initial orientation based on velocity
        if (this.velocity.lengthSq() > 0.0001) {
            const lookAtTarget = new THREE.Vector3().copy(this.position).add(this.velocity);
            this.mesh.lookAt(lookAtTarget);
        }
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    // Steer towards a target direction
    seek(target) {
        const desired = new THREE.Vector3().subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);
        const steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce); // Limit to maximum steering force
        return steer;
    }

    separate(boids) {
        const desiredSeparation = this.perceptionRadius * 0.5; // How close is too close
        const steer = new THREE.Vector3();
        let count = 0;
        for (let other of boids) {
            if (other === this) continue; // Don't separate from self
            const dSq = this.position.distanceToSquared(other.position);
            // Check if the other boid is a flockmate and not itself
            if (dSq > 0 && dSq < desiredSeparation * desiredSeparation) {
                // Calculate vector pointing away from neighbor
                const diff = new THREE.Vector3().subVectors(this.position, other.position);
                diff.normalize();
                diff.divideScalar(Math.sqrt(dSq)); // Weight by distance (stronger for closer boids)
                steer.add(diff);
                count++;
            }
        }
        // Average the steering vector
        if (count > 0) {
            steer.divideScalar(count);
        }

        if (steer.lengthSq() > 0) {
            // Implement Reynolds: Steering = Desired - Velocity
            steer.normalize();
            steer.multiplyScalar(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }
        return steer;
    }

    align(boids) {
        const neighborDistSq = this.perceptionRadius * this.perceptionRadius;
        const steer = new THREE.Vector3();
        let count = 0;
        for (let other of boids) {
            if (other === this) continue; 
            const dSq = this.position.distanceToSquared(other.position);
            if (dSq > 0 && dSq < neighborDistSq) {
                steer.add(other.velocity);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
            steer.normalize();
            steer.multiplyScalar(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }
        return steer;
    }

    cohesion(boids) {
        const neighborDistSq = this.perceptionRadius * this.perceptionRadius;
        const steer = new THREE.Vector3();
        let count = 0;
        for (let other of boids) {
            if (other === this) continue;
            const dSq = this.position.distanceToSquared(other.position);
            if (dSq > 0 && dSq < neighborDistSq) {
                steer.add(other.position);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
            return this.seek(steer); // Steer towards the calculated center
        } else {
            return new THREE.Vector3();
        }
    }

    flock(boids) {
        const sep = this.separate(boids);
        const ali = this.align(boids);
        const coh = this.cohesion(boids);

        // Apply weights
        sep.multiplyScalar(this.separationWeight);
        ali.multiplyScalar(this.alignmentWeight);
        coh.multiplyScalar(this.cohesionWeight);

        // Add forces to acceleration
        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }

    update(boids, worldBounds) { // Add worldBounds parameter
        this.flock(boids); 

        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed); // Limit speed
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0); // Reset acceleration each frame

        this.applyBoundaryBehavior(worldBounds); // Call boundary behavior

        this.mesh.position.copy(this.position);
        if (this.velocity.lengthSq() > 0.0001) {
            this.mesh.lookAt(this.position.clone().add(this.velocity));
        }
    }

    applyBoundaryBehavior(worldBounds) {
        // Screen wrapping
        if (this.position.x < -worldBounds.x) {
            this.position.x = worldBounds.x;
        } else if (this.position.x > worldBounds.x) {
            this.position.x = -worldBounds.x;
        }

        if (this.position.y < -worldBounds.y) {
            this.position.y = worldBounds.y;
        } else if (this.position.y > worldBounds.y) {
            this.position.y = -worldBounds.y;
        }

        if (this.position.z < -worldBounds.z) {
            this.position.z = worldBounds.z;
        } else if (this.position.z > worldBounds.z) {
            this.position.z = -worldBounds.z;
        }
    }
}

function init(container) {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x102030);

    // Camera Setup
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 50, 200); // Position camera to see the boids
    camera.lookAt(scene.position);

    // Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 75);
    scene.add(directionalLight);

    // Instantiate Boids
    boidsArray = []; 
    for (let i = 0; i < NUM_BOIDS; i++) {
        const randomX = Math.random() * bounds.x * 2 - bounds.x;
        const randomY = Math.random() * bounds.y * 2 - bounds.y;
        const randomZ = Math.random() * bounds.z * 2 - bounds.z;
        const boid = new Boid(new THREE.Vector3(randomX, randomY, randomZ));
        boidsArray.push(boid);
        scene.add(boid.mesh);
    }

    // Bounds Visualization
    const sceneBounds = new THREE.Box3(
        new THREE.Vector3(-bounds.x, -bounds.y, -bounds.z),
        new THREE.Vector3(bounds.x, bounds.y, bounds.z)
    );
    const boxHelper = new THREE.Box3Helper(sceneBounds, 0x505050); // Dimmer color
    scene.add(boxHelper);
    cleanupGlobals.boxHelper = boxHelper; // Store for cleanup

    // GUI Setup
    gui = new GUI(); // gui is already declared in module scope

    gui.add(simParams, 'separationWeight', 0, 5, 0.1).name('Separation W.').onChange(simParams.applyToBoids.bind(simParams));
    gui.add(simParams, 'alignmentWeight', 0, 5, 0.1).name('Alignment W.').onChange(simParams.applyToBoids.bind(simParams));
    gui.add(simParams, 'cohesionWeight', 0, 5, 0.1).name('Cohesion W.').onChange(simParams.applyToBoids.bind(simParams));
    gui.add(simParams, 'perceptionRadius', 10, 200, 1).name('Perception R.').onChange(simParams.applyToBoids.bind(simParams));
    gui.add(simParams, 'maxSpeed', 1, 10, 0.1).name('Max Speed').onChange(simParams.applyToBoids.bind(simParams));
    gui.add(simParams, 'maxForce', 0.01, 0.5, 0.01).name('Max Force').onChange(simParams.applyToBoids.bind(simParams));
    
    // Display NUM_BOIDS (not changeable at runtime without recreating boids)
    gui.add({ num_boids: NUM_BOIDS }, 'num_boids').name('Num Boids').disable();
    

    // Resize Listener
    const onWindowResize = () => {
        if (!renderer || !camera) return; 
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);
    cleanupGlobals.onWindowResize = onWindowResize;

    // Start Animation Loop
    animate();

    // Return cleanup function
    return internalCleanup;
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    boidsArray.forEach(boid => {
        // Pass the module-scoped 'bounds' to boid.update
        boid.update(boidsArray, bounds); 
    });

    if (renderer && scene && camera) { 
        renderer.render(scene, camera);
    }
}

function internalCleanup() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    if (gui) {
        gui.destroy();
        gui = null;
    }

    boidsArray.forEach(boid => {
        if (boid.mesh) {
            if (boid.mesh.geometry) boid.mesh.geometry.dispose();
            if (boid.mesh.material) {
                if (Array.isArray(boid.mesh.material)) {
                    boid.mesh.material.forEach(m => m.dispose());
                } else {
                    boid.mesh.material.dispose();
                }
            }
            if (scene && boid.mesh.parent === scene) { 
                 scene.remove(boid.mesh);
            }
        }
    });
    boidsArray = [];

    if (scene) {
        // Cleanup for Box3Helper
        if (cleanupGlobals.boxHelper) {
            if (cleanupGlobals.boxHelper.geometry) cleanupGlobals.boxHelper.geometry.dispose();
            if (cleanupGlobals.boxHelper.material && cleanupGlobals.boxHelper.material.dispose) {
                 cleanupGlobals.boxHelper.material.dispose();
            }
            // scene.remove might have already been called if boxHelper was a direct child
            // but it's good practice to ensure it's removed.
            if (cleanupGlobals.boxHelper.parent === scene) {
                scene.remove(cleanupGlobals.boxHelper);
            }
            delete cleanupGlobals.boxHelper;
        }

        scene.traverse(object => {
           if (object.isLight && object.shadow && object.shadow.map) {
               object.shadow.map.dispose();
           }
        });
        while(scene.children.length > 0){ 
            const child = scene.children[0];
            // Check if child is not null and has geometry/material before disposing
            if (child) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                scene.remove(child); 
            } else {
                // If child is null for some reason, break to avoid infinite loop
                break;
            }
        }
    }
    scene = null;
    
    camera = null;

    if (renderer) {
        renderer.dispose(); 
        if (renderer.domElement && renderer.domElement.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
        renderer = null;
    }

    if (cleanupGlobals.onWindowResize) {
        window.removeEventListener('resize', cleanupGlobals.onWindowResize);
        delete cleanupGlobals.onWindowResize;
    }
}

export { init };
