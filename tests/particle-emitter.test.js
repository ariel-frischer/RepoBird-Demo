import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ParticleEmitter } from '../src/components/particle-emitter.js';

describe('ParticleEmitter', () => {
  let container;
  let particleEmitter;

  beforeEach(() => {
    // Create a container element for the component to attach to
    container = document.createElement('div');
    document.body.appendChild(container);
    particleEmitter = new ParticleEmitter();
  });

  afterEach(() => {
    // Clean up the component and the container
    if (particleEmitter) {
      particleEmitter.cleanup();
    }
    if (container) {
      document.body.removeChild(container);
    }
    container = null;
    particleEmitter = null;
  });

  it('should initialize without errors', () => {
    expect(() => particleEmitter.init(container)).not.toThrow();
  });

  it('should add a canvas element to the container on init', () => {
    particleEmitter.init(container);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('should create a lil-gui instance on init', () => {
    particleEmitter.init(container);
    // Check if the gui property is added and is not null
    // Note: We may not be able to easily check the type without importing GUI here
    expect(particleEmitter.gui).toBeDefined();
    expect(particleEmitter.gui).not.toBeNull();
  });

  it('should run cleanup without errors', () => {
    particleEmitter.init(container);
    expect(() => particleEmitter.cleanup()).not.toThrow();
  });

  it('should remove the canvas element from the container on cleanup', () => {
    particleEmitter.init(container);
    particleEmitter.cleanup();
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  it('should destroy the lil-gui instance on cleanup', () => {
    particleEmitter.init(container);
    const guiInstance = particleEmitter.gui; // Get reference before cleanup
    particleEmitter.cleanup();
    expect(particleEmitter.gui).toBeNull();
    // Optional: Check if the gui DOM element is removed (lil-gui adds a div)
    // This depends on lil-gui's internal structure and might be fragile
    // expect(document.querySelector('.lil-gui')).toBeNull();
  });
});
