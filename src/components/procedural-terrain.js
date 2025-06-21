import * as THREE from 'three';
// Note: Adjust the path based on the actual file structure relative to this component
import { createNoise2D } from '../vendor/simplex-noise.js';

export function init(container) {
  if (!container) {
    console.error('Container element is required for procedural terrain init.');
    return () => {}; // Return a no-op cleanup function
  }

  let animationFrameId = null;

  // Scene Setup
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.0012); // Sky blue fog to blend with gradient
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Create help text
  const helpContainer = document.createElement('div');
  helpContainer.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    max-width: 200px;
    user-select: none;
  `;
  
  const helpHeader = document.createElement('div');
  helpHeader.style.cssText = `
    cursor: pointer;
    font-weight: bold;
    margin-bottom: 5px;
  `;
  helpHeader.innerHTML = '▼ Flight Controls';
  
  const helpContent = document.createElement('div');
  helpContent.style.cssText = `
    line-height: 1.5;
  `;
  helpContent.innerHTML = `
    <strong>Click Controls:</strong><br>
    • Left side: Turn left<br>
    • Right side: Turn right<br>
    • Top: Fly higher<br>
    • Bottom: Fly lower<br>
    <br>
    <strong>Mouse:</strong> Look around
  `;
  
  let helpExpanded = true;
  helpHeader.addEventListener('click', () => {
    helpExpanded = !helpExpanded;
    helpContent.style.display = helpExpanded ? 'block' : 'none';
    helpHeader.innerHTML = (helpExpanded ? '▼' : '▶') + ' Flight Controls';
  });
  
  helpContainer.appendChild(helpHeader);
  helpContainer.appendChild(helpContent);
  container.appendChild(helpContainer);

  // Create gradient sky
  const skyGeometry = new THREE.SphereGeometry(500, 32, 15);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4A90E2) }, // Soft blue
      bottomColor: { value: new THREE.Color(0xFFD4A3) }, // Warm peachy horizon
      offset: { value: 33 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // Camera Position - fixed height, will move forward continuously
  camera.position.set(0, 30, 100); // Lower elevation for better terrain view
  
  // Camera rotation for mouse look
  const cameraRotation = { x: 0, y: 0 };
  
  // Movement direction
  let movementAngle = 0; // Angle in radians for left/right movement
  let targetAngle = 0; // Target angle for smooth turning
  
  // Elevation control
  let currentElevation = 30;
  let targetElevation = 30;
  const minElevation = 15; // Minimum height above terrain
  const maxElevation = 100; // Maximum height

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xfff8e1, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(100, 150, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -250;
  directionalLight.shadow.camera.right = 250;
  directionalLight.shadow.camera.top = 250;
  directionalLight.shadow.camera.bottom = -250;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 500;
  scene.add(directionalLight);

  // Simple mouse controls for looking around
  let mouseX = 0;
  let mouseY = 0;
  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;
  
  function onMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / windowHalfX;
    mouseY = (event.clientY - windowHalfY) / windowHalfY;
  }
  
  function onMouseClick(event) {
    // Check if click is on help menu
    if (helpContainer.contains(event.target)) {
      return; // Don't process flight controls if clicking on help menu
    }
    
    const clickX = event.clientX / window.innerWidth;
    const clickY = event.clientY / window.innerHeight;
    
    // Vertical control - top/bottom for elevation
    if (clickY < 0.3) {
      // Click on top 30% - increase elevation
      targetElevation = Math.min(targetElevation + 15, maxElevation);
    } else if (clickY > 0.7) {
      // Click on bottom 30% - decrease elevation
      targetElevation = Math.max(targetElevation - 15, minElevation);
    }
    
    // Horizontal control - left/right for turning
    if (clickX < 0.3) {
      targetAngle += Math.PI / 6; // Turn left by 30 degrees
    } else if (clickX > 0.7) {
      targetAngle -= Math.PI / 6; // Turn right by 30 degrees
    }
  }
  
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('click', onMouseClick);

  // Noise generators for multiple octaves
  const noise1 = createNoise2D();
  const noise2 = createNoise2D();
  const noise3 = createNoise2D();

  // Terrain parameters
  const chunkSize = 100;
  const chunkSegments = 30; // Lower for far chunks
  const visibleRange = 6; // Increased for smoother fade
  const lodDistances = [2, 4, 6]; // LOD distances
  const lodSegments = [40, 20, 10]; // Segments for each LOD
  const terrainChunks = new Map();
  
  // Camera movement parameters
  const cameraSpeed = 0.5;
  const cameraDirection = new THREE.Vector3(0, 0, -1);

  // Function to create height using multiple noise octaves
  function getTerrainHeight(worldX, worldZ) {
    const scale1 = 40;
    const scale2 = 20;
    const scale3 = 8;
    
    // Primary terrain shape
    let height = noise1.noise2D(worldX / scale1, worldZ / scale1) * 12;
    
    // Medium detail
    height += noise2.noise2D(worldX / scale2, worldZ / scale2) * 4;
    
    // Fine detail (reduced for less noise)
    height += noise3.noise2D(worldX / scale3, worldZ / scale3) * 1;
    
    // Smooth ridges
    const ridgeNoise = noise1.noise2D(worldX / 80, worldZ / 80);
    height += Math.pow(Math.abs(ridgeNoise), 1.5) * 8;
    
    return height;
  }

  // Smooth color interpolation function
  function lerpColor(color1, color2, t) {
    const result = new THREE.Color();
    result.r = color1.r + (color2.r - color1.r) * t;
    result.g = color1.g + (color2.g - color1.g) * t;
    result.b = color1.b + (color2.b - color1.b) * t;
    return result;
  }

  // Function to get terrain color based on height with smooth transitions
  function getTerrainColor(height) {
    // Define color stops
    const colors = [
      { height: -8, color: new THREE.Color(0x4A3C28) },  // Deep brown (valleys)
      { height: -3, color: new THREE.Color(0x6B5D54) },  // Medium brown
      { height: 0, color: new THREE.Color(0x8B7355) },   // Light brown
      { height: 5, color: new THREE.Color(0xC19A6B) },   // Sandy brown
      { height: 10, color: new THREE.Color(0xD2B48C) },  // Tan
      { height: 15, color: new THREE.Color(0xF5DEB3) },  // Wheat (hills)
      { height: 20, color: new THREE.Color(0xFFF8DC) },  // Cornsilk (peaks)
    ];
    
    // Find the two colors to interpolate between
    for (let i = 0; i < colors.length - 1; i++) {
      if (height >= colors[i].height && height <= colors[i + 1].height) {
        const t = (height - colors[i].height) / (colors[i + 1].height - colors[i].height);
        return lerpColor(colors[i].color, colors[i + 1].color, t);
      }
    }
    
    // Return edge colors if outside range
    if (height < colors[0].height) return colors[0].color;
    return colors[colors.length - 1].color;
  }

  // Get LOD level based on distance
  function getLODLevel(distance) {
    for (let i = 0; i < lodDistances.length; i++) {
      if (distance <= lodDistances[i]) {
        return i;
      }
    }
    return lodDistances.length - 1;
  }

  // Create a terrain chunk with LOD support
  function createTerrainChunk(chunkX, chunkZ) {
    const worldX = chunkX * chunkSize;
    const worldZ = chunkZ * chunkSize;
    const distance = Math.sqrt(
      Math.pow(worldX - camera.position.x, 2) + 
      Math.pow(worldZ - camera.position.z, 2)
    );
    
    const lodLevel = getLODLevel(distance / chunkSize);
    const segments = lodSegments[lodLevel];
    
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    // Calculate heights and colors
    const positionAttribute = geometry.attributes.position;
    const colors = [];
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const localX = positionAttribute.getX(i);
      const localZ = positionAttribute.getZ(i);
      
      const height = getTerrainHeight(worldX + localX, worldZ + localZ);
      positionAttribute.setY(i, height);
      
      const color = getTerrainColor(height);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Calculate smooth alpha based on distance
    const maxDist = visibleRange * chunkSize;
    const fadeDist = maxDist * 0.5; // Start fading at 50% of max distance
    let alpha = 1.0;
    
    if (distance > fadeDist) {
      alpha = 1.0 - ((distance - fadeDist) / (maxDist - fadeDist));
      alpha = Math.max(0, Math.min(1, alpha));
      // Smooth the alpha curve
      alpha = alpha * alpha * (3.0 - 2.0 * alpha);
    }

    // Material with vertex colors and smooth transparency
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: alpha,
      side: THREE.DoubleSide,
      flatShading: false,
      depthWrite: alpha > 0.5, // Only write depth for mostly opaque chunks
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldX, 0, worldZ);
    mesh.castShadow = lodLevel === 0; // Only cast shadows for highest LOD
    mesh.receiveShadow = true;
    
    return { mesh, geometry, material, lodLevel, chunkX, chunkZ };
  }

  // Update chunk based on camera distance
  function updateChunk(chunk) {
    const worldX = chunk.chunkX * chunkSize;
    const worldZ = chunk.chunkZ * chunkSize;
    const distance = Math.sqrt(
      Math.pow(worldX - camera.position.x, 2) + 
      Math.pow(worldZ - camera.position.z, 2)
    );
    
    // Update alpha for smooth fading
    const maxDist = visibleRange * chunkSize;
    const fadeDist = maxDist * 0.5;
    let alpha = 1.0;
    
    if (distance > fadeDist) {
      alpha = 1.0 - ((distance - fadeDist) / (maxDist - fadeDist));
      alpha = Math.max(0, Math.min(1, alpha));
      alpha = alpha * alpha * (3.0 - 2.0 * alpha);
    }
    
    chunk.material.opacity = alpha;
    chunk.material.depthWrite = alpha > 0.5;
    
    // Check if LOD level needs to change
    const newLodLevel = getLODLevel(distance / chunkSize);
    if (newLodLevel !== chunk.lodLevel) {
      return true; // Chunk needs to be recreated
    }
    
    return false;
  }

  // Update visible chunks based on camera position
  function updateTerrainChunks() {
    const cameraChunkX = Math.round(camera.position.x / chunkSize);
    const cameraChunkZ = Math.round(camera.position.z / chunkSize);

    // Create set of chunks that should be visible
    const visibleChunkKeys = new Set();
    
    for (let x = -visibleRange; x <= visibleRange; x++) {
      for (let z = -visibleRange; z <= visibleRange; z++) {
        const chunkX = cameraChunkX + x;
        const chunkZ = cameraChunkZ + z;
        
        // Render all chunks within range for smooth fading
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= visibleRange) {
          visibleChunkKeys.add(`${chunkX},${chunkZ}`);
        }
      }
    }

    // Remove chunks that are no longer visible
    terrainChunks.forEach((chunk, key) => {
      if (!visibleChunkKeys.has(key)) {
        scene.remove(chunk.mesh);
        chunk.geometry.dispose();
        chunk.material.dispose();
        terrainChunks.delete(key);
      }
    });

    // Update or add chunks
    visibleChunkKeys.forEach(key => {
      if (terrainChunks.has(key)) {
        // Update existing chunk
        const chunk = terrainChunks.get(key);
        if (updateChunk(chunk)) {
          // Recreate chunk if LOD changed
          scene.remove(chunk.mesh);
          chunk.geometry.dispose();
          chunk.material.dispose();
          const [chunkX, chunkZ] = key.split(',').map(Number);
          const newChunk = createTerrainChunk(chunkX, chunkZ);
          scene.add(newChunk.mesh);
          terrainChunks.set(key, newChunk);
        }
      } else {
        // Add new chunk
        const [chunkX, chunkZ] = key.split(',').map(Number);
        const chunk = createTerrainChunk(chunkX, chunkZ);
        scene.add(chunk.mesh);
        terrainChunks.set(key, chunk);
      }
    });
  }

  // Initial terrain generation
  updateTerrainChunks();

  // Animation Loop
  function animate() {
    if (!renderer.domElement) return;
    animationFrameId = requestAnimationFrame(animate);
    
    // Smooth turning
    movementAngle += (targetAngle - movementAngle) * 0.05;
    
    // Smooth elevation changes
    currentElevation += (targetElevation - currentElevation) * 0.05;
    
    // Move camera in the direction it's facing
    camera.position.x -= Math.sin(movementAngle) * cameraSpeed;
    camera.position.z -= Math.cos(movementAngle) * cameraSpeed;
    camera.position.y = currentElevation;
    
    // Update camera rotation based on mouse with damping
    cameraRotation.x += (mouseY * 0.5 - cameraRotation.x) * 0.05;
    cameraRotation.y += (mouseX * 0.5 - cameraRotation.y) * 0.05;
    
    // Apply rotation to camera (combine movement angle with mouse look)
    camera.rotation.x = -cameraRotation.x * 0.5;
    camera.rotation.y = movementAngle - cameraRotation.y * 0.5;
    
    // Make sky follow camera
    sky.position.copy(camera.position);
    
    // Update directional light to follow camera
    directionalLight.position.set(
      camera.position.x + 100,
      150,
      camera.position.z + 50
    );
    
    // Update terrain chunks based on new camera position
    updateTerrainChunks();
    
    renderer.render(scene, camera);
  }

  animate();

  // Resize Handling
  const handleResize = () => {
    if (!container || !renderer.domElement) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  // Cleanup Function
  const cleanup = () => {
    console.log('Cleaning up procedural terrain component...');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    window.removeEventListener('resize', handleResize);

    // Clean up all terrain chunks
    terrainChunks.forEach(chunk => {
      scene.remove(chunk.mesh);
      chunk.geometry.dispose();
      chunk.material.dispose();
    });
    terrainChunks.clear();

    if(ambientLight) scene.remove(ambientLight);
    if(directionalLight) scene.remove(directionalLight);
    
    if(sky) {
      scene.remove(sky);
      skyGeometry.dispose();
      skyMaterial.dispose();
    }

    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('click', onMouseClick);
    
    if(helpContainer && helpContainer.parentElement) {
      helpContainer.parentElement.removeChild(helpContainer);
    }

    if (renderer) {
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }

    console.log('Procedural terrain cleanup complete.');
  };

  return cleanup;
}