import * as THREE from 'three';

console.log('Three.js version:', THREE.REVISION);

const appContainer = document.getElementById('app-container');
const demoSelectorContainer = document.getElementById('demo-selector');

let currentCleanup = null; // To store the cleanup function of the active demo

// Define available demos
const demos = {
    'spinning-cube': () => import('./components/spinning-cube.js'),
    'bouncing-ball': () => import('./components/bouncing-ball.js'),
    '3d-text': () => import('./components/3d-text.js'),
    'rubiks-cube': () => import('./components/rubiks-cube.js'),
    'solar-system': () => import('./components/solar-system.js'),
};

async function loadDemo(demoName) {
    // 1. Cleanup previous demo
    if (currentCleanup) {
        console.log('Cleaning up previous demo...');
        currentCleanup();
        currentCleanup = null;
    }

    // 2. Clear container content (redundant if cleanup removes canvas, but safe)
    appContainer.innerHTML = ''; 

    // 3. Check if demo exists
    if (!demos[demoName]) {
        console.error(`Demo "${demoName}" not found.`);
        appContainer.innerHTML = `<p>Error: Demo "${demoName}" not found.</p>`;
        return;
    }

    // 4. Show loading message
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = `Loading ${demoName}...`;
    appContainer.appendChild(loadingMessage);

    // 5. Dynamically import and run the demo
    try {
        console.log(`Attempting to load demo: ${demoName}`);
        const demoModule = await demos[demoName]();

        // Clear loading message only after successful import
        if (appContainer.contains(loadingMessage)) {
            appContainer.removeChild(loadingMessage);
        }

        if (demoModule && typeof demoModule.init === 'function') {
            console.log(`Initializing demo: ${demoName}`);
            // Pass the container and store the returned cleanup function
            currentCleanup = demoModule.init(appContainer); 
            if (typeof currentCleanup !== 'function') {
                console.warn(`Demo "${demoName}" init function did not return a cleanup function.`);
                currentCleanup = null; // Ensure it's null if not a function
            }
        } else {
            console.error(`Error: Demo module "${demoName}" does not have an init function.`);
            appContainer.innerHTML = `<p>Error loading demo: ${demoName}. Invalid format.</p>`;
        }
    } catch (error) {
        console.error(`Error loading demo "${demoName}":`, error);
        // Ensure loading message is removed on error too
        if (appContainer.contains(loadingMessage)) {
            appContainer.removeChild(loadingMessage);
        }
        appContainer.innerHTML = `<p>Error loading demo: ${demoName}. Check console for details.</p>`;
        // Ensure cleanup state is reset on error
        if (currentCleanup) {
             // This cleanup might not exist if the error happened during import/init
             try {
                 currentCleanup();
             } catch (cleanupError) {
                 console.error("Error during cleanup after load error:", cleanupError);
             }
             currentCleanup = null;
        }
    }
}

function createDemoSelector() {
    const select = document.createElement('select');
    select.id = 'demo-select';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a Demo --';
    select.appendChild(defaultOption);

    // Populate options from the demos object
    for (const name in demos) {
        const option = document.createElement('option');
        option.value = name;
        // Simple capitalization for display
        option.textContent = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        select.appendChild(option);
    }

    select.addEventListener('change', (event) => {
        const selectedDemo = event.target.value;
        if (selectedDemo) {
            loadDemo(selectedDemo);
        } else {
            // Reset view if default option is selected
            if (currentCleanup) {
                console.log("Cleaning up demo due to deselection...");
                currentCleanup();
                currentCleanup = null;
            }
            appContainer.innerHTML = '<p>Select a demo to begin</p>';
        }
    });

    // Clear any previous selector and add the new one
    demoSelectorContainer.innerHTML = ''; 
    demoSelectorContainer.appendChild(select);
}

// Initialize
createDemoSelector();
// Set initial state message
appContainer.innerHTML = '<p>Select a demo to begin</p>'; 
console.log('Demo selection UI created. Waiting for demo selection...');
