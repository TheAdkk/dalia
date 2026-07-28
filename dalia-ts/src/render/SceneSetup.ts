import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
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
  filmPass: FilmPass;
  afterimagePass: AfterimagePass;
  glitchPass: GlitchPass;
  rgbShiftPass: ShaderPass;
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
  edgeGeometry: THREE.BufferGeometry;
  edgeMaterial: THREE.LineBasicMaterial;
  edgeLines: THREE.LineSegments;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grd.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grd.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
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

  // Zero-copy per-vertex color buffer (RGB float, mirrors geometry layout).
  const colorPtr = engine.get_color_ptr();
  const colorLen = engine.get_color_len();
  const wasmColorView = new Float32Array(wasmModule.memory.buffer, colorPtr, colorLen);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(wasmMemoryView, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(wasmColorView, 3));
  const leftGeometry = new THREE.BufferGeometry();
  leftGeometry.setAttribute('position', new THREE.BufferAttribute(leftWasmMemoryView, 3));
  const rightGeometry = new THREE.BufferGeometry();
  rightGeometry.setAttribute('position', new THREE.BufferAttribute(rightWasmMemoryView, 3));

  const glowTexture = createGlowTexture();

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.068,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.62,
    map: glowTexture,
    depthWrite: false,
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
    map: glowTexture,
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

  leftPointsMaterial.map = glowTexture;
  rightPointsMaterial.map = glowTexture;
  leftAccentMaterial.map = glowTexture;
  rightAccentMaterial.map = glowTexture;

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

  // Erdős Lattice: unit-distance edges as additive line segments, fed zero-copy from
  // the WASM edge buffers (endpoint pairs). draw range + visibility are driven per
  // frame in main.ts by the active edge count.
  const edgePtr = engine.get_edge_ptr();
  const edgeCap = engine.get_edge_capacity();
  const edgeColorPtr = engine.get_edge_color_ptr();
  const edgeView = new Float32Array(wasmModule.memory.buffer, edgePtr, edgeCap);
  const edgeColorView = new Float32Array(wasmModule.memory.buffer, edgeColorPtr, edgeCap);
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgeView, 3));
  edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColorView, 3));
  edgeGeometry.setDrawRange(0, 0);
  const edgeMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edgeLines.frustumCulled = false; // positions live in WASM memory; skip bounding-sphere culling
  edgeLines.visible = false;
  scene.add(edgeLines);

  scene.fog = new THREE.FogExp2(0x000000, 0.03);

  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    0.42, 0.18, 0.2
  );

  const afterimagePass = new AfterimagePass();
  afterimagePass.uniforms['damp'].value = 0.72;

  // @ts-ignore: FilmPass signature changes frequently across three.js versions
  const filmPass = new FilmPass(0.45, 0.025, 648, false);

  const composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(afterimagePass);
  composer.addPass(bloomPass);
  composer.addPass(filmPass);

  // Keep Bloom at half resolution to reduce per-frame blur cost.
  bloomPass.setSize(window.innerWidth / 2, window.innerHeight / 2);

  const glitchPass = new GlitchPass();
  glitchPass.enabled = false;
  
  const rgbShiftPass = new ShaderPass(RGBShiftShader);
  rgbShiftPass.uniforms['amount'].value = 0.0;
  
  composer.addPass(glitchPass);
  composer.addPass(rgbShiftPass);
  const glitchController = createGlitchController(CONFIG.GLITCH_PROFILE);

  return {
    renderer, camera, scene, geometry, leftGeometry, rightGeometry, composer, bloomPass, filmPass, afterimagePass,
    glitchPass, rgbShiftPass, glitchController, pointsMaterial, points, centerAccentMaterial, centerAccentPoints,
    leftPointsMaterial, rightPointsMaterial, leftPoints, rightPoints, leftAccentMaterial, rightAccentMaterial,
    leftAccentPoints, rightAccentPoints, textureMaterial, texturePoints, noiseMaterial, noisePoints,
    tunnelGeometry, tunnelMaterial, tunnelPoints, tunnelPositions, sparkRingMaterial, sparkRingPoints,
    waveformGeometry, waveformMaterial, waveformLine, waveformPositions,
    edgeGeometry, edgeMaterial, edgeLines
  };
}
