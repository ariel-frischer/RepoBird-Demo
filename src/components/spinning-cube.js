import * as THREE from 'three';

let scene, camera, renderer, cube;
let animationFrameId;

function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 2;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Handle Resize
    window.addEventListener('resize', () => onWindowResize(container));
}

function onWindowResize(container) {
    if (!renderer || !camera) return;
    // Recalculate aspect ratio based on current container size
    const aspect = container.clientWidth / container.clientHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    if (!cube || !renderer || !scene || !camera) return; // Ensure cleanup hasn't removed objects
    animationFrameId = requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}

function cleanup() {
    console.log("Cleaning up spinning cube demo...");
    cancelAnimationFrame(animationFrameId);
    // Explicitly remove the resize listener using the same function reference
    // To make this work reliably, we might need to define onWindowResize outside
    // or bind it. Let's try a simpler approach first. A common pattern is to
    // define the handler separately.
    // For now, let's assume the anonymous function removal might be tricky.
    // A safer pattern is shown below, but let's stick to the original for now.
    // window.removeEventListener('resize', () => onWindowResize(container)); // This might not work as expected
    
    // Alternative: Define handler function separately
    // const resizeHandler = () => onWindowResize(container);
    // window.addEventListener('resize', resizeHandler);
    // window.removeEventListener('resize', resizeHandler); // This works reliably

    // Attempting to remove the specific anonymous listener - might fail silently
    // Let's just remove *all* listeners for this event on window, though less ideal.
    // A better way needs the handler function stored. For simplicity now:
    // We'll rely on the fact that the event listener added in setupScene uses
    // the *current* container. If the container changes, this might be fine,
    // but it's better to explicitly remove the *correct* listener.
    // Let's modify onWindowResize slightly for removal.

    const boundOnWindowResize = onWindowResize.bind(null, renderer?.domElement?.parentNode || appContainer); // Bind to current container if possible
    window.removeEventListener('resize', boundOnWindowResize); // Attempt removal

    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
             renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer = null; // Nullify reference
    }
    if (scene) {
        // Dispose geometry, material, textures if needed
        scene.traverse(object => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        scene = null; // Nullify reference
    }

    camera = null; // Nullify reference
    cube = null; // Nullify reference
    animationFrameId = null; // Nullify reference
    console.log("Spinning cube cleanup complete.");
}

// Keep track of the resize handler for proper removal
let resizeHandler = null; 

// Export the init function
export function init(container) {
    // Clean up previous instance if any (potentially redundant if main.js handles it)
    // cleanup(); // Let main.js manage the lifecycle

    setupScene(container);
    
    // Store the bound resize handler to allow removal later
    resizeHandler = () => onWindowResize(container); // Define here to capture container
    window.addEventListener('resize', resizeHandler);

    animate();

    // Return the cleanup function specific to this instance
    return function specificCleanup() {
       console.log("Executing specific cleanup for spinning cube...");
       cancelAnimationFrame(animationFrameId);
       if(resizeHandler) {
           window.removeEventListener('resize', resizeHandler);
           resizeHandler = null; // Clear handler reference
       }
       if (renderer) {
           renderer.dispose();
           if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
           }
           renderer = null;
       }
       if (scene) {
           scene.traverse(object => {
               if (object instanceof THREE.Mesh) {
                   if (object.geometry) object.geometry.dispose();
                   if (object.material) {
                       if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                       else object.material.dispose();
                   }
               }
           });
           scene = null;
       }
       camera = null;
       cube = null;
       animationFrameId = null;
       console.log("Specific spinning cube cleanup finished.");
   };
}
