import './style.css';
import init, { DaliaEngine } from './wasm/dalia_core.js';
import type { InitOutput } from './wasm/dalia_core.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';

// ─── Preset metadata ─────────────────────────────────────────────────────────
const PRESET_NAMES = [
  'Vector Sphere',
  'Mutant Torus',
  'Lissajous Knot',
  'Plasma Field',
  'Fractal Spiral',
  'Hyperbolic Paraboloid',
  'Nebula Vortex',
  'Chaos Ribbon',
];

const SPECTRAL_PALETTE = [
  new THREE.Color('#08120A'), // Sub-Sonic
  new THREE.Color('#18BF34'), // Bass
  new THREE.Color('#B8E61F'), // Upper Bass
  new THREE.Color('#FFB11A'), // Midrange
  new THREE.Color('#FF6D0A'), // Upper Midrange
  new THREE.Color('#FF1F1F'), // High End
  new THREE.Color('#B30000'), // Super High
  new THREE.Color('#2A0000'), // Super Sonic tail
];
const WHITE_POINT = new THREE.Color('#FFFFFF');
const liveColor = new THREE.Color('#AA55FF');
const spectralColor = new THREE.Color('#AA55FF');
const SINGLE_CORE_MODE = true;
const WORMHOLE_MODE = true;
const SHOW_WAVEFORM = false;
const SHOW_SPARK_RING = false;
const AUTO_PRESET_MUTATION = true;
const ENVIRONMENT_MODE = true;

// ─── WASM + Audio State ───────────────────────────────────────────────────────
let wasmModule: InitOutput;
let engine: DaliaEngine;
let leftEngine: DaliaEngine;
let rightEngine: DaliaEngine;
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let leftAnalyser: AnalyserNode;
let rightAnalyser: AnalyserNode;
let dataArray: Uint8Array<ArrayBuffer>;
let leftDataArray: Uint8Array<ArrayBuffer>;
let rightDataArray: Uint8Array<ArrayBuffer>;
let audioSampleRate = 44_100;
let isAudioConnected = false;

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const canvas       = document.getElementById('visualizer')      as HTMLCanvasElement;
const audioEl      = document.getElementById('audio-player')    as HTMLAudioElement;
const recordBtn    = document.getElementById('record-btn')      as HTMLButtonElement;
const playPauseBtn = document.getElementById('play-pause-btn')  as HTMLButtonElement;
const progressBar  = document.getElementById('progress-bar')    as HTMLInputElement;
const timeCurrent  = document.getElementById('time-current')    as HTMLSpanElement;
const timeTotal    = document.getElementById('time-total')      as HTMLSpanElement;
const presetIndicator = document.getElementById('preset-indicator') as HTMLSpanElement;
const trackIndicator = document.getElementById('track-indicator') as HTMLSpanElement;
const loadTrackBtn = document.getElementById('load-track-btn') as HTMLButtonElement;
const trackFileInput = document.getElementById('track-file-input') as HTMLInputElement;

// ─── Recording State ──────────────────────────────────────────────────────────
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let audioDestination: MediaStreamAudioDestinationNode | null = null;

// ─── Three.js State ───────────────────────────────────────────────────────────
let renderer:       THREE.WebGLRenderer;
let camera:         THREE.PerspectiveCamera;
let scene:          THREE.Scene;
let geometry:       THREE.BufferGeometry;
let leftGeometry:   THREE.BufferGeometry;
let rightGeometry:  THREE.BufferGeometry;
let composer:       EffectComposer;
let bloomPass:      UnrealBloomPass;
let glitchPass:     GlitchPass;
let pointsMaterial: THREE.PointsMaterial;
let points:         THREE.Points;
let centerAccentMaterial: THREE.PointsMaterial;
let centerAccentPoints: THREE.Points;
let leftPointsMaterial: THREE.PointsMaterial;
let rightPointsMaterial: THREE.PointsMaterial;
let leftPoints:     THREE.Points;
let rightPoints:    THREE.Points;
let leftAccentMaterial: THREE.PointsMaterial;
let rightAccentMaterial: THREE.PointsMaterial;
let leftAccentPoints: THREE.Points;
let rightAccentPoints: THREE.Points;
let textureMaterial: THREE.PointsMaterial;
let texturePoints:   THREE.Points;
let wasmMemoryView: Float32Array;
let leftWasmMemoryView: Float32Array;
let rightWasmMemoryView: Float32Array;
let noiseMaterial: THREE.PointsMaterial;
let noisePoints: THREE.Points;
let sparkRingMaterial: THREE.PointsMaterial;
let sparkRingPoints: THREE.Points;
let tunnelGeometry: THREE.BufferGeometry;
let tunnelMaterial: THREE.PointsMaterial;
let tunnelPoints: THREE.Points;
let tunnelPositions: Float32Array;
let waveformGeometry: THREE.BufferGeometry;
let waveformMaterial: THREE.LineBasicMaterial;
let waveformLine: THREE.Line;
let waveformPositions: Float32Array;

// ─── Camera choreography state ────────────────────────────────────────────────
let camOrbitAngle = 0;
let camZoomBase   = 8;
let camZoomTarget = 8;

// ─── Color hue accumulator ────────────────────────────────────────────────────
let energyFast = 0;
let energySlow = 0;
let transientPulse = 0;
let glitchBurst = 0;
let spectralFluxFast = 0;
let spectralFluxSlow = 0;
let spectralFluxGate = 0;
let feedbackWarp = 0;
let stereoWidthSmooth = 0;
let stereoBalanceSmooth = 0.5;
let leftEnergySmooth = 0;
let rightEnergySmooth = 0;
let prevSpectrum: Float32Array | null = null;
let momentaryLoudnessDb = -60;
let shortTermLoudnessDb = -60;
let integratedLoudnessDb = -60;
let loudnessPeakDb = -60;
let loudnessFloorDb = -60;
let dynamicRangeVisual = 0;
let plrVisual = 0;

const LEFT_TINT = new THREE.Color('#32D7FF');
const RIGHT_TINT = new THREE.Color('#FF9A36');
const leftLiveColor = new THREE.Color('#32D7FF');
const rightLiveColor = new THREE.Color('#FF9A36');
const accentColorA = new THREE.Color('#FFD84A');
const accentColorB = new THREE.Color('#7A42FF');

// ─── Mashup mode state ───────────────────────────────────────────────────────
const MASHUP_INTERVAL_MS = 15_000;
let mashupEnabled = false;
let mashupIntervalId: number | null = null;
let mashupBtnRef: HTMLButtonElement | null = null;
const DEFAULT_TRACK_NAME = 'test_music.opus';
let customTrackUrl: string | null = null;
let presetFlashTimeout: number | null = null;
let lastAutoPresetAtMs = 0;
let glitchCooldownUntilMs = 0;
let glitchActiveUntilMs = 0;

// ─── WebGL & Three.js Setup ───────────────────────────────────────────────────
function setupWebGL() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.68;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(WORMHOLE_MODE ? 88 : 75, window.innerWidth / window.innerHeight, 0.1, 1000);
  if (WORMHOLE_MODE) {
    camera.position.set(0, 0.4, 2.4);
    camera.lookAt(0, 0, -18);
  } else {
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
  }

  // Zero-copy links for center/left/right engines
  const centerPtr = engine.get_geometry_ptr();
  const leftPtr = leftEngine.get_geometry_ptr();
  const rightPtr = rightEngine.get_geometry_ptr();
  const len = engine.get_geometry_len();
  wasmMemoryView = new Float32Array(wasmModule.memory.buffer, centerPtr, len);
  leftWasmMemoryView = new Float32Array(wasmModule.memory.buffer, leftPtr, len);
  rightWasmMemoryView = new Float32Array(wasmModule.memory.buffer, rightPtr, len);

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(wasmMemoryView, 3));
  leftGeometry = new THREE.BufferGeometry();
  leftGeometry.setAttribute('position', new THREE.BufferAttribute(leftWasmMemoryView, 3));
  rightGeometry = new THREE.BufferGeometry();
  rightGeometry.setAttribute('position', new THREE.BufferAttribute(rightWasmMemoryView, 3));

  pointsMaterial = new THREE.PointsMaterial({
    color:       0xaa55ff,
    size:        0.05,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.62,
  });

  points = new THREE.Points(geometry, pointsMaterial);
  scene.add(points);

  centerAccentMaterial = new THREE.PointsMaterial({
    color:       0xffd84a,
    size:        0.031,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.16,
    depthWrite:  false,
  });
  centerAccentPoints = new THREE.Points(geometry, centerAccentMaterial);
  scene.add(centerAccentPoints);

  leftPointsMaterial = new THREE.PointsMaterial({
    color:       0x55d2ff,
    size:        0.043,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.34,
    depthWrite:  false,
  });
  rightPointsMaterial = new THREE.PointsMaterial({
    color:       0xff9a55,
    size:        0.043,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.34,
    depthWrite:  false,
  });

  leftPoints = new THREE.Points(leftGeometry, leftPointsMaterial);
  rightPoints = new THREE.Points(rightGeometry, rightPointsMaterial);
  leftPoints.position.x = -2.4;
  rightPoints.position.x = 2.4;
  scene.add(leftPoints);
  scene.add(rightPoints);

  leftAccentMaterial = new THREE.PointsMaterial({
    color:       0xb8e61f,
    size:        0.027,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.12,
    depthWrite:  false,
  });
  rightAccentMaterial = new THREE.PointsMaterial({
    color:       0xff6d0a,
    size:        0.027,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.12,
    depthWrite:  false,
  });
  leftAccentPoints = new THREE.Points(leftGeometry, leftAccentMaterial);
  rightAccentPoints = new THREE.Points(rightGeometry, rightAccentMaterial);
  leftAccentPoints.position.x = -2.4;
  rightAccentPoints.position.x = 2.4;
  scene.add(leftAccentPoints);
  scene.add(rightAccentPoints);

  if (SINGLE_CORE_MODE) {
    leftPoints.visible = false;
    rightPoints.visible = false;
    leftAccentPoints.visible = false;
    rightAccentPoints.visible = false;
  }

  // Depth texture layer: distant particles to add volume/parallax
  const textureCount = 4200;
  const texturePositions = new Float32Array(textureCount * 3);
  for (let i = 0; i < textureCount; i++) {
    const i3 = i * 3;
    const radius = 8 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    texturePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    texturePositions[i3 + 1] = radius * Math.cos(phi);
    texturePositions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const textureGeometry = new THREE.BufferGeometry();
  textureGeometry.setAttribute('position', new THREE.BufferAttribute(texturePositions, 3));
  textureMaterial = new THREE.PointsMaterial({
    color: 0x88aaff,
    size: 0.018,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  texturePoints = new THREE.Points(textureGeometry, textureMaterial);
  scene.add(texturePoints);

  const noiseCount = 6500;
  const noisePositions = new Float32Array(noiseCount * 3);
  for (let i = 0; i < noiseCount; i++) {
    const i3 = i * 3;
    const spread = 26;
    noisePositions[i3] = (Math.random() - 0.5) * spread;
    noisePositions[i3 + 1] = (Math.random() - 0.5) * spread * 0.8;
    noisePositions[i3 + 2] = (Math.random() - 0.5) * spread;
  }
  const noiseGeometry = new THREE.BufferGeometry();
  noiseGeometry.setAttribute('position', new THREE.BufferAttribute(noisePositions, 3));
  noiseMaterial = new THREE.PointsMaterial({
    color:       0x8a8a8a,
    size:        0.01,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.06,
    depthWrite:  false,
  });
  noisePoints = new THREE.Points(noiseGeometry, noiseMaterial);
  scene.add(noisePoints);

  const tunnelCount = 7600;
  tunnelPositions = new Float32Array(tunnelCount * 3);
  for (let i = 0; i < tunnelCount; i++) {
    const i3 = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.2 + Math.pow(Math.random(), 0.62) * 9.5;
    tunnelPositions[i3] = Math.cos(angle) * radius;
    tunnelPositions[i3 + 1] = Math.sin(angle) * radius * 0.72;
    tunnelPositions[i3 + 2] = -150 + Math.random() * 170;
  }
  tunnelGeometry = new THREE.BufferGeometry();
  tunnelGeometry.setAttribute('position', new THREE.BufferAttribute(tunnelPositions, 3));
  tunnelMaterial = new THREE.PointsMaterial({
    color:       0x8a4a1a,
    size:        0.022,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.11,
    depthWrite:  false,
  });
  tunnelPoints = new THREE.Points(tunnelGeometry, tunnelMaterial);
  tunnelPoints.position.z = -18;
  scene.add(tunnelPoints);

  const ringPoints = 220;
  const ringPositions = new Float32Array(ringPoints * 3);
  for (let i = 0; i < ringPoints; i++) {
    const a = (i / ringPoints) * Math.PI * 2;
    const i3 = i * 3;
    ringPositions[i3] = Math.cos(a);
    ringPositions[i3 + 1] = Math.sin(a) * 0.4;
    ringPositions[i3 + 2] = Math.sin(a);
  }
  const ringGeometry = new THREE.BufferGeometry();
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
  sparkRingMaterial = new THREE.PointsMaterial({
    color:       0xffd84a,
    size:        0.03,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    opacity:     0.0,
    depthWrite:  false,
  });
  sparkRingPoints = new THREE.Points(ringGeometry, sparkRingMaterial);
  sparkRingPoints.visible = SHOW_SPARK_RING;
  sparkRingPoints.scale.set(0.2, 0.2, 0.2);
  scene.add(sparkRingPoints);

  const waveformSegments = 192;
  waveformPositions = new Float32Array(waveformSegments * 3);
  for (let i = 0; i < waveformSegments; i++) {
    const i3 = i * 3;
    const x = ((i / (waveformSegments - 1)) - 0.5) * 6.8;
    waveformPositions[i3] = x;
    waveformPositions[i3 + 1] = 0;
    waveformPositions[i3 + 2] = 0;
  }

  waveformGeometry = new THREE.BufferGeometry();
  waveformGeometry.setAttribute('position', new THREE.BufferAttribute(waveformPositions, 3));
  waveformMaterial = new THREE.LineBasicMaterial({
    color: 0x8dc9ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  waveformLine = new THREE.Line(waveformGeometry, waveformMaterial);
  waveformLine.position.set(0, -1.35, 0.35);
  waveformLine.visible = SHOW_WAVEFORM;
  scene.add(waveformLine);

  scene.fog = new THREE.FogExp2(0x000000, 0.03);

  // Post-processing: Neon Bloom
  const renderScene = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42, 0.18, 0.2
  );

  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  glitchPass = new GlitchPass();
  glitchPass.enabled = false;
  composer.addPass(glitchPass);
}

function resizeCanvas() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function averageBand(
  data: Uint8Array<ArrayBuffer>,
  fromHz: number,
  toHz: number,
  sampleRate: number,
  fftSize: number,
): number {
  const binCount = Math.min(data.length, Math.max(1, Math.floor(fftSize / 2)));
  const hzPerBin = sampleRate / (2 * binCount);
  const from = Math.max(0, Math.min(binCount - 1, Math.floor(fromHz / hzPerBin)));
  const to = Math.max(from + 1, Math.min(binCount, Math.ceil(toHz / hzPerBin)));

  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += data[i] / 255;
  }
  return sum / (to - from);
}

// ─── Audio Setup ──────────────────────────────────────────────────────────────
function connectAudio() {
  if (isAudioConnected) return;
  audioCtx = new AudioContext();
  audioSampleRate = audioCtx.sampleRate;

  analyser = audioCtx.createAnalyser();
  leftAnalyser = audioCtx.createAnalyser();
  rightAnalyser = audioCtx.createAnalyser();
  analyser.fftSize               = 2048; // Higher resolution
  analyser.smoothingTimeConstant = 0.75;
  leftAnalyser.fftSize               = 2048;
  rightAnalyser.fftSize              = 2048;
  leftAnalyser.smoothingTimeConstant = 0.72;
  rightAnalyser.smoothingTimeConstant= 0.72;

  const source = audioCtx.createMediaElementSource(audioEl);
  const splitter = audioCtx.createChannelSplitter(2);

  source.connect(analyser);
  source.connect(splitter);
  splitter.connect(leftAnalyser, 0);
  splitter.connect(rightAnalyser, 1);
  analyser.connect(audioCtx.destination);

  audioDestination = audioCtx.createMediaStreamDestination();
  analyser.connect(audioDestination);

  dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)); // 1024 bins
  leftDataArray = new Uint8Array(new ArrayBuffer(leftAnalyser.frequencyBinCount));
  rightDataArray = new Uint8Array(new ArrayBuffer(rightAnalyser.frequencyBinCount));
  isAudioConnected = true;
  recordBtn.disabled = false;
}

// ─── Preset navigation ────────────────────────────────────────────────────────
function flashPresetIndicator() {
  presetIndicator.classList.add('changed');
  if (presetFlashTimeout !== null) window.clearTimeout(presetFlashTimeout);
  presetFlashTimeout = window.setTimeout(() => {
    presetIndicator.classList.remove('changed');
  }, 680);
}

function syncPresetIndicator() {
  const idx = engine.current_preset_index();
  const baseName = PRESET_NAMES[idx] ?? PRESET_NAMES[0];
  const mashupTag = mashupEnabled ? ' · AUTO 15s' : '';
  presetIndicator.textContent = `Preset: ${baseName}${mashupTag}`;
  flashPresetIndicator();
}

function setTrackIndicator(trackName: string, isCustomTrack: boolean) {
  trackIndicator.textContent = isCustomTrack
    ? `Track: ${trackName}`
    : `Track: ${trackName} (default)`;
}

function goNextPreset() {
  engine.next_preset();
  leftEngine.next_preset();
  rightEngine.next_preset();
  syncPresetIndicator();

  if (mashupEnabled) {
    if (mashupIntervalId !== null) window.clearInterval(mashupIntervalId);
    mashupIntervalId = window.setInterval(() => goNextPreset(), MASHUP_INTERVAL_MS);
  }
}

function goPrevPreset() {
  engine.prev_preset();
  leftEngine.prev_preset();
  rightEngine.prev_preset();
  syncPresetIndicator();

  if (mashupEnabled) {
    if (mashupIntervalId !== null) window.clearInterval(mashupIntervalId);
    mashupIntervalId = window.setInterval(() => goNextPreset(), MASHUP_INTERVAL_MS);
  }
}

function setMashupMode(enabled: boolean) {
  mashupEnabled = enabled;

  if (mashupIntervalId !== null) {
    window.clearInterval(mashupIntervalId);
    mashupIntervalId = null;
  }

  if (mashupEnabled) {
    mashupIntervalId = window.setInterval(() => goNextPreset(), MASHUP_INTERVAL_MS);
  }

  if (mashupBtnRef) {
    mashupBtnRef.classList.toggle('active', mashupEnabled);
    mashupBtnRef.title = mashupEnabled ? 'Mashup Auto (ON)' : 'Mashup Auto (OFF)';
  }

  syncPresetIndicator();
}

function maybeMutatePreset(dynamicScore: number, transientScore: number, nowMs: number) {
  if (!AUTO_PRESET_MUTATION || mashupEnabled) return;

  const cooldownMs = 2200 + (1 - dynamicScore) * 3000;
  if (nowMs - lastAutoPresetAtMs < cooldownMs) return;

  const trigger = transientScore > 0.58 || (dynamicScore > 0.64 && transientScore > 0.42);
  if (!trigger) return;

  // High dynamic range tends toward forward evolution; low range occasionally pulls back.
  if (dynamicScore > 0.72 || (dynamicScore > 0.5 && Math.random() < 0.62)) {
    goNextPreset();
  } else {
    goPrevPreset();
  }

  lastAutoPresetAtMs = nowMs;
}

type PresetEnvironment = {
  fogColor: number;
  fogDensity: number;
  textureOpacity: number;
  textureSize: number;
  noiseOpacity: number;
  noiseSize: number;
  tunnelSpin: number;
  tunnelWarp: number;
  tunnelHueMix: number;
  bloomBoost: number;
  glitchGain: number;
};

function getPresetEnvironment(presetIndex: number, dynamicScore: number, transientScore: number): PresetEnvironment {
  if (!ENVIRONMENT_MODE) {
    return {
      fogColor: 0x000000,
      fogDensity: 0.02,
      textureOpacity: 0.12,
      textureSize: 0.02,
      noiseOpacity: 0.08,
      noiseSize: 0.012,
      tunnelSpin: 0.0012,
      tunnelWarp: 0.12,
      tunnelHueMix: 0.24,
      bloomBoost: 0,
      glitchGain: 1,
    };
  }

  const phase = presetIndex % 4;
  const drive = Math.max(dynamicScore, transientScore);

  if (phase === 0) {
    // Brain-root: denser void, root-like noise pulse
    return {
      fogColor: 0x070504,
      fogDensity: 0.022 + drive * 0.014,
      textureOpacity: 0.14 + drive * 0.12,
      textureSize: 0.02 + drive * 0.014,
      noiseOpacity: 0.09 + drive * 0.14,
      noiseSize: 0.012 + drive * 0.01,
      tunnelSpin: 0.0014 + drive * 0.0018,
      tunnelWarp: 0.18 + drive * 0.12,
      tunnelHueMix: 0.34,
      bloomBoost: 0.01 + drive * 0.05,
      glitchGain: 0.85,
    };
  }

  if (phase === 1) {
    // Acid: saturated glow, smoother grain
    return {
      fogColor: 0x090c04,
      fogDensity: 0.018 + drive * 0.012,
      textureOpacity: 0.16 + drive * 0.13,
      textureSize: 0.023 + drive * 0.016,
      noiseOpacity: 0.07 + drive * 0.09,
      noiseSize: 0.01 + drive * 0.008,
      tunnelSpin: 0.0017 + drive * 0.0024,
      tunnelWarp: 0.24 + drive * 0.14,
      tunnelHueMix: 0.46,
      bloomBoost: 0.03 + drive * 0.08,
      glitchGain: 0.9,
    };
  }

  if (phase === 2) {
    // Psy: stronger tunnel twist, trance feel
    return {
      fogColor: 0x05060c,
      fogDensity: 0.017 + drive * 0.011,
      textureOpacity: 0.15 + drive * 0.1,
      textureSize: 0.021 + drive * 0.015,
      noiseOpacity: 0.08 + drive * 0.12,
      noiseSize: 0.011 + drive * 0.009,
      tunnelSpin: 0.0022 + drive * 0.003,
      tunnelWarp: 0.3 + drive * 0.16,
      tunnelHueMix: 0.58,
      bloomBoost: 0.02 + drive * 0.06,
      glitchGain: 0.95,
    };
  }

  // Glitch-tech: sharper artifacts with lower fog
  return {
    fogColor: 0x040404,
    fogDensity: 0.014 + drive * 0.01,
    textureOpacity: 0.12 + drive * 0.11,
    textureSize: 0.019 + drive * 0.013,
    noiseOpacity: 0.1 + drive * 0.16,
    noiseSize: 0.012 + drive * 0.012,
    tunnelSpin: 0.0015 + drive * 0.0022,
    tunnelWarp: 0.22 + drive * 0.15,
    tunnelHueMix: 0.4,
    bloomBoost: 0.01 + drive * 0.04,
    glitchGain: 1.05,
  };
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
  leftAnalyser.getByteFrequencyData(leftDataArray);
  rightAnalyser.getByteFrequencyData(rightDataArray);

  // Spectral flux onset detector (frame-to-frame positive deltas)
  if (!prevSpectrum || prevSpectrum.length !== dataArray.length) {
    prevSpectrum = new Float32Array(dataArray.length);
  }
  let fluxRaw = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const mag = dataArray[i] / 255;
    const delta = mag - prevSpectrum[i];
    if (delta > 0) fluxRaw += delta;
    prevSpectrum[i] = mag;
  }
  fluxRaw /= dataArray.length;
  spectralFluxFast += (fluxRaw - spectralFluxFast) * 0.4;
  spectralFluxSlow += (fluxRaw - spectralFluxSlow) * 0.04;
  const fluxTransient = Math.max(0, spectralFluxFast - spectralFluxSlow);
  const fluxTarget = clamp01((fluxTransient - 0.003) / 0.03);
  spectralFluxGate += (fluxTarget - spectralFluxGate) * 0.24;

  // 2. Send to Rust engines — center mix + pure left + pure right
  engine.process_audio(dataArray);
  leftEngine.process_audio(leftDataArray);
  rightEngine.process_audio(rightDataArray);

  // 3. Mark geometries as dirty (zero-copy shared buffers)
  geometry.attributes.position.needsUpdate = true;
  leftGeometry.attributes.position.needsUpdate = true;
  rightGeometry.attributes.position.needsUpdate = true;

  // ── Read live audio metrics from WASM ─────────────────────────────────────
  const bass    = engine.get_bass();
  const lowMid  = engine.get_low_mid();
  const mid     = engine.get_mid();
  const upperMid= engine.get_upper_mid();
  const treb    = engine.get_treb();
  const energy  = engine.get_energy();
  const subBass = engine.get_sub_bass();
  const presence= engine.get_presence();
  const air     = engine.get_air();

  const under150Left = averageBand(leftDataArray, 20, 150, audioSampleRate, leftAnalyser.fftSize);
  const under150Right = averageBand(rightDataArray, 20, 150, audioSampleRate, rightAnalyser.fftSize);
  const fullLeft = averageBand(leftDataArray, 20, 12_000, audioSampleRate, leftAnalyser.fftSize);
  const fullRight = averageBand(rightDataArray, 20, 12_000, audioSampleRate, rightAnalyser.fftSize);

  leftEnergySmooth += (fullLeft - leftEnergySmooth) * 0.16;
  rightEnergySmooth += (fullRight - rightEnergySmooth) * 0.16;

  const stereoWidthRaw = Math.abs(fullLeft - fullRight);
  stereoWidthSmooth += (stereoWidthRaw - stereoWidthSmooth) * 0.14;

  const rawBalance = clamp01(0.5 + (fullRight - fullLeft) * 0.95);
  stereoBalanceSmooth += (rawBalance - stereoBalanceSmooth) * 0.12;

  const stereoRms = Math.sqrt((fullLeft * fullLeft + fullRight * fullRight) * 0.5);
  const momentaryDbRaw = 20 * Math.log10(Math.max(stereoRms, 0.0001));
  momentaryLoudnessDb += (momentaryDbRaw - momentaryLoudnessDb) * 0.22;
  shortTermLoudnessDb += (momentaryDbRaw - shortTermLoudnessDb) * 0.05;
  integratedLoudnessDb += (momentaryDbRaw - integratedLoudnessDb) * 0.012;

  loudnessPeakDb = Math.max(loudnessPeakDb * 0.996, momentaryLoudnessDb);
  if (momentaryLoudnessDb < loudnessFloorDb) {
    loudnessFloorDb = momentaryLoudnessDb;
  } else {
    loudnessFloorDb += (momentaryLoudnessDb - loudnessFloorDb) * 0.002;
  }

  const lraDb = Math.max(0, loudnessPeakDb - loudnessFloorDb);
  const plrDb = Math.max(0, loudnessPeakDb - integratedLoudnessDb);
  dynamicRangeVisual += (clamp01((lraDb - 5) / 16) - dynamicRangeVisual) * 0.08;
  plrVisual += (clamp01((plrDb - 4) / 14) - plrVisual) * 0.08;
  const loudnessVisual = clamp01((momentaryLoudnessDb + 44) / 32);
  const loudnessDrift = clamp01((shortTermLoudnessDb - integratedLoudnessDb + 8) / 16);

  energyFast += (energy - energyFast) * 0.22;
  energySlow += (energy - energySlow) * 0.035;
  const transient = Math.max(0, energyFast - energySlow);
  transientPulse += (transient * 2.2 + subBass * 0.25 + spectralFluxGate * 0.5 - transientPulse) * 0.18;
  const pulse = Math.min(transientPulse, 1.0);
  const nowMs = performance.now();
  const time = nowMs * 0.0003;
  maybeMutatePreset(dynamicRangeVisual, Math.max(pulse, spectralFluxGate), nowMs);
  const presetIdx = engine.current_preset_index();
  const env = getPresetEnvironment(presetIdx, dynamicRangeVisual, Math.max(pulse, spectralFluxGate));

  // Stereo-aware low-end gate (<150Hz across L/R)
  const under150HzStereo = Math.max(under150Left, under150Right);
  const lowGate = clamp01((under150HzStereo - 0.26) / 0.56);
  glitchBurst = Math.max(glitchBurst * 0.96, lowGate * 0.58 + transient * 0.42 + subBass * 0.18 + spectralFluxGate * 0.18);

  // ── Spectral color mapping (Sub-Sonic -> Super Sonic) ───────────────────
  const spectralBands = [subBass, bass, lowMid, mid, upperMid, presence, treb, air];
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < spectralBands.length; i++) {
    const value = Math.max(0.0001, spectralBands[i]);
    weighted += i * value;
    total += value;
  }
  const centroid = total > 0 ? (weighted / total) : 0;
  const paletteIndex = Math.max(0, Math.min(SPECTRAL_PALETTE.length - 1, Math.round(centroid)));
  const nextPaletteIndex = Math.max(0, Math.min(SPECTRAL_PALETTE.length - 1, paletteIndex + (stereoBalanceSmooth > 0.5 ? 1 : -1)));
  const accentMix = clamp01(0.16 + stereoWidthSmooth * 0.34 + pulse * 0.12);
  spectralColor.lerp(SPECTRAL_PALETTE[paletteIndex], 0.16);

  const whiteMix = Math.max(0.02, Math.min(0.16, energy * 0.12 + pulse * 0.08 + transient * 0.05 + spectralFluxGate * 0.03));
  liveColor.copy(spectralColor).lerp(WHITE_POINT, whiteMix);
  pointsMaterial.color.lerp(liveColor, 0.14);

  centerAccentMaterial.color.copy(SPECTRAL_PALETTE[nextPaletteIndex]).lerp(accentColorB, accentMix * 0.2);
  centerAccentMaterial.opacity = clamp01(0.05 + plrVisual * 0.12 + stereoWidthSmooth * 0.08);
  centerAccentMaterial.size = Math.max(0.014, pointsMaterial.size * (0.62 + pulse * 0.16));

  leftLiveColor.copy(spectralColor).lerp(LEFT_TINT, clamp01(0.14 + stereoWidthSmooth * 0.42 + leftEnergySmooth * 0.18));
  rightLiveColor.copy(spectralColor).lerp(RIGHT_TINT, clamp01(0.14 + stereoWidthSmooth * 0.42 + rightEnergySmooth * 0.18));
  leftPointsMaterial.color.lerp(leftLiveColor, 0.16);
  rightPointsMaterial.color.lerp(rightLiveColor, 0.16);

  leftAccentMaterial.color.copy(SPECTRAL_PALETTE[Math.max(0, paletteIndex - 1)]).lerp(accentColorA, clamp01(0.2 + leftEnergySmooth * 0.4));
  rightAccentMaterial.color.copy(SPECTRAL_PALETTE[Math.min(SPECTRAL_PALETTE.length - 1, paletteIndex + 1)]).lerp(accentColorA, clamp01(0.2 + rightEnergySmooth * 0.4));
  leftAccentMaterial.opacity = clamp01(0.05 + leftEnergySmooth * 0.14 + stereoWidthSmooth * 0.08);
  rightAccentMaterial.opacity = clamp01(0.05 + rightEnergySmooth * 0.14 + stereoWidthSmooth * 0.08);

  textureMaterial.color.lerp(spectralColor, 0.1);
  pointsMaterial.opacity = Math.max(0.26, Math.min(0.62, 0.36 + presence * 0.1 + air * 0.05 + pulse * 0.03));
  leftPointsMaterial.opacity = clamp01(0.08 + leftEnergySmooth * 0.2 + stereoWidthSmooth * 0.16);
  rightPointsMaterial.opacity = clamp01(0.08 + rightEnergySmooth * 0.2 + stereoWidthSmooth * 0.16);

  renderer.toneMappingExposure = Math.max(0.58, Math.min(0.86, 0.62 + loudnessVisual * 0.16 + dynamicRangeVisual * 0.05 + spectralFluxGate * 0.03));

  // ── Particle size modulation (bass-driven) ────────────────────────────────
  // Sub-bass gives body, transients add short accents
  const targetSize = 0.046 + bass * 0.1 + subBass * 0.07 + treb * 0.02 + pulse * 0.04;
  pointsMaterial.size += (targetSize - pointsMaterial.size) * 0.12;
  const coreScaleTarget = 1.6 + energy * 0.52 + pulse * 0.3;
  points.scale.setScalar(points.scale.x + (coreScaleTarget - points.scale.x) * 0.08);
  centerAccentPoints.scale.setScalar(points.scale.x * 1.02);

  const panShift = SINGLE_CORE_MODE ? 0 : (stereoBalanceSmooth - 0.5) * 1.2;
  points.position.x = panShift * 0.24;
  leftPoints.position.x = SINGLE_CORE_MODE ? points.position.x : (-2.35 + panShift * 0.45);
  rightPoints.position.x = SINGLE_CORE_MODE ? points.position.x : (2.35 + panShift * 0.45);

  leftPointsMaterial.size = Math.max(0.01, pointsMaterial.size * (0.74 + leftEnergySmooth * 0.34 + stereoWidthSmooth * 0.14));
  rightPointsMaterial.size = Math.max(0.01, pointsMaterial.size * (0.74 + rightEnergySmooth * 0.34 + stereoWidthSmooth * 0.14));
  leftAccentPoints.position.x = leftPoints.position.x;
  rightAccentPoints.position.x = rightPoints.position.x;
  centerAccentPoints.position.x = points.position.x;

  // ── Texture + depth layer ────────────────────────────────────────────────
  texturePoints.rotation.y += 0.0002 + air * 0.001 + pulse * 0.0005;
  texturePoints.rotation.x  = Math.sin(time * 0.22) * 0.18;
  texturePoints.position.z += ((-1.2 - energy * 2.6) - texturePoints.position.z) * 0.05;
  textureMaterial.opacity = Math.max(0.04, Math.min(0.32, env.textureOpacity));
  textureMaterial.size = Math.max(0.01, Math.min(0.06, env.textureSize));
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.setHex(env.fogColor);
    scene.fog.density = Math.max(0.008, Math.min(0.06, env.fogDensity));
  }

  noisePoints.rotation.y += 0.00008 + air * 0.00045;
  noisePoints.rotation.x = Math.sin(time * 0.12) * 0.08;
  noiseMaterial.opacity = Math.max(0.04, Math.min(0.26, env.noiseOpacity));
  noiseMaterial.size = Math.max(0.006, Math.min(0.03, env.noiseSize));
  noiseMaterial.color.copy(spectralColor).lerp(WHITE_POINT, 0.06);

  // Wormhole tunnel layer
  const tunnelAttr = tunnelGeometry.getAttribute('position') as THREE.BufferAttribute;
  const tunnelCount = tunnelAttr.count;
  const tunnelSpeed = 0.24 + energy * 1.05 + subBass * 0.72 + pulse * 0.6 + feedbackWarp * 0.5;
  for (let i = 0; i < tunnelCount; i++) {
    const i3 = i * 3;
    tunnelPositions[i3 + 2] += tunnelSpeed;
    if (tunnelPositions[i3 + 2] > 8) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.2 + Math.pow(Math.random(), 0.62) * 9.5;
      tunnelPositions[i3] = Math.cos(angle) * radius;
      tunnelPositions[i3 + 1] = Math.sin(angle) * radius * 0.72;
      tunnelPositions[i3 + 2] = -150 - Math.random() * 20;
    }
  }
  tunnelAttr.needsUpdate = true;
  tunnelPoints.rotation.z += env.tunnelSpin + feedbackWarp * 0.013 + spectralFluxGate * 0.008;
  tunnelPoints.rotation.x = Math.sin(time * (0.16 + env.tunnelWarp)) * (0.05 + env.tunnelWarp * 0.08) + (stereoBalanceSmooth - 0.5) * 0.07;
  tunnelMaterial.opacity = clamp01(0.07 + energy * 0.18 + spectralFluxGate * 0.24 + dynamicRangeVisual * 0.08);
  tunnelMaterial.size = Math.max(0.013, Math.min(0.052, 0.02 + pulse * 0.014 + feedbackWarp * 0.012));
  tunnelMaterial.color.copy(spectralColor).lerp(accentColorA, env.tunnelHueMix);

  if (SHOW_SPARK_RING) {
    const sparkGate = clamp01((under150HzStereo - 0.24) / 0.36);
    sparkRingPoints.scale.setScalar(Math.max(0.2, 0.8 + sparkGate * 2.4 + pulse * 0.7));
    sparkRingMaterial.opacity = clamp01(0.02 + sparkGate * 0.18 + transient * 0.08);
    sparkRingMaterial.size = Math.max(0.018, Math.min(0.052, 0.022 + sparkGate * 0.03 + pulse * 0.01));
    sparkRingMaterial.color.copy(spectralColor).lerp(accentColorA, 0.35 + sparkGate * 0.2);
  }

  if (SHOW_WAVEFORM) {
    // Waveform overlay: low-cost temporal shape layer gated by spectral flux
    const waveAttr = waveformGeometry.getAttribute('position') as THREE.BufferAttribute;
    const waveCount = waveAttr.count;
    const binStep = Math.max(1, Math.floor(dataArray.length / waveCount));
    const waveAmp = 0.35 + energy * 0.85 + spectralFluxGate * 1.0;
    for (let i = 0; i < waveCount; i++) {
      const i3 = i * 3;
      const x = ((i / (waveCount - 1)) - 0.5) * 6.8;
      const sample = dataArray[Math.min(dataArray.length - 1, i * binStep)] / 255;
      const y = (sample - 0.5) * waveAmp * 2.4;
      waveformPositions[i3] = x;
      waveformPositions[i3 + 1] = y;
      waveformPositions[i3 + 2] = Math.sin((i * 0.11) + time * 1.8) * (0.08 + feedbackWarp * 0.16);
    }
    waveAttr.needsUpdate = true;
    waveformMaterial.opacity = clamp01(0.05 + energy * 0.22 + spectralFluxGate * 0.42);
    waveformMaterial.color.copy(spectralColor).lerp(WHITE_POINT, 0.18 + spectralFluxGate * 0.2);
    waveformLine.position.y = -1.38 + subBass * 0.32 + pulse * 0.16;
    waveformLine.rotation.y = (stereoBalanceSmooth - 0.5) * 0.25;
  }

  // Basic feedback warp: smooth scene-space distortion tied to musical energy
  const warpTarget = clamp01(mid * 0.55 + presence * 0.45 + spectralFluxGate * 0.65 + stereoWidthSmooth * 0.45);
  feedbackWarp += (warpTarget - feedbackWarp) * 0.11;
  const warpX = Math.sin(time * (0.9 + feedbackWarp * 0.8)) * feedbackWarp;
  const warpY = Math.cos(time * (0.7 + feedbackWarp * 0.6)) * feedbackWarp;
  texturePoints.position.x = warpX * 1.8;
  texturePoints.position.y = warpY * 1.3;
  noisePoints.position.x = -warpX * 0.9;
  noisePoints.position.z = -0.2 + warpY * 2.1;

  // ── Dynamic bloom (energy flares on drops) ────────────────────────────
  // Constrained bloom to avoid blown-out frames
  const targetBloom = Math.max(0.18, Math.min(0.72, 0.22 + subBass * 0.2 + energy * 0.12 + pulse * 0.12 + air * 0.05 + dynamicRangeVisual * 0.04 + plrVisual * 0.05 + loudnessDrift * 0.03 + glitchBurst * 0.02 + spectralFluxGate * 0.03 + env.bloomBoost));
  bloomPass.strength += (targetBloom - bloomPass.strength) * 0.06;
  bloomPass.radius    = Math.max(0.08, Math.min(0.32, 0.1 + treb * 0.12 + pulse * 0.08 + plrVisual * 0.04 + glitchBurst * 0.015));
  bloomPass.threshold = Math.max(0.14, Math.min(0.4, 0.24 + (1.0 - energy) * 0.09 - pulse * 0.04 - dynamicRangeVisual * 0.02 - glitchBurst * 0.01));
  bloomPass.strength = Math.min(bloomPass.strength, 0.68);

  // ── Camera choreography ───────────────────────────────────────────────────
  const camShake = Math.min(0.055, glitchBurst * 0.014 + transient * 0.012 + plrVisual * 0.01);
  const jitterX = (Math.random() - 0.5) * camShake;
  const jitterY = (Math.random() - 0.5) * camShake * 0.6;
  const jitterZ = (Math.random() - 0.5) * camShake;

  if (WORMHOLE_MODE) {
    camOrbitAngle += 0.0006 + mid * 0.0012 + pulse * 0.0008;
    camZoomTarget = 2.4 - subBass * 0.34 - pulse * 0.2 - dynamicRangeVisual * 0.14;
    camZoomBase += (camZoomTarget - camZoomBase) * 0.08;

    const driftX = Math.sin(time * 0.55 + camOrbitAngle) * 0.34;
    const driftY = Math.cos(time * 0.37 + camOrbitAngle * 0.7) * 0.24;

    camera.position.set(driftX + jitterX, driftY + jitterY, camZoomBase + jitterZ);
    camera.lookAt(0, 0, -22);

    points.position.z = -16 + pulse * 1.8;
    centerAccentPoints.position.z = points.position.z;
  } else {
    camOrbitAngle += 0.0016 + mid * 0.0028 + pulse * 0.0012;
    camZoomTarget = 8.28 - subBass * 0.86 - bass * 0.56 - pulse * 0.34 - dynamicRangeVisual * 0.22 - plrVisual * 0.16 + stereoWidthSmooth * 0.12;
    camZoomBase += (camZoomTarget - camZoomBase) * 0.05;

    const camX = Math.sin(camOrbitAngle) * (camZoomBase + Math.cos(time * 0.7) * 0.5);
    const camZ = Math.cos(camOrbitAngle) * (camZoomBase + Math.sin(time * 0.5) * 0.5);
    const camY = Math.sin(time * 0.4) * (0.9 + loudnessDrift * 0.12) + 0.9 + pulse * 0.1;

    camera.position.set(camX + jitterX, camY + jitterY, camZ + jitterZ);
    camera.lookAt(0, 0, 0);
  }

  // Subtle scene rotation synced to beat
  points.rotation.y += 0.00035 + bass * 0.0018 + pulse * 0.0012;
  points.rotation.x  = Math.sin(time * 0.3) * 0.07 + presence * 0.03 + pulse * 0.02;
  points.rotation.z  = Math.sin(time * 0.6) * feedbackWarp * 0.3;
  centerAccentPoints.rotation.y = points.rotation.y * 1.03;
  centerAccentPoints.rotation.x = points.rotation.x * 1.08;
  leftPoints.rotation.y = points.rotation.y * 0.9 - stereoWidthSmooth * 0.36;
  rightPoints.rotation.y = points.rotation.y * 0.9 + stereoWidthSmooth * 0.36;
  leftPoints.rotation.x = points.rotation.x * 0.85 + (leftEnergySmooth - rightEnergySmooth) * 0.2;
  rightPoints.rotation.x = points.rotation.x * 0.85 + (rightEnergySmooth - leftEnergySmooth) * 0.2;
  leftAccentPoints.rotation.y = leftPoints.rotation.y * 1.08;
  rightAccentPoints.rotation.y = rightPoints.rotation.y * 1.08;
  leftAccentPoints.rotation.x = leftPoints.rotation.x * 1.12;
  rightAccentPoints.rotation.x = rightPoints.rotation.x * 1.12;
  leftPoints.rotation.z = -feedbackWarp * 0.24;
  rightPoints.rotation.z = feedbackWarp * 0.24;

  // ── Controlled glitch accents (short, beat-driven) ──────────────────────
  const glitchLevel = Math.max(0, Math.min(1.0, (glitchBurst * 0.28 + lowGate * 0.3 + transient * 0.14 + pulse * 0.06 + spectralFluxGate * 0.1 - 0.34) * env.glitchGain));
  if (glitchLevel > 0.72 && nowMs > glitchCooldownUntilMs) {
    glitchActiveUntilMs = nowMs + (70 + glitchLevel * 130);
    glitchCooldownUntilMs = nowMs + 480 + (1 - glitchLevel) * 460;
  }
  const glitchEnabled = nowMs < glitchActiveUntilMs;
  glitchPass.enabled = glitchEnabled;
  glitchPass.goWild = glitchEnabled && glitchLevel > 0.95 && Math.random() < 0.008;
  const jitter = glitchEnabled ? Math.min(0.016, glitchLevel * 0.014) : 0;
  points.position.x = panShift * 0.24 + (Math.random() - 0.5) * jitter;
  points.position.y = (Math.random() - 0.5) * jitter * 0.6;

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

function initTrackPicker() {
  setTrackIndicator(DEFAULT_TRACK_NAME, false);

  loadTrackBtn.addEventListener('click', () => {
    trackFileInput.click();
  });

  trackFileInput.addEventListener('change', () => {
    const nextFile = trackFileInput.files?.[0];
    if (!nextFile) return;

    if (customTrackUrl) URL.revokeObjectURL(customTrackUrl);
    customTrackUrl = URL.createObjectURL(nextFile);

    const shouldResumePlayback = !audioEl.paused;
    audioEl.src = customTrackUrl;
    audioEl.load();
    audioEl.currentTime = 0;
    setTrackIndicator(nextFile.name, true);

    if (shouldResumePlayback) {
      void audioEl.play().catch(() => undefined);
    }

    trackFileInput.value = '';
  });
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
  leftEngine = new DaliaEngine();
  rightEngine = new DaliaEngine();

  setupWebGL();
  initPlayerUI();
  initTrackPicker();
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
  mashupBtn.title     = 'Mashup Auto (OFF)';
  mashupBtn.addEventListener('click', () => setMashupMode(!mashupEnabled));
  mashupBtnRef = mashupBtn;

  // Insert at the right side of the player
  const progressWrapper = player.querySelector('.progress-wrapper')!;
  player.insertBefore(prevBtn, progressWrapper);
  player.insertBefore(nextBtn, progressWrapper.nextSibling);
  player.appendChild(mashupBtn);

  // Show initial preset status inside the player bar
  try { syncPresetIndicator(); } catch (_) {}

  // Keyboard shortcuts: ← → cycle presets
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goNextPreset();
    if (e.key === 'ArrowLeft')  goPrevPreset();
  });

  renderLoop();
}

main().catch(console.error);
