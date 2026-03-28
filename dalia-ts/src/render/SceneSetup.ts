import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { createGlitchController, type GlitchController } from '../visual/glitchController';
import { CONFIG } from '../core/config';
import type { DaliaEngine, InitOutput } from '../wasm/dalia_core.js';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  geometry: THREE.BufferGeometry;
  leftGeometry: THREE.BufferGeometry;
  rightGeometry: THREE.BufferGeometry;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  glitchPass: GlitchPass;
  glitchController: GlitchController;
  pointsMaterial: THREE.PointsMaterial;
  points: THREE.Points;
  centerAccentMaterial: THREE.PointsMaterial;
  centerAccentPoints: THREE.Points;
  leftPointsMaterial: THREE.PointsMaterial;
  rightPointsMaterial: THREE.PointsMaterial;
  leftPoints: THREE.Points;
  rightPoints: THREE.Points;
  leftAccentMaterial: THREE.PointsMaterial;
  rightAccentMaterial: THREE.PointsMaterial;
  leftAccentPoints: THREE.Points;
  rightAccentPoints: THREE.Points;
  textureMaterial: THREE.PointsMaterial;
  texturePoints: THREE.Points;
  noiseMaterial: THREE.PointsMaterial;
  noisePoints: THREE.Points;
  tunnelGeometry: THREE.BufferGeometry;
  tunnelMaterial: THREE.PointsMaterial;
  tunnelPoints: THREE.Points;
  tunnelPositions: Float32Array;
  sparkRingMaterial: THREE.PointsMaterial;
  sparkRingPoints: THREE.Points;
  waveformGeometry: THREE.BufferGeometry;
  waveformMaterial: THREE.LineBasicMaterial;
  waveformLine: THREE.Line;
  waveformPositions: Float32Array;
  wasmMemoryView: Float32Array;
  leftWasmMemoryView: Float32Array;
  rightWasmMemoryView: Float32Array;
}

export function setupWebGL(
  canvas: HTMLCanvasElement,
  engine: DaliaEngine,
  leftEngine: DaliaEngine,
  rightEngine: DaliaEngine,
  wasmModule: InitOutput
): SceneContext {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.68;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(CONFIG.WORMHOLE_MODE ? 88 : 75, window.innerWidth / window.innerHeight, 0.1, 1000);
  if (CONFIG.WORMHOLE_MODE) {
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
  const wasmMemoryView = new Float32Array(wasmModule.memory.buffer, centerPtr, len);
  const leftWasmMemoryView = new Float32Array(wasmModule.memory.buffer, leftPtr, len);
  const rightWasmMemoryView = new Float32Array(wasmModule.memory.buffer, rightPtr, len);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(wasmMemoryView, 3));
  const leftGeometry = new THREE.BufferGeometry();
  leftGeometry.setAttribute('position', new THREE.BufferAttribute(leftWasmMemoryView, 3));
  const rightGeometry = new THREE.BufferGeometry();
  rightGeometry.setAttribute('position', new THREE.BufferAttribute(rightWasmMemoryView, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xaa55ff,
    size: 0.05,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.62,
  });

  const points = new THREE.Points(geometry, pointsMaterial);
  scene.add(points);

  const centerAccentMaterial = new THREE.PointsMaterial({
    color: 0xffd84a,
    size: 0.031,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const centerAccentPoints = new THREE.Points(geometry, centerAccentMaterial);
  scene.add(centerAccentPoints);

  const leftPointsMaterial = new THREE.PointsMaterial({
    color: 0x55d2ff,
    size: 0.043,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const rightPointsMaterial = new THREE.PointsMaterial({
    color: 0xff9a55,
    size: 0.043,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });

  const leftPoints = new THREE.Points(leftGeometry, leftPointsMaterial);
  const rightPoints = new THREE.Points(rightGeometry, rightPointsMaterial);
  leftPoints.position.x = -2.4;
  rightPoints.position.x = 2.4;
  scene.add(leftPoints);
  scene.add(rightPoints);

  const leftAccentMaterial = new THREE.PointsMaterial({
    color: 0xb8e61f,
    size: 0.027,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const rightAccentMaterial = new THREE.PointsMaterial({
    color: 0xff6d0a,
    size: 0.027,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const leftAccentPoints = new THREE.Points(leftGeometry, leftAccentMaterial);
  const rightAccentPoints = new THREE.Points(rightGeometry, rightAccentMaterial);
  leftAccentPoints.position.x = -2.4;
  rightAccentPoints.position.x = 2.4;
  scene.add(leftAccentPoints);
  scene.add(rightAccentPoints);

  if (CONFIG.SINGLE_CORE_MODE) {
    leftPoints.visible = false;
    rightPoints.visible = false;
    leftAccentPoints.visible = false;
    rightAccentPoints.visible = false;
  }

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
  const textureMaterial = new THREE.PointsMaterial({
    color: 0x88aaff,
    size: 0.018,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const texturePoints = new THREE.Points(textureGeometry, textureMaterial);
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
  const noiseMaterial = new THREE.PointsMaterial({
    color: 0x8a8a8a,
    size: 0.01,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const noisePoints = new THREE.Points(noiseGeometry, noiseMaterial);
  scene.add(noisePoints);

  const tunnelCount = 7600;
  const tunnelPositions = new Float32Array(tunnelCount * 3);
  for (let i = 0; i < tunnelCount; i++) {
    const i3 = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.2 + Math.pow(Math.random(), 0.62) * 9.5;
    tunnelPositions[i3] = Math.cos(angle) * radius;
    tunnelPositions[i3 + 1] = Math.sin(angle) * radius * 0.72;
    tunnelPositions[i3 + 2] = -150 + Math.random() * 170;
  }
  const tunnelGeometry = new THREE.BufferGeometry();
  tunnelGeometry.setAttribute('position', new THREE.BufferAttribute(tunnelPositions, 3));
  const tunnelMaterial = new THREE.PointsMaterial({
    color: 0x8a4a1a,
    size: 0.022,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  const tunnelPoints = new THREE.Points(tunnelGeometry, tunnelMaterial);
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
  const sparkRingMaterial = new THREE.PointsMaterial({
    color: 0xffd84a,
    size: 0.03,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const sparkRingPoints = new THREE.Points(ringGeometry, sparkRingMaterial);
  sparkRingPoints.visible = CONFIG.SHOW_SPARK_RING;
  sparkRingPoints.scale.set(0.2, 0.2, 0.2);
  scene.add(sparkRingPoints);

  const waveformSegments = 192;
  const waveformPositions = new Float32Array(waveformSegments * 3);
  for (let i = 0; i < waveformSegments; i++) {
    const i3 = i * 3;
    const x = ((i / (waveformSegments - 1)) - 0.5) * 6.8;
    waveformPositions[i3] = x;
    waveformPositions[i3 + 1] = 0;
    waveformPositions[i3 + 2] = 0;
  }

  const waveformGeometry = new THREE.BufferGeometry();
  waveformGeometry.setAttribute('position', new THREE.BufferAttribute(waveformPositions, 3));
  const waveformMaterial = new THREE.LineBasicMaterial({
    color: 0x8dc9ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const waveformLine = new THREE.Line(waveformGeometry, waveformMaterial);
  waveformLine.position.set(0, -1.35, 0.35);
  waveformLine.visible = CONFIG.SHOW_WAVEFORM;
  scene.add(waveformLine);

  scene.fog = new THREE.FogExp2(0x000000, 0.03);

  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42, 0.18, 0.2
  );

  const composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  const glitchPass = new GlitchPass();
  glitchPass.enabled = false;
  composer.addPass(glitchPass);
  const glitchController = createGlitchController(CONFIG.GLITCH_PROFILE);

  return {
    renderer, camera, scene, geometry, leftGeometry, rightGeometry, composer, bloomPass,
    glitchPass, glitchController, pointsMaterial, points, centerAccentMaterial, centerAccentPoints,
    leftPointsMaterial, rightPointsMaterial, leftPoints, rightPoints, leftAccentMaterial, rightAccentMaterial,
    leftAccentPoints, rightAccentPoints, textureMaterial, texturePoints, noiseMaterial, noisePoints,
    tunnelGeometry, tunnelMaterial, tunnelPoints, tunnelPositions, sparkRingMaterial, sparkRingPoints,
    waveformGeometry, waveformMaterial, waveformLine, waveformPositions, wasmMemoryView, leftWasmMemoryView,
    rightWasmMemoryView
  };
}
