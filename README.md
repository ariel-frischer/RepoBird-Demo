# RepoBird-Demo

Demos of visual apps built with RepoBird using Three.js.

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
│   ├── runner.js        # Test setup and execution script
│   └── *.test.js        # Individual test files (e.g., spinning-cube.test.js)
├── README.md
└── package.json         # (Not used in CDN setup)
```

## Running Locally

Since this project uses ES Modules (`import` statements in JavaScript), you need to serve the files using a local web server. You cannot simply open `index.html` directly in your browser from the file system.

1.  **Navigate to the project directory** in your terminal.
2.  **Start a simple web server.** If you have Python installed, you can use:
    ```bash
    python3 -m http.server
    ```
    (If `python3` doesn't work, try `python -m http.server`)
3.  **Open your web browser** and go to `http://localhost:8000` (or the address provided by the server).
4.  Use the sidebar menu to select and view the demos.

## Running Tests

This project uses [Vitest](https://vitest.dev/) with `@vitest/browser` and Playwright for testing the components in a real browser environment.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run tests:**
    *   To run tests in a headless browser (Chromium by default, configured in `vitest.config.js`):
        ```bash
        npm run test:browser
        ```
    *   To run tests using Node.js/JSDOM (if applicable for non-browser tests):
        ```bash
        npm test
        ```
    *   You can also specify other browsers if needed:
        ```bash
        npm run test:browser:firefox
        npm run test:browser:webkit
        ```
3.  Test results will be displayed in your terminal.
