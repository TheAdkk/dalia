import './style.css';
import init, { DaliaEngine } from './wasm/dalia_core.js';
import type { InitOutput } from './wasm/dalia_core.js';
import * as THREE from 'three';

// ─── WASM + Audio State ───────────────────────────────────────
let wasmModule: InitOutput;
let engine: DaliaEngine;
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let frequencyData: Uint8Array;
let isAudioConnected = false;

// ─── DOM Elements ─────────────────────────────────────────────
const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const audioEl = document.getElementById('audio-player') as HTMLAudioElement;
const fpsCounter = document.getElementById('fps-counter')!;

// ─── FPS Tracking ─────────────────────────────────────────────
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

// ─── Three.js Ping-Pong WebGL Setup ────────────────────────────
let renderer: THREE.WebGLRenderer;
let camera: THREE.OrthographicCamera;
let scene: THREE.Scene;
let targetA: THREE.WebGLRenderTarget;
let targetB: THREE.WebGLRenderTarget;
let feedbackMaterial: THREE.ShaderMaterial;
let quad: THREE.Mesh;

// ─── Canvas / Three.js Setup ──────────────────────────────────
function setupWebGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene = new THREE.Scene();

  const rtOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  };

  targetA = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
  targetB = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);

  feedbackMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      u_zoom: { value: 1.0 },
      u_rot: { value: 0.0 },
      u_warp: { value: 0.0 },
      u_bass: { value: 0.0 },
      u_treb: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float u_zoom;
      uniform float u_rot;
      uniform float u_warp;
      uniform float u_bass;
      uniform float u_treb;
      uniform vec2 u_resolution;

      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        
        // Centered coordinates for rotation & zoom
        vec2 p = uv - 0.5;
        
        // Apply Warp
        p.x += sin(p.y * 10.0 + u_warp) * 0.01 * u_warp;
        p.y += cos(p.x * 10.0 + u_warp) * 0.01 * u_warp;

        // Apply Rotation
        float c = cos(u_rot);
        float s = sin(u_rot);
        mat2 rot_mat = mat2(c, -s, s, c);
        p = rot_mat * p;
        
        // Apply Zoom
        p /= u_zoom;
        
        vec2 sampleUv = p + 0.5;
        
        // Sample previous frame
        vec4 prevColor = texture2D(tDiffuse, sampleUv);
        
        // Music-reactive new color injection inside the tunnel center
        vec3 injectedColor = vec3(0.0);
        float d = length(p);
        if (d < 0.05 + u_bass * 0.1) {
            injectedColor = vec3(u_bass, u_treb * 0.5, 1.0 - u_bass);
        }

        // Add colors and slight fade out
        vec4 nextColor = prevColor * 0.98 + vec4(injectedColor, 1.0);
        gl_FragColor = nextColor;
      }
    `,
  });

  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), feedbackMaterial);
  scene.add(quad);
}

function resizeCanvas() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  targetA.setSize(window.innerWidth, window.innerHeight);
  targetB.setSize(window.innerWidth, window.innerHeight);
  feedbackMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
}

// ─── Audio Setup ──────────────────────────────────────────────
function connectAudio() {
  if (isAudioConnected) return;

  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;

  const source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  isAudioConnected = true;
}

// ─── Render Loop (60 FPS) ────────────────────────────────────
function renderLoop() {
  requestAnimationFrame(renderLoop);

  // FPS calculation
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
    fpsCounter.textContent = `FPS: ${currentFps}`;
  }

  if (!isAudioConnected || !analyser) return;

  // 1. Get raw frequency data from Web Audio API
  analyser.getByteFrequencyData(frequencyData as any);

  // 2. Pass raw bytes to Rust/WASM for processing (zero-copy bridge)
  engine.process_audio(frequencyData);

  // 3. Read calculated math presets directly from WASM memory
  const ptr = engine.get_shader_uniforms_ptr();
  const uniformsBuffer = new Float32Array(wasmModule.memory.buffer, ptr, 6);
  
  const [bass, _mid, treb, zoom, rot, warp] = uniformsBuffer;

  // 4. Update Shader Uniforms
  feedbackMaterial.uniforms.u_bass.value = bass;
  feedbackMaterial.uniforms.u_treb.value = treb;
  feedbackMaterial.uniforms.u_warp.value = warp;
  feedbackMaterial.uniforms.u_zoom.value = zoom;
  feedbackMaterial.uniforms.u_rot.value = rot;

  // 5. Ping-Pong Rendering
  // Render using targetA as input texture into targetB
  feedbackMaterial.uniforms.tDiffuse.value = targetA.texture;
  renderer.setRenderTarget(targetB);
  renderer.render(scene, camera);

  // Render targetB to the actual screen
  feedbackMaterial.uniforms.tDiffuse.value = targetB.texture;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  // Swap targets (Ping-Pong)
  const temp = targetA;
  targetA = targetB;
  targetB = temp;
}

// ─── Bootstrap ───────────────────────────────────────────────
async function main() {
  // Initialize WASM module
  wasmModule = await init();
  engine = new DaliaEngine();

  // Setup WebGL
  setupWebGL();
  window.addEventListener('resize', resizeCanvas);

  // Connect audio on first user interaction (autoplay policy)
  audioEl.addEventListener('play', () => {
    connectAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  });

  // Start render loop immediately
  renderLoop();

  console.log('🌺 Dalia Engine initialized — Phase 2: WebGL Feedback Loop active');
}

main().catch(console.error);
