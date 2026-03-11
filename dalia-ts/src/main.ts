import './style.css';
import init, { DaliaEngine } from './wasm/dalia_core.js';
import type { InitOutput } from './wasm/dalia_core.js';

// ─── WASM + Audio State ───────────────────────────────────────
let wasmModule: InitOutput;
let engine: DaliaEngine;
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let frequencyData: Uint8Array;
let isAudioConnected = false;

// ─── DOM Elements ─────────────────────────────────────────────
const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const audioEl = document.getElementById('audio-player') as HTMLAudioElement;
const fpsCounter = document.getElementById('fps-counter')!;
const bufferInfo = document.getElementById('buffer-info')!;

// ─── FPS Tracking ─────────────────────────────────────────────
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

// ─── Canvas Setup ─────────────────────────────────────────────
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
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

  bufferInfo.textContent = `Buffer: ${analyser.frequencyBinCount} bins`;
}

// ─── Visualization Renderer ──────────────────────────────────
function drawBars(processedData: Float32Array) {
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  const barCount = processedData.length;
  const barWidth = width / barCount;
  const gap = 1;

  // Clear with slight trail effect
  ctx.fillStyle = 'rgba(10, 10, 15, 0.3)';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < barCount; i++) {
    const value = processedData[i];
    const barHeight = value * height * 0.9;
    const x = i * barWidth;
    const y = height - barHeight;

    // Color gradient based on frequency position
    const ratio = i / barCount;
    let r: number, g: number, b: number;

    if (ratio < 0.33) {
      // Low frequencies — cyan
      r = 6;
      g = 182;
      b = 212;
    } else if (ratio < 0.66) {
      // Mid frequencies — purple
      r = 168;
      g = 85;
      b = 247;
    } else {
      // High frequencies — rose
      r = 244;
      g = 63;
      b = 94;
    }

    // Brightness scales with value
    const brightness = 0.4 + value * 0.6;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`;

    // Draw bar with gap
    ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);

    // Glow effect for louder bars
    if (value > 0.5) {
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowBlur = value * 15;
      ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
      ctx.shadowBlur = 0;
    }
  }
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
  analyser.getByteFrequencyData(frequencyData);

  // 2. Pass raw bytes to Rust/WASM for processing (zero-copy bridge)
  engine.process_audio(frequencyData);

  // 3. Read processed data directly from WASM linear memory (zero-copy read)
  const ptr = engine.get_processed_data_ptr();
  const len = engine.get_processed_data_len();
  const processedData = new Float32Array(wasmModule.memory.buffer, ptr, len);

  // 4. Draw visualization
  drawBars(processedData);
}

// ─── Bootstrap ───────────────────────────────────────────────
async function main() {
  // Initialize WASM module
  wasmModule = await init();
  engine = new DaliaEngine();

  // Setup canvas
  resizeCanvas();
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

  console.log('🌺 Dalia Engine initialized — Zero-Copy Audio Bridge active');
}

main().catch(console.error);
