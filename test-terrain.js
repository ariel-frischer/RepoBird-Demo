// Simple validation test for the procedural terrain component
import { readFileSync } from 'fs';

console.log('Testing procedural terrain component...');

try {
  // Read the component file
  const terrainCode = readFileSync('/app/src/repos/ariel-frischer__RepoBird-Demo/src/components/procedural-terrain.js', 'utf8');
  
  // Check for key features
  const checks = [
    { name: 'Export init function', pattern: /export function init\(container\)/ },
    { name: 'Noise generation', pattern: /createNoise2D/ },
    { name: 'Vertex colors', pattern: /vertexColors: true/ },
    { name: 'Flat shading (low-poly)', pattern: /flatShading: true/ },
    { name: 'Keyboard controls', pattern: /handleKeyDown/ },
    { name: 'WASD controls', pattern: /KeyW.*KeyS.*KeyA.*KeyD/s },
    { name: 'Mouse controls', pattern: /handleMouseMove/ },
    { name: 'Atmospheric fog', pattern: /THREE\.Fog/ },
    { name: 'Fractal noise (octaves)', pattern: /octaves/ },
    { name: 'Cleanup function', pattern: /const cleanup = \(\) => \{/ },
    { name: 'Build time measurement', pattern: /buildTime/ },
    { name: 'Instructions overlay', pattern: /instructions\.innerHTML/ }
  ];

  let passed = 0;
  let failed = 0;

  checks.forEach(check => {
    if (check.pattern.test(terrainCode)) {
      console.log(`✓ ${check.name}`);
      passed++;
    } else {
      console.log(`✗ ${check.name}`);
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  // Check if terrain is enabled in main.js
  const mainCode = readFileSync('/app/src/repos/ariel-frischer__RepoBird-Demo/src/main.js', 'utf8');
  if (mainCode.includes("'procedural-terrain': () => import('./components/procedural-terrain.js')")) {
    console.log('✓ Terrain enabled in main.js demos list');
  } else {
    console.log('✗ Terrain not enabled in main.js demos list');
  }

  if (failed === 0) {
    console.log('\n🎉 All terrain component features implemented successfully!');
  } else {
    console.log(`\n⚠️  ${failed} features missing or need attention`);
  }

} catch (error) {
  console.error('Error reading terrain component:', error.message);
}