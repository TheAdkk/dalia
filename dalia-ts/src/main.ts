import './style.css';
import init, { DaliaEngine } from './wasm/dalia_core.js';
import type { InitOutput } from './wasm/dalia_core.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── WASM + Audio State ───────────────────────────────────────
let wasmModule: InitOutput;
let engine: DaliaEngine;
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let dataArray: Uint8Array;
let isAudioConnected = false;

// ─── DOM Elements ─────────────────────────────────────────────
const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const audioEl = document.getElementById('audio-player') as HTMLAudioElement;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
const progressBar = document.getElementById('progress-bar') as HTMLInputElement;
const timeCurrent = document.getElementById('time-current') as HTMLSpanElement;
const timeTotal = document.getElementById('time-total') as HTMLSpanElement;

// ─── Recording State ──────────────────────────────────────────
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let audioDestination: MediaStreamAudioDestinationNode | null = null;

// ─── Three.js 3D Vector WebGL Setup ────────────────────────────
let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let geometry: THREE.BufferGeometry;
let composer: EffectComposer;
let pointsMaterial: THREE.PointsMaterial;
let points: THREE.Points;
let wasmMemoryView: Float32Array;

// ─── WebGL & Three.js 3D Pipeline ────────────────────────────
function setupWebGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 8;
  camera.position.y = 2;
  camera.lookAt(0, 0, 0);

  // Link to WASM Shared Memory
  const ptr = engine.get_geometry_ptr();
  const len = engine.get_geometry_len();
  wasmMemoryView = new Float32Array(wasmModule.memory.buffer, ptr, len);

  geometry = new THREE.BufferGeometry();
  // We use the WASM memory directly as the attribute buffer
  geometry.setAttribute('position', new THREE.BufferAttribute(wasmMemoryView, 3));

  pointsMaterial = new THREE.PointsMaterial({
    color: 0xaa55ff,
    size: 0.05,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8,
  });

  points = new THREE.Points(geometry, pointsMaterial);
  scene.add(points);

  // Post-Processing: Neon Bloom
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.5, 0.4, 0.1);
  bloomPass.strength = 1.5;
  bloomPass.radius = 0.5;
  bloomPass.threshold = 0.1;

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
  
  // Setup audio destination for recording
  audioDestination = audioCtx.createMediaStreamDestination();
  analyser.connect(audioDestination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
  isAudioConnected = true;
  recordBtn.disabled = false;
}

// ─── Recording Logic ─────────────────────────────────────────
function toggleRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  recordedChunks = [];
  
  // Capture canvas at 60 FPS
  const canvasStream = canvas.captureStream(60);
  
  // Combine canvas video track and audio destination track
  const audioTrack = audioDestination!.stream.getAudioTracks()[0];
  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), audioTrack]);

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm'; // Fallback
  }

  mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000 /* 5 Mbps */ });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'dalia-render.webm';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '🔴 REC';
  };

  mediaRecorder.start();
  recordBtn.classList.add('recording');
  recordBtn.textContent = '⏹ STOP';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// ─── Render Loop ─────────────────────────────────────────────
function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (!isAudioConnected || !analyser) {
    if (composer) composer.render();
    return;
  }

  // 1. Get raw frequency data from Web Audio API
  analyser.getByteFrequencyData(dataArray);

  // 2. Send to Rust to calculate new vertices
  engine.process_audio(dataArray);

  // 3. Notify Three.js that the shared memory data changed
  geometry.attributes.position.needsUpdate = true;
  
  // Modulate camera a bit based on time for extra life
  const time = performance.now() * 0.0005;
  camera.position.x = Math.sin(time) * 2;
  camera.position.z = 8 + Math.cos(time) * 1;
  camera.lookAt(0, 0, 0);

  // 4. Render via Composer (Bloom)
  composer.render();
}

// ─── Custom Player UI Logic ────────────────────────────────────
function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function initPlayerUI() {
  // Update time and progress bar
  audioEl.addEventListener('timeupdate', () => {
    const current = audioEl.currentTime;
    const duration = audioEl.duration;
    if (!isNaN(duration)) {
      progressBar.value = ((current / duration) * 100).toString();
      timeCurrent.textContent = formatTime(current);
      timeTotal.textContent = formatTime(duration);
    }
  });

  // Handle seeking via progress bar
  progressBar.addEventListener('input', () => {
    const duration = audioEl.duration;
    if (!isNaN(duration)) {
      const seekTo = (parseFloat(progressBar.value) / 100) * duration;
      audioEl.currentTime = seekTo;
    }
  });

  // Handle Play/Pause button
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

  // Hide controls on inactivity (optional polish)
  let timeout: number;
  const playerContainer = document.getElementById('floating-player');
  const resetIdleTimer = () => {
    playerContainer?.classList.remove('fade-out');
    clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      // Only fade out if playing and not hovering over controls
      if (!audioEl.paused && !playerContainer?.matches(':hover')) {
        playerContainer?.classList.add('fade-out');
      }
    }, 3000);
  };
  
  document.addEventListener('mousemove', resetIdleTimer);
  document.addEventListener('mousedown', resetIdleTimer);
  document.addEventListener('keydown', resetIdleTimer);
  resetIdleTimer();
}

// ─── Bootstrap ───────────────────────────────────────────────
async function main() {
  // Initialize WASM module
  wasmModule = await init();
  engine = new DaliaEngine();

  // Setup WebGL and UI
  setupWebGL();
  initPlayerUI();
  window.addEventListener('resize', resizeCanvas);

  // Connect audio on first user interaction to satisfy autoplay policy
  // We can hook it into the play button or the audio element playing
  audioEl.addEventListener('play', () => {
    connectAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    playPauseBtn.textContent = '⏸';
  });

  audioEl.addEventListener('pause', () => {
    playPauseBtn.textContent = '▶';
  });

  recordBtn.addEventListener('click', toggleRecording);

  // Add Mashup Mode Button programmatically or hook it if in HTML
  let mashupBtn = document.getElementById('mashup-btn');
  if (!mashupBtn) {
    mashupBtn = document.createElement('button');
    mashupBtn.id = 'mashup-btn';
    mashupBtn.className = 'control-btn mashup';
    mashupBtn.textContent = '🔀';
    mashupBtn.title = 'Mashup Mode';
    document.querySelector('.progress-wrapper')?.appendChild(mashupBtn);
  }
  
  mashupBtn.addEventListener('click', () => {
    engine.toggle_mashup();
  });

  renderLoop();
}

main().catch(console.error);
