import * as THREE from 'three';

console.log('Three.js version:', THREE.REVISION);

const appContainer = document.getElementById('app-container');
const sidebarContainer = document.getElementById('sidebar'); // Get the sidebar container
const menuToggle = document.getElementById('menu-toggle'); // Get the menu toggle button
const closeSidebarButton = document.getElementById('close-sidebar'); // Get the close sidebar button

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
    'torus-knot': () => import('./components/torus-knot.js'),
    'interactive-plane': () => import('./components/interactive-plane.js'),
    'wireframe-sphere': () => import('./components/wireframe-sphere.js'), // Added wireframe sphere
    'starfield': () => import('./components/starfield.js'),
    'shape-morphing': () => import('./components/shape-morphing.js'),
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

    // Find existing close button or create one if needed (though it should exist from HTML)
    let closeButton = sidebarContainer.querySelector('#close-sidebar');
    if (!closeButton) {
        console.warn('Close button not found in sidebar HTML, creating dynamically.');
        closeButton = document.createElement('button');
        closeButton.id = 'close-sidebar';
        closeButton.setAttribute('aria-label', 'Close menu');
        closeButton.innerHTML = '&times;'; // Use HTML entity for 'X'
        sidebarContainer.prepend(closeButton); // Add it at the beginning
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

    // Add event listener using delegation for demo links
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

                // Automatically close sidebar on mobile after selecting a demo
                if (window.innerWidth <= 768) {
                    sidebarContainer.classList.remove('sidebar-visible');
                }
            }
        }
    });

    // Clear previous content *except* the close button
    const existingList = sidebarContainer.querySelector('#demo-list');
    if (existingList) {
        sidebarContainer.removeChild(existingList);
    }
    sidebarContainer.appendChild(ul); // Append the new list

    console.log('Sidebar populated with demos.');

    // Return the list element for potential initial load targeting
    return ul;
}

// --- Initialization ---

// 1. Populate the sidebar (this also ensures the close button exists)
const demoListElement = populateSidebar(demos);

// 2. Set the desired default demo
const defaultDemoKey = 'starfield';

// 3. Load the default demo
if (demos[defaultDemoKey] && demoListElement) {
    console.log(`Loading initial demo: ${defaultDemoKey}`);
    loadDemo(defaultDemoKey);

    // Find the corresponding list item and mark it as active
    const defaultLi = demoListElement.querySelector(`li[data-demo-key="${defaultDemoKey}"]`);
    if (defaultLi) {
        defaultLi.classList.add('active');
        activeListItem = defaultLi;
    } else {
        console.warn(`Could not find sidebar item for default demo: ${defaultDemoKey}`);
    }
} else if (!demos[defaultDemoKey]) {
    console.error(`Default demo key "${defaultDemoKey}" not found in demos object.`);
    const firstDemoKey = Object.keys(demos)[0]; // Fallback to first demo if default is invalid
    if (firstDemoKey && demoListElement) {
        console.warn(`Falling back to loading first demo: ${firstDemoKey}`);
        loadDemo(firstDemoKey);
        const firstLi = demoListElement.querySelector(`li[data-demo-key="${firstDemoKey}"]`);
        if (firstLi) {
            firstLi.classList.add('active');
            activeListItem = firstLi;
        }
    } else {
        appContainer.innerHTML = '<p>No demos defined or sidebar error.</p>';
        console.warn('No demos found or sidebar failed to populate.');
    }
} else {
    // This case should ideally not happen if sidebar was populated
    appContainer.innerHTML = '<p>Could not load initial demo.</p>';
    console.error('Failed to find the demo list element for initial load styling.');
}


// --- Sidebar Toggle Logic ---

// Hamburger Menu Toggle
if (menuToggle && sidebarContainer) {
    menuToggle.addEventListener('click', () => {
        sidebarContainer.classList.toggle('sidebar-visible');
        console.log('Sidebar toggled via hamburger');
    });
    console.log('Hamburger toggle listener added.');
} else {
    console.warn('Menu toggle button or sidebar container not found, toggle functionality disabled.');
}

// Close Button Toggle
if (closeSidebarButton && sidebarContainer) {
    closeSidebarButton.addEventListener('click', () => {
        sidebarContainer.classList.remove('sidebar-visible');
        console.log('Sidebar closed via close button');
    });
    console.log('Sidebar close button listener added.');
} else {
    // Attempt to find it again in case populateSidebar created it dynamically
    const dynamicCloseButton = document.getElementById('close-sidebar');
    if (dynamicCloseButton && sidebarContainer) {
         dynamicCloseButton.addEventListener('click', () => {
             sidebarContainer.classList.remove('sidebar-visible');
             console.log('Sidebar closed via dynamically found close button');
         });
         console.log('Sidebar close button listener added (dynamically found).');
    } else {
        console.warn('Close sidebar button not found, close functionality disabled.');
    }
}


console.log('Application initialized.');
