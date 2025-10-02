# CLAUDE.md - Repository Overview

## Purpose
Interactive Three.js demo showcase developed primarily by RepoBird AI agents. This repository demonstrates visual applications and serves as a portfolio of AI-assisted development capabilities.

## Tech Stack

### Core Libraries
- **Three.js** (v0.163.0) - 3D graphics library
- **ES Modules** - Module system (via importmap in index.html)
- **Vanilla JavaScript** - No framework, pure JS

### Development Tools
- **live-server** (v1.2.2) - Local dev server with auto-reload
- **Vitest** (v1.5.0) - Testing framework
- **@vitest/browser** - Browser-based test runner
- **Playwright** - Cross-browser testing (Chromium, Firefox, WebKit)

### Additional Dependencies
- **@tweenjs/tween.js** (v23.1.1) - Animation tweening
- **lil-gui** (v0.19.2) - UI controls for demos

## Project Structure

```
/workspace/
├── index.html              # Main entry point with importmap
├── style.css               # Global styles
├── src/
│   ├── main.js             # App initialization & demo loader
│   ├── components/         # Individual Three.js demos (12 demos)
│   │   ├── spinning-cube.js
│   │   ├── bouncing-ball.js
│   │   ├── 3d-text.js
│   │   ├── rubiks-cube.js
│   │   ├── solar-system.js
│   │   ├── particle-emitter.js
│   │   ├── torus-knot.js
│   │   ├── wireframe-sphere.js
│   │   ├── starfield.js         # Default demo
│   │   ├── shape-morphing.js
│   │   ├── boids-flocking.js
│   │   └── procedural-terrain.js
│   ├── vendor/             # Third-party libraries
│   │   └── simplex-noise.js
│   ├── utils/              # Shared utilities (currently empty)
│   └── assets/             # Models, textures, fonts (currently empty)
│       ├── fonts/
│       └── models/
├── tests/                  # Test files (*.test.js)
├── vitest.config.js        # Vitest configuration
└── vitest.workspace.js     # Test workspace configuration
```

## Key Components

### main.js (/workspace/src/main.js)
- **Demo Registry**: Object mapping demo keys to dynamic imports (line 14-27)
- **loadDemo()**: Handles component lifecycle - cleanup, import, init (line 29-124)
- **populateSidebar()**: Generates navigation menu from demos object (line 126-188)
- **Active Demo Tracking**: Manages `currentCleanup` and `activeListItem` state
- **Mobile-Responsive**: Sidebar toggle logic for mobile devices (line 233-265)

### Component Architecture
All demo components follow this pattern:
```javascript
// Component structure example (spinning-cube.js:1-30)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, animationFrameId;

function setupScene(container) { /* ... */ }
function createObjects() { /* ... */ }
function animate() { /* ... */ }
function cleanup() {
  // Cancel animation frames
  // Remove event listeners
  // Dispose resources
  // Remove canvas
}

export default { init: (container) => {
  setupScene(container);
  createObjects();
  animate();
  return cleanup;
}};
```

### Testing Strategy
- **Browser Tests**: Primary testing method using `@vitest/browser` + Playwright
- **Test Focus**: Component initialization, canvas creation/cleanup, error-free execution
- **Limitations**: No module mocking support in browser mode
- **Standard Assertions**:
  - `init()` runs without errors
  - Canvas element added to container
  - `cleanup()` executes successfully
  - Canvas removed after cleanup

## How to Run

### Development
```bash
npm install
npm run dev    # Starts live-server on port 8080
```

### Testing
```bash
npm test                          # Default (Chromium)
npm run test:browser:firefox      # Firefox
npm run test:browser:webkit       # WebKit
```

## Important Conventions

### Three.js Import Patterns
- **Use importmap paths** (index.html:9-17)
- Addons: `three/addons/` prefix (NOT `three/examples/jsm/`)
- Example: `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`

### Component Lifecycle
1. **init(container)**: Setup and start animation, return cleanup function
2. **cleanup()**: Stop animation, remove listeners, dispose resources, remove canvas
3. **Cleanup tracking**: main.js stores and calls cleanup when switching demos

### Visual Consistency
- Standard background color: `0x1a1a1a` (dark gray)
- Use `OrbitControls` for camera interaction where appropriate
- Enable antialiasing: `new THREE.WebGLRenderer({ antialias: true })`

### Demo Registration
To add a new demo:
1. Create component file in `/workspace/src/components/`
2. Add to `demos` object in main.js (line 14-27)
3. Create corresponding test file `*.test.js`

### Mobile Responsiveness
- Sidebar auto-closes on demo selection for screens ≤768px (main.js:170-172)
- Hamburger menu toggle for sidebar visibility

## Development History
This project was developed by RepoBird AI agents. Review closed Issues and Pull Requests on GitHub to see the development process and agent contributions.
