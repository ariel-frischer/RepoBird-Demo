import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { init } from './boids-flocking-simulation.js'; // Adjust path if needed

// Note: This test runs in a browser-like environment provided by Vitest + Playwright/JSDOM.
// It primarily tests the lifecycle (init/cleanup) and basic DOM interaction.
// It does not test the visual output or complex simulation logic.

describe('Boids Flocking Simulation Component', () => {
    let container;
    let cleanupFunction;

    beforeEach(() => {
        // Create a container element for the demo to attach to
        container = document.createElement('div');
        document.body.appendChild(container);
        cleanupFunction = null;
    });

    afterEach(() => {
        // Ensure cleanup is called if it was returned
        if (typeof cleanupFunction === 'function') {
            try {
                cleanupFunction();
            } catch (e) {
                console.error('Error during test cleanup:', e);
            }
        }
        // Remove the container from the DOM
        if (container && container.parentElement) {
            container.parentElement.removeChild(container);
        }
        container = null;
    });

    it('should initialize and append a canvas to the container', () => {
        expect(container.children.length).toBe(0); // Container should be empty initially
        
        cleanupFunction = init(container);
        
        // Check if a canvas was added
        const canvas = container.querySelector('canvas');
        expect(canvas).not.toBeNull();
        expect(canvas instanceof HTMLCanvasElement).toBe(true);
        
        // Check if init returns a function (the cleanup function)
        expect(typeof cleanupFunction).toBe('function');
    });

    it('should cleanup and remove the canvas from the container', () => {
        cleanupFunction = init(container); // Initialize first
        
        const canvas = container.querySelector('canvas');
        expect(canvas).not.toBeNull(); // Canvas should exist after init

        if (typeof cleanupFunction === 'function') {
            cleanupFunction();
        } else {
            throw new Error('init did not return a cleanup function');
        }

        // Check if the canvas was removed
        const canvasAfterCleanup = container.querySelector('canvas');
        expect(canvasAfterCleanup).toBeNull();
        
        // Check if GUI is removed (lil-gui creates a div with class 'lil-gui')
        const guiElement = document.querySelector('.lil-gui');
        expect(guiElement).toBeNull(); // Assuming GUI is globally unique or removed correctly
    });

    it('init should return a cleanup function that does not error when called multiple times', () => {
        cleanupFunction = init(container);
        expect(typeof cleanupFunction).toBe('function');

        cleanupFunction(); // Call first time
        expect(() => cleanupFunction()).not.toThrow(); // Call second time
    });
    
    it('should handle container not being in document initially (if applicable)', () => {
        const detachedContainer = document.createElement('div');
        // Ensure init doesn't crash if container isn't in main document (some components might not care)
        let cleanupDetached = null;
        expect(() => {
            cleanupDetached = init(detachedContainer);
        }).not.toThrow();
        
        // If it initialized, check it returns a cleanup function
        if (cleanupDetached) {
             expect(typeof cleanupDetached).toBe('function');
             // And that cleanup also doesn't throw
             expect(() => cleanupDetached()).not.toThrow();
        }
    });
});