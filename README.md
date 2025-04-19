# RepoBird-Demo

Demos of visual apps built with RepoBird using Three.js.

## Developed with RepoBird.ai

This repository showcases visual applications primarily implemented by the [RepoBird.ai](https://repobird.ai/) agent. You can explore the development process and see the agent's work by reviewing the closed [Issues](https://github.com/ariel-frischer/RepoBird-Demo/issues?q=is%3Aissue+is%3Aclosed) and [Pull Requests](https://github.com/ariel-frischer/RepoBird-Demo/pulls?q=is%3Apr+is%3Aclosed) for this project.


## Project Structure

```
/
├── index.html         # Main HTML entry point
├── style.css          # Basic styles
├── src/
│   ├── main.js          # Entry point – handles demo loading logic
│   ├── components/      # Individual Three.js demos
│   │   └── spinning-cube.js
│   │   └── ... (other components)
│   ├── utils/           # Shared utility functions (currently empty)
│   └── assets/          # Models, textures, fonts, etc. (currently empty)
│       ├── fonts/
│       └── models/
├── tests/
│   └── *.test.js        # Individual test files (e.g., spinning-cube.test.js)
├── README.md
└── package.json         # Project configuration and dependencies
```

## Running Locally

This project uses ES Modules and requires a local development server. We've included `live-server` for convenience, which provides automatic browser reloading when files change.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will automatically open the `index.html` page in your default browser and reload it when you save changes to project files.
3.  Use the sidebar menu to select and view the demos.

## Running Tests

This project uses [Vitest](https://vitest.dev/) with `@vitest/browser` and Playwright for testing the components in a real browser environment.

1.  **Install dependencies** (if you haven't already for running locally):
    ```bash
    npm install
    ```
2.  **Run tests:**
    *   To run the default browser tests (Chromium by default, configured in `vitest.config.js`):
        ```bash
        npm test
        ```
    *   You can also specify other browsers explicitly:
        ```bash
        npm run test:browser:firefox
        npm run test:browser:webkit

        # Run all browser tests sequentially (Chrome, Firefox, WebKit)
        npm run test:browser:chrome && npm run test:browser:firefox && npm run test:browser:webkit
        ```
3.  Test results will be displayed in your terminal.

### Testing Strategy

*   **Browser Tests (`npm test`):** These use `@vitest/browser` and Playwright to run tests in actual browser environments (Chromium, Firefox, WebKit). This is the primary way to test the Three.js components in this project. The default command `npm test` runs these tests.
*   **Focus:** The current tests primarily verify:
    *   Component initialization (`init` function runs without errors).
    *   A `<canvas>` element is correctly added to the container.
    *   The `cleanup` function is returned and executes without errors.
    *   The `<canvas>` element is removed upon cleanup.
*   **Limitations:** Vitest's browser mode currently does not support module mocking (`vi.mock`). Tests relying heavily on this feature (like `3d-text.test.js`) are excluded from the browser test suite (`vitest.workspace.js`) to avoid errors. These tests could potentially be run in Node.js mode if needed.
*   **Visual Consistency:** While not automatically asserted in the current tests, components should strive for visual consistency where appropriate (e.g., using the standard dark background color `0x1a1a1a`). Verifying rendering details like specific colors, lighting, or model appearance typically requires visual regression testing tools, which are not currently implemented.

## Notes

*   **Three.js Addons:** This project uses an `importmap` in `index.html` to manage Three.js imports. When importing addons (like `OrbitControls`, `FontLoader`, etc.), make sure to use the path prefix defined in the import map, which is currently `three/addons/`. For example: `import { OrbitControls } from 'three/addons/controls/OrbitControls.js';`. This differs from the older `three/examples/jsm/` path sometimes seen in examples.
