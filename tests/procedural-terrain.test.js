import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { init } from '../src/components/procedural-terrain.js';

// Mock the OrbitControls
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    screenSpacePanning: false,
    maxPolarAngle: Math.PI / 2,
    minDistance: 20,
    maxDistance: 200,
    update: vi.fn(),
    dispose: vi.fn()
  }))
}));

// Mock simplex-noise
vi.mock('../src/vendor/simplex-noise.js', () => ({
  createNoise2D: vi.fn(() => ({
    noise2D: vi.fn((x, y) => Math.sin(x * 0.1) * Math.cos(y * 0.1))
  }))
}));

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

    // Mock WebGLRenderer
    vi.spyOn(THREE, 'WebGLRenderer').mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas')
    }));

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 16)));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    // Clean up
    if (cleanup) {
      cleanup();
    }
    document.body.removeChild(container);
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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
  });

  it('should handle missing container gracefully', () => {
    const result = init(null);
    expect(result).toBeInstanceOf(Function);
    expect(() => result()).not.toThrow();
  });

  it('should create scene with fog', () => {
    const sceneSpy = vi.spyOn(THREE, 'Scene');
    cleanup = init(container);
    
    expect(sceneSpy).toHaveBeenCalled();
    const scene = sceneSpy.mock.results[0].value;
    expect(scene.fog).toBeDefined();
  });

  it('should create camera with correct settings', () => {
    const cameraSpy = vi.spyOn(THREE, 'PerspectiveCamera');
    cleanup = init(container);
    
    expect(cameraSpy).toHaveBeenCalledWith(75, 800/600, 0.1, 1000);
  });

  it('should create lights', () => {
    const ambientLightSpy = vi.spyOn(THREE, 'AmbientLight');
    const directionalLightSpy = vi.spyOn(THREE, 'DirectionalLight');
    
    cleanup = init(container);
    
    expect(ambientLightSpy).toHaveBeenCalledWith(0xffffff, 0.4);
    expect(directionalLightSpy).toHaveBeenCalledWith(0xffffff, 0.8);
  });

  it('should handle resize events', () => {
    cleanup = init(container);
    
    // Change container size
    Object.defineProperty(container, 'clientWidth', { value: 1024, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 768, writable: true });
    
    // Trigger resize
    window.dispatchEvent(new Event('resize'));
    
    const renderer = THREE.WebGLRenderer.mock.results[0].value;
    expect(renderer.setSize).toHaveBeenCalledWith(1024, 768);
  });

  it('should clean up properly', () => {
    cleanup = init(container);
    
    const renderer = THREE.WebGLRenderer.mock.results[0].value;
    const canvas = container.querySelector('canvas');
    
    expect(canvas).toBeTruthy();
    
    // Call cleanup
    cleanup();
    
    expect(renderer.dispose).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should create terrain chunks', () => {
    const planeGeometrySpy = vi.spyOn(THREE, 'PlaneGeometry');
    cleanup = init(container);
    
    // Wait for initial terrain generation
    expect(planeGeometrySpy).toHaveBeenCalled();
    expect(planeGeometrySpy.mock.calls[0]).toEqual([100, 100, 50, 50]);
  });

  it('should use noise functions for terrain generation', async () => {
    const { createNoise2D } = await import('../src/vendor/simplex-noise.js');
    cleanup = init(container);
    
    // Verify noise generators were created
    expect(createNoise2D).toHaveBeenCalledTimes(3);
    
    // Wait a bit for animation loop
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify noise2D was called during terrain generation
    const noiseInstance = createNoise2D.mock.results[0].value;
    expect(noiseInstance.noise2D).toHaveBeenCalled();
  });
});