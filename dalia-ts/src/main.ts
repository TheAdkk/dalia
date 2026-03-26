import './style.css';
import init, { DaliaEngine } from './wasm/dalia_core.js';
import type { InitOutput } from './wasm/dalia_core.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Preset metadata ─────────────────────────────────────────────────────────
const PRESET_NAMES = [
  'Vector Sphere',
  'Mutant Torus',
  'Lissajous Knot',
  'Plasma Field',
  'Fractal Spiral',
  'Hyperbolic Paraboloid',
];

// ─── WASM + Audio State ───────────────────────────────────────────────────────
let wasmModule: InitOutput;
let engine: DaliaEngine;
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let dataArray: Uint8Array<ArrayBuffer>;
let isAudioConnected = false;

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const canvas       = document.getElementById('visualizer')      as HTMLCanvasElement;
const audioEl      = document.getElementById('audio-player')    as HTMLAudioElement;
const recordBtn    = document.getElementById('record-btn')      as HTMLButtonElement;
const playPauseBtn = document.getElementById('play-pause-btn')  as HTMLButtonElement;
const progressBar  = document.getElementById('progress-bar')    as HTMLInputElement;
const timeCurrent  = document.getElementById('time-current')    as HTMLSpanElement;
const timeTotal    = document.getElementById('time-total')      as HTMLSpanElement;

// ─── Recording State ──────────────────────────────────────────────────────────
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let audioDestination: MediaStreamAudioDestinationNode | null = null;

// ─── Three.js State ───────────────────────────────────────────────────────────
let renderer:       THREE.WebGLRenderer;
let camera:         THREE.PerspectiveCamera;
let scene:          THREE.Scene;
let geometry:       THREE.BufferGeometry;
let composer:       EffectComposer;
let bloomPass:      UnrealBloomPass;
let pointsMaterial: THREE.PointsMaterial;
let points:         THREE.Points;
let wasmMemoryView: Float32Array;

// ─── Camera choreography state ────────────────────────────────────────────────
let camOrbitAngle = 0;
let camZoomBase   = 8;
let camZoomTarget = 8;

// ─── Color hue accumulator ────────────────────────────────────────────────────
let hueAccum = 0;
let energyFast = 0;
let energySlow = 0;
let transientPulse = 0;

// ─── Preset label overlay ─────────────────────────────────────────────────────
let labelTimeout: number | null = null;

// ─── WebGL & Three.js Setup ───────────────────────────────────────────────────
function setupWebGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 0, 0);

  // Zero-copy link to WASM geometry buffer
  const ptr = engine.get_geometry_ptr();
  const len = engine.get_geometry_len();
  wasmMemoryView = new Float32Array(wasmModule.memory.buffer, ptr, len);

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(wasmMemoryView, 3));

  pointsMaterial = new THREE.PointsMaterial({
    color:       0xaa55ff,
    size:        0.05,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.85,
  });

  points = new THREE.Points(geometry, pointsMaterial);
  scene.add(points);

  // Post-processing: Neon Bloom
  const renderScene = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42, 0.18, 0.2
  );

  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
}

function resizeCanvas() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Audio Setup ──────────────────────────────────────────────────────────────
function connectAudio() {
  if (isAudioConnected) return;
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize               = 2048; // Higher resolution
  analyser.smoothingTimeConstant = 0.75;

  const source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  audioDestination = audioCtx.createMediaStreamDestination();
  analyser.connect(audioDestination);

  dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)); // 1024 bins
  isAudioConnected = true;
  recordBtn.disabled = false;
}

// ─── Preset navigation ────────────────────────────────────────────────────────
function showPresetLabel(name: string) {
  const label = document.getElementById('preset-label')!;
  label.textContent  = name;
  label.style.opacity = '1';
  if (labelTimeout !== null) clearTimeout(labelTimeout);
  labelTimeout = window.setTimeout(() => {
    label.style.opacity = '0';
  }, 2200);
}

function goNextPreset() {
  engine.next_preset();
  const idx = engine.current_preset_index();
  showPresetLabel(PRESET_NAMES[idx] ?? '');
}

function goPrevPreset() {
  engine.prev_preset();
  const idx = engine.current_preset_index();
  showPresetLabel(PRESET_NAMES[idx] ?? '');
}

// ─── Render Loop ─────────────────────────────────────────────────────────────
function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (!isAudioConnected || !analyser) {
    if (composer) composer.render();
    return;
  }

  // 1. Pull frequency data from Web Audio API
  analyser.getByteFrequencyData(dataArray);

  // 2. Send to Rust — computes geometry + updates 8-band analysis
  engine.process_audio(dataArray);

  // 3. Mark geometry as dirty (zero-copy shared buffer)
  geometry.attributes.position.needsUpdate = true;

  // ── Read live audio metrics from WASM ─────────────────────────────────────
  const bass    = engine.get_bass();
  const mid     = engine.get_mid();
  const treb    = engine.get_treb();
  const energy  = engine.get_energy();
  const subBass = engine.get_sub_bass();
  const presence= engine.get_presence();
  const air     = engine.get_air();

  energyFast += (energy - energyFast) * 0.22;
  energySlow += (energy - energySlow) * 0.035;
  const transient = Math.max(0, energyFast - energySlow);
  transientPulse += (transient * 2.2 + subBass * 0.25 - transientPulse) * 0.18;
  const pulse = Math.min(transientPulse, 1.0);

  // ── Audio-reactive HSL color cycling ─────────────────────────────────────
  // Hue drifts with controlled speed and speeds up with transients
  hueAccum += 0.00055 + treb * 0.006 + presence * 0.0025 + pulse * 0.0015;
  if (hueAccum > 1) hueAccum -= 1;

  // Keep saturation vivid but avoid clipping highlights
  const saturation = Math.min(0.85, 0.52 + bass * 0.22 + presence * 0.08);
  // Lower lightness ceiling to preserve details and avoid eye strain
  const lightness  = Math.min(0.5, 0.24 + energy * 0.16 + mid * 0.07 + pulse * 0.05);
  pointsMaterial.color.setHSL(hueAccum, saturation, lightness);
  pointsMaterial.opacity = Math.max(0.32, Math.min(0.72, 0.45 + presence * 0.2 + air * 0.06 - pulse * 0.08));

  // ── Particle size modulation (bass-driven) ────────────────────────────────
  // Sub-bass gives body, transients add short accents
  const targetSize = 0.018 + bass * 0.05 + subBass * 0.035 + treb * 0.01 + pulse * 0.02;
  pointsMaterial.size += (targetSize - pointsMaterial.size) * 0.12;

  // ── Dynamic bloom (energy flares on drops) ────────────────────────────
  // Constrained bloom to avoid blown-out frames
  const targetBloom = Math.max(0.22, Math.min(0.72, 0.24 + subBass * 0.24 + energy * 0.14 + pulse * 0.18 + air * 0.06));
  bloomPass.strength += (targetBloom - bloomPass.strength) * 0.06;
  bloomPass.radius    = Math.max(0.1, Math.min(0.36, 0.12 + treb * 0.16 + pulse * 0.08));
  bloomPass.threshold = Math.max(0.12, Math.min(0.34, 0.2 + (1.0 - energy) * 0.15 - pulse * 0.07));

  // ── Camera choreography ───────────────────────────────────────────────────
  const time = performance.now() * 0.0003;
  camOrbitAngle += 0.0016 + mid * 0.0028 + pulse * 0.0012;

  // Bass-triggered zoom pulses toward the geometry
  camZoomTarget = 8.2 - subBass * 1.2 - bass * 0.8 - pulse * 0.6;
  camZoomBase  += (camZoomTarget - camZoomBase) * 0.05; // smooth lerp

  // Gentle serpentine motion on the orbit plane
  const camX = Math.sin(camOrbitAngle) * (camZoomBase + Math.cos(time * 0.7) * 0.5);
  const camZ = Math.cos(camOrbitAngle) * (camZoomBase + Math.sin(time * 0.5) * 0.5);
  const camY = Math.sin(time * 0.4) * 1.1 + 1.0 + pulse * 0.2;

  camera.position.set(camX, camY, camZ);
  camera.lookAt(0, 0, 0);

  // Subtle scene rotation synced to beat
  points.rotation.y += 0.00035 + bass * 0.0018 + pulse * 0.0012;
  points.rotation.x  = Math.sin(time * 0.3) * 0.07 + presence * 0.03 + pulse * 0.02;

  // 4. Render via Composer (Bloom)
  composer.render();
}

// ─── Player UI ────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function initPlayerUI() {
  audioEl.addEventListener('timeupdate', () => {
    const current  = audioEl.currentTime;
    const duration = audioEl.duration;
    if (!isNaN(duration)) {
      progressBar.value       = ((current / duration) * 100).toString();
      timeCurrent.textContent = formatTime(current);
      timeTotal.textContent   = formatTime(duration);
    }
  });

  progressBar.addEventListener('input', () => {
    const duration = audioEl.duration;
    if (!isNaN(duration)) {
      audioEl.currentTime = (parseFloat(progressBar.value) / 100) * duration;
    }
  });

  playPauseBtn.addEventListener('click', () => {
    if (audioEl.paused) {
      audioEl.play().then(() => {
        playPauseBtn.textContent = '⏸';
        document.getElementById('floating-player')?.classList.remove('fade-out');
      });
    } else {
      audioEl.pause();
      playPauseBtn.textContent = '▶';
    }
  });

  let idleTimeout: number;
  const playerContainer = document.getElementById('floating-player');
  const resetIdleTimer = () => {
    playerContainer?.classList.remove('fade-out');
    clearTimeout(idleTimeout);
    idleTimeout = window.setTimeout(() => {
      if (!audioEl.paused && !playerContainer?.matches(':hover')) {
        playerContainer?.classList.add('fade-out');
      }
    }, 3000);
  };
  document.addEventListener('mousemove',  resetIdleTimer);
  document.addEventListener('mousedown',  resetIdleTimer);
  document.addEventListener('keydown',    resetIdleTimer);
  resetIdleTimer();
}

// ─── Recording ────────────────────────────────────────────────────────────────
function toggleRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  recordedChunks = [];
  const canvasStream = canvas.captureStream(60);
  const audioTrack   = audioDestination!.stream.getAudioTracks()[0];
  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), audioTrack]);

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

  mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5_000_000 });
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.style.display = 'none';
    a.href     = url;
    a.download = 'dalia-render.webm';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '🔴 REC';
  };
  mediaRecorder.start();
  recordBtn.classList.add('recording');
  recordBtn.textContent = '⏹ STOP';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
  wasmModule = await init();
  engine     = new DaliaEngine();

  setupWebGL();
  initPlayerUI();
  window.addEventListener('resize', resizeCanvas);

  audioEl.addEventListener('play', () => {
    connectAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    playPauseBtn.textContent = '⏸';
  });
  audioEl.addEventListener('pause', () => { playPauseBtn.textContent = '▶'; });

  recordBtn.addEventListener('click', toggleRecording);

  // ── Inject preset navigation controls ────────────────────────────────────
  const player = document.getElementById('floating-player')!;

  // Prev/Next buttons
  const prevBtn = document.createElement('button');
  prevBtn.id        = 'prev-preset-btn';
  prevBtn.className = 'control-btn preset-nav';
  prevBtn.title     = 'Previous Preset';
  prevBtn.innerHTML = '&#9664;'; // ◀
  prevBtn.addEventListener('click', goPrevPreset);

  const nextBtn = document.createElement('button');
  nextBtn.id        = 'next-preset-btn';
  nextBtn.className = 'control-btn preset-nav';
  nextBtn.title     = 'Next Preset';
  nextBtn.innerHTML = '&#9654;'; // ▶
  nextBtn.addEventListener('click', goNextPreset);

  // Mashup (morph transition) button
  const mashupBtn = document.createElement('button');
  mashupBtn.id        = 'mashup-btn';
  mashupBtn.className = 'control-btn mashup';
  mashupBtn.textContent = '🔀';
  mashupBtn.title     = 'Mashup Mode';
  mashupBtn.addEventListener('click', goNextPreset);

  // Insert at the right side of the player
  const progressWrapper = player.querySelector('.progress-wrapper')!;
  player.insertBefore(prevBtn, progressWrapper);
  player.insertBefore(nextBtn, progressWrapper.nextSibling);
  player.appendChild(mashupBtn);

  // ── Preset label overlay ──────────────────────────────────────────────────
  const label          = document.createElement('div');
  label.id             = 'preset-label';
  label.className      = 'preset-label';
  label.textContent    = PRESET_NAMES[0];
  document.getElementById('app')!.appendChild(label);

  // Show initial preset name (guard against stale WASM bindings)
  try { showPresetLabel(PRESET_NAMES[engine.current_preset_index()] ?? PRESET_NAMES[0]); } catch (_) {}

  // Keyboard shortcuts: ← → cycle presets
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goNextPreset();
    if (e.key === 'ArrowLeft')  goPrevPreset();
  });

  renderLoop();
}

main().catch(console.error);
