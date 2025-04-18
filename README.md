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
4.  Use the dropdown menu to select and view the demos.

## Running Tests

This project uses Mocha and Chai for browser-based testing. The tests verify the functionality of individual components.

1.  **Ensure you are serving the project directory** using a local web server (see "Running Locally" instructions above).
2.  **Open your web browser** and navigate to the main page (e.g., `http://localhost:8000`).
3.  The Mocha test results will be displayed directly on the page, usually below the main application container. Look for the Mocha reporter interface.
4.  Any test failures will be highlighted in red. All passing tests will be shown in green.
