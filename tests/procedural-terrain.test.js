import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { init } from '../src/components/procedural-terrain.js';

describe('Procedural Terrain Component', () => {
  let container;
  let cleanup;

  beforeEach(() => {
    // Create a mock container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    Object.defineProperty(container, 'clientWidth', { value: 800, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, writable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    if (container && container.parentElement) {
      document.body.removeChild(container);
    }
  });

  it('should initialize without errors', () => {
    expect(() => {
      cleanup = init(container);
    }).not.toThrow();
    expect(cleanup).toBeInstanceOf(Function);
  });

  it('should add canvas to container', () => {
    cleanup = init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('should add help text to container', () => {
    cleanup = init(container);
    const helpText = container.querySelector('div');
    expect(helpText).toBeTruthy();
    expect(helpText.textContent).toContain('Flight Controls');
  });

  it('should handle missing container gracefully', () => {
    const result = init(null);
    expect(result).toBeInstanceOf(Function);
    expect(() => result()).not.toThrow();
  });

  it('should handle resize events', () => {
    cleanup = init(container);
    
    // Change container size
    Object.defineProperty(container, 'clientWidth', { value: 1024, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 768, writable: true });
    
    // Trigger resize
    window.dispatchEvent(new Event('resize'));
    
    // Canvas should still exist after resize
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should clean up properly', () => {
    cleanup = init(container);
    
    const canvas = container.querySelector('canvas');
    const helpText = container.querySelector('div');
    
    expect(canvas).toBeTruthy();
    expect(helpText).toBeTruthy();
    
    // Call cleanup
    cleanup();
    
    // Check that canvas is removed
    const canvasAfter = container.querySelector('canvas');
    expect(canvasAfter).toBeFalsy();
  });
});