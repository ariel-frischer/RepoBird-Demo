'''import * as THREE from 'three';

console.log('Three.js version:', THREE.REVISION);

const appContainer = document.getElementById('app-container');
const sidebarContainer = document.getElementById('sidebar'); // Get the sidebar container

let currentCleanup = null; // To store the cleanup function of the active demo
let activeListItem = null; // To track the currently active list item

// Define available demos
const demos = {
    'spinning-cube': () => import('./components/spinning-cube.js'),
    'bouncing-ball': () => import('./components/bouncing-ball.js'),
    '3d-text': () => import('./components/3d-text.js'),
    'rubiks-cube': () => import('./components/rubiks-cube.js'),
    'solar-system': () => import('./components/solar-system.js'),
    'particle-emitter': () => import('./components/particle-emitter.js'),
    'torus-knot': () => import('./components/torus-knot.js'), // Added new demo
    'interactive-plane': () => import('./components/interactive-plane.js'),
    'car-viewer': () => import('./components/car-viewer.js')
};

async function loadDemo(demoKey) {
    // 1. Cleanup previous demo
    if (currentCleanup) {
        console.log('Cleaning up previous demo...');
        currentCleanup();
        currentCleanup = null;
    }

    // 2. Clear container content
    appContainer.innerHTML = '';

    // 3. Check if demo exists
    if (!demos[demoKey]) {
        console.error(`Demo "${demoKey}" not found.`);
        appContainer.innerHTML = `<p>Error: Demo "${demoKey}" not found.</p>`;
        return;
    }

    // 4. Show loading message
    const loadingMessage = document.createElement('p');
    // Format name for display in loading message
    const formattedName = demoKey.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    loadingMessage.textContent = `Loading ${formattedName}...`;
    appContainer.appendChild(loadingMessage);

    // 5. Dynamically import and run the demo
    try {
        console.log(`Attempting to load demo: ${demoKey}`);
        const demoModule = await demos[demoKey]();

        // Clear loading message only after successful import
        if (appContainer.contains(loadingMessage)) {
            appContainer.removeChild(loadingMessage);
        }

        if (demoModule && typeof demoModule.init === 'function') {
            console.log(`Initializing demo: ${demoKey}`);
            // Pass the container and store the returned cleanup function
            currentCleanup = demoModule.init(appContainer);
            if (typeof currentCleanup !== 'function') {
                console.warn(`Demo "${demoKey}" init function did not return a cleanup function.`);
                currentCleanup = null; // Ensure it's null if not a function
            }
        } else {
            console.error(`Error: Demo module "${demoKey}" does not have an init function.`);
            appContainer.innerHTML = `<p>Error loading demo: ${formattedName}. Invalid format.</p>`;
        }
    } catch (error) {
        console.error(`Error loading demo "${demoKey}":`, error);
        // Ensure loading message is removed on error too
        if (appContainer.contains(loadingMessage)) {
            appContainer.removeChild(loadingMessage);
        }
        appContainer.innerHTML = `<p>Error loading demo: ${formattedName}. Check console for details.</p>`;
        // Ensure cleanup state is reset on error
        if (currentCleanup) {
             try {
                 currentCleanup();
             } catch (cleanupError) {
                 console.error("Error during cleanup after load error:", cleanupError);
             }
             currentCleanup = null;
        }
    }
}

function populateSidebar(demosData) {
    if (!sidebarContainer) {
        console.error('Sidebar container not found!');
        return;
    }

    const ul = document.createElement('ul');
    ul.id = 'demo-list'; // Add an ID for easier targeting

    Object.keys(demosData).forEach(key => {
        const li = document.createElement('li');
        // Format name for display
        li.textContent = key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        li.dataset.demoKey = key; // Store the original key
        ul.appendChild(li);
    });

    // Add event listener using delegation
    ul.addEventListener('click', (event) => {
        if (event.target && event.target.nodeName === 'LI') {
            const demoKey = event.target.dataset.demoKey;
            if (demoKey) {
                // Remove active class from previous item
                if (activeListItem) {
                    activeListItem.classList.remove('active');
                }
                // Add active class to clicked item
                event.target.classList.add('active');
                activeListItem = event.target; // Update tracker

                loadDemo(demoKey);
            }
        }
    });

    sidebarContainer.innerHTML = ''; // Clear previous content
    sidebarContainer.appendChild(ul);
    console.log('Sidebar populated with demos.');

    // Return the list element for potential initial load targeting
    return ul;
}

// --- Initialization ---

// 1. Populate the sidebar
const demoListElement = populateSidebar(demos);

// 2. Load the first demo by default
const firstDemoKey = Object.keys(demos)[0];
if (firstDemoKey && demoListElement) {
    console.log(`Loading initial demo: ${firstDemoKey}`);
    loadDemo(firstDemoKey);

    // Find the corresponding list item and mark it as active
    const firstLi = demoListElement.querySelector(`li[data-demo-key="${firstDemoKey}"]`);
    if (firstLi) {
        firstLi.classList.add('active');
        activeListItem = firstLi;
    }
} else if (!firstDemoKey) {
     appContainer.innerHTML = '<p>No demos defined.</p>';
     console.warn('No demos found in the demos object.');
} else {
    // This case should ideally not happen if sidebar was populated
    appContainer.innerHTML = '<p>Could not load initial demo.</p>';
    console.error('Failed to find the demo list element for initial load styling.');
}

console.log('Application initialized.');
'''