import './style.css';
import init, { DaliaEngine } from './wasm/dalia_core.js';
import type { InitOutput } from './wasm/dalia_core.js';
import * as THREE from 'three';
import { getPresetEnvironment } from './visual/presetEnvironment';
import { getPresetPsyMotion } from './visual/presetPsyMotion';
import { CONFIG } from './core/config';
import { AudioManager, type LookaheadTimeline } from './audio/AudioManager';
import { UIManager } from './ui/UIManager';
import { RecordingManager } from './ui/RecordingManager';
import { setupWebGL, type SceneContext } from './render/SceneSetup';
import {
  clamp01 as clampDynamics,
  computeAdaptiveHysteresis,
  computeAberrationAmount,
  computeDynamicCooldownMs,
  computeDynamicMashupScore,
  computeDropLikelihood,
  isBeatAligned,
} from './visual/rhythmDynamics';

// ─── Constants ───────────────────────────────────────────────────────────────
const liveColor = new THREE.Color('#AA55FF');
const spectralColor = new THREE.Color('#AA55FF');
const leftLiveColor = new THREE.Color('#32D7FF');
const rightLiveColor = new THREE.Color('#FF9A36');
const accentColorA = new THREE.Color('#FFD84A');
const accentColorB = new THREE.Color('#7A42FF');
const WHITE_POINT = new THREE.Color(CONFIG.WHITE_POINT);

// ─── Module State ────────────────────────────────────────────────────────────
let wasmModule: InitOutput;
let engine: DaliaEngine;
let leftEngine: DaliaEngine;
let rightEngine: DaliaEngine;
let sceneCtx: SceneContext;

const audio = new AudioManager();
const ui = new UIManager();
const recorder = new RecordingManager();



// ─── Animation & Math State ──────────────────────────────────────────────────
let camOrbitAngle = 0;
let camZoomBase   = 8;
let camZoomTarget = 8;

let energyFast = 0;
let energySlow = 0;
let transientPulse = 0;
let spectralFluxGate = 0;
let feedbackWarp = 0;
let stereoWidthSmooth = 0;
let stereoBalanceSmooth = 0.5;
let leftEnergySmooth = 0;
let rightEnergySmooth = 0;
let momentaryLoudnessDb = -60;
let shortTermLoudnessDb = -60;
let integratedLoudnessDb = -60;
let loudnessPeakDb = -60;
let loudnessFloorDb = -60;
let dynamicRangeVisual = 0;
let plrVisual = 0;

let masterHueBase = Math.random();
let harmonicConfidenceSmooth = 0;
let bpmSmooth = 120;
let bpmConfidenceSmooth = 0;
let predictedEnergyLead = 0;
let beatPulseSmooth = 0;

// ─── Mashup State ─────────────────────────────────────────────────────────────
let mashupEnabled = false;
let mashupIntervalId: number | null = null;
let lastAutoPresetAtMs = 0;
let mashupDynamicArmed = true;
let dropSyncPending = false;
let dropSyncWindowUntilMs = 0;
let dropSyncLastArmAtMs = 0;
let showFps = false;
let fpsSmoothed = 60;
let lastFrameAtMs = performance.now();
let presetTransitionEndsAtMs = 0;
let lookaheadTimelineToken = 0;

const UI_STATE_STORAGE_KEY = 'dalia.ui.settings.v1';

type PersistedUiState = {
  mashupEnabled: boolean;
  showFps: boolean;
  presetIndex: number;
};

let suppressStatePersist = false;

const ROBUST_WINDOW_FRAMES = CONFIG.ROBUST_NORMALIZATION_WINDOW_FRAMES;
const VOLATILITY_WINDOW_FRAMES = CONFIG.MASHUP_DYNAMIC_VOLATILITY_WINDOW_FRAMES;

const transientHistory: number[] = [];
const fluxHistory: number[] = [];
const energyHistory: number[] = [];
const lowBandHistory: number[] = [];
const dynamicScoreHistory: number[] = [];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampSigned(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function pushRolling(history: number[], value: number, maxSize: number): void {
  history.push(value);
  if (history.length > maxSize) {
    history.splice(0, history.length - maxSize);
  }
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) * 0.5;
  }
  return sorted[mid];
}

function madOf(values: number[], median: number): number {
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - median));
  return medianOf(deviations);
}

function robustNormalize(history: number[], value: number, maxSize: number): number {
  pushRolling(history, value, maxSize);
  if (history.length < 12) {
    return clamp01(value);
  }

  const median = medianOf(history);
  const mad = madOf(history, median);
  const z = (value - median) / (1.4826 * mad + 0.001);

  return clamp01((z + 1.5) / 3.5);
}

function computeVolatility(history: number[]): number {
  if (history.length < 8) return 0;
  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  const variance = history.reduce((sum, v) => {
    const d = v - mean;
    return sum + d * d;
  }, 0) / history.length;
  return Math.sqrt(variance);
}

function computeSpectralStability(history: number[]): number {
  if (history.length < 10) return 0.5;
  const median = medianOf(history);
  const mad = madOf(history, median);
  return clamp01(1 - mad / 0.15);
}

function averageBand(
  data: Uint8Array | null,
  fromHz: number,
  toHz: number,
  sampleRate: number,
  fftSize: number,
): number {
  if (!data) return 0;
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

function readPersistedUiState(): PersistedUiState | null {
  try {
    const raw = localStorage.getItem(UI_STATE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedUiState>;
    if (
      typeof parsed.mashupEnabled !== 'boolean' ||
      typeof parsed.showFps !== 'boolean' ||
      typeof parsed.presetIndex !== 'number'
    ) {
      return null;
    }

    return {
      mashupEnabled: parsed.mashupEnabled,
      showFps: parsed.showFps,
      presetIndex: parsed.presetIndex,
    };
  } catch {
    return null;
  }
}

function clearPersistedUiState() {
  try {
    localStorage.removeItem(UI_STATE_STORAGE_KEY);
  } catch {
    // no-op if storage is unavailable
  }
}

function persistUiState() {
  if (suppressStatePersist || !engine) return;

  try {
    const state: PersistedUiState = {
      mashupEnabled,
      showFps,
      presetIndex: engine.current_preset_index(),
    };
    localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op if storage is unavailable
  }
}

function applyPersistedUiState() {
  const persisted = readPersistedUiState();
  if (!persisted) return false;

  suppressStatePersist = true;
  setPresetByIndex(persisted.presetIndex);
  setMashupMode(persisted.mashupEnabled);
  setFpsMode(persisted.showFps);
  suppressStatePersist = false;
  persistUiState();

  return true;
}

function markPresetTransition(nowMs: number) {
  presetTransitionEndsAtMs = nowMs + CONFIG.MASHUP_TRANSITION_TARGET_MS;
}

function clearLookaheadTimelineOnEngines() {
  if (!engine || !leftEngine || !rightEngine) return;
  engine.clear_lookahead_timeline();
  leftEngine.clear_lookahead_timeline();
  rightEngine.clear_lookahead_timeline();
}

function applyLookaheadTimelineToEngines(timeline: LookaheadTimeline): boolean {
  if (!timeline || timeline.energy.length === 0) {
    return false;
  }

  const appliedMain = engine.set_lookahead_timeline(
    timeline.energy,
    timeline.transient,
    timeline.lowBand,
    timeline.fps,
  );
  const appliedLeft = leftEngine.set_lookahead_timeline(
    timeline.energy,
    timeline.transient,
    timeline.lowBand,
    timeline.fps,
  );
  const appliedRight = rightEngine.set_lookahead_timeline(
    timeline.energy,
    timeline.transient,
    timeline.lowBand,
    timeline.fps,
  );

  return appliedMain && appliedLeft && appliedRight;
}

async function refreshAbsoluteLookaheadTimeline() {
  if (!CONFIG.RUST_LOOKAHEAD_ENABLED || !CONFIG.RUST_ABSOLUTE_LOOKAHEAD_ENABLED) {
    clearLookaheadTimelineOnEngines();
    return;
  }

  const requestToken = ++lookaheadTimelineToken;
  const timeline = await audio.buildLookaheadTimeline(ui.audioEl);
  if (requestToken !== lookaheadTimelineToken) {
    return;
  }

  if (!timeline || !applyLookaheadTimelineToEngines(timeline)) {
    clearLookaheadTimelineOnEngines();
  }
}

// ─── Preset Navigation ───────────────────────────────────────────────────────
function goNextPreset() {
  markPresetTransition(performance.now());
  engine.next_preset();
  leftEngine.next_preset();
  rightEngine.next_preset();
  syncPresetUI();
  resetMashupTimer();
}

function goPrevPreset() {
  markPresetTransition(performance.now());
  engine.prev_preset();
  leftEngine.prev_preset();
  rightEngine.prev_preset();
  syncPresetUI();
  resetMashupTimer();
}

function goRandomPreset() {
  markPresetTransition(performance.now());
  const numPresets = CONFIG.PRESET_NAMES.length;
  let target = engine.current_preset_index();
  if (numPresets > 1) {
    while (target === engine.current_preset_index()) {
       target = Math.floor(Math.random() * numPresets);
    }
  }
  engine.random_preset(target);
  leftEngine.random_preset(target);
  rightEngine.random_preset(target);
  syncPresetUI();
  resetMashupTimer();
}

function setPresetByIndex(targetIdx: number) {
  const total = CONFIG.PRESET_NAMES.length;
  if (total <= 0) return;

  const safeIdx = Math.max(0, Math.min(total - 1, Math.floor(targetIdx)));
  markPresetTransition(performance.now());
  engine.random_preset(safeIdx);
  leftEngine.random_preset(safeIdx);
  rightEngine.random_preset(safeIdx);
  syncPresetUI();
  resetMashupTimer();
}

function setFpsMode(enabled: boolean) {
  showFps = enabled;
  ui.setFpsEnabled(enabled);
  persistUiState();
}

function setMashupMode(enabled: boolean) {
  mashupEnabled = enabled;
  mashupDynamicArmed = true;
  dropSyncPending = false;
  ui.updateMashupIcon(mashupEnabled);
  resetMashupTimer();
  syncPresetUI();
}

function resetMashupTimer() {
  if (mashupIntervalId !== null) window.clearInterval(mashupIntervalId);
  if (mashupEnabled && !CONFIG.MASHUP_DYNAMIC_MODE) {
    mashupIntervalId = window.setInterval(goRandomPreset, CONFIG.MASHUP_INTERVAL_MS);
  } else {
    mashupIntervalId = null;
  }
}

function syncPresetUI() {
  const idx = engine.current_preset_index();
  const baseName = CONFIG.PRESET_NAMES[idx] ?? CONFIG.PRESET_NAMES[0];
  ui.syncPresetSelection(idx);
  const dynamicAutoBadge = mashupEnabled || (
    CONFIG.MASHUP_DYNAMIC_MODE &&
    CONFIG.AUTO_PRESET_MUTATION &&
    CONFIG.MASHUP_DYNAMIC_AUTO_WITHOUT_TOGGLE
  );
  ui.syncPresetIndicator(baseName, dynamicAutoBadge, CONFIG.MASHUP_DYNAMIC_MODE);
  persistUiState();
}

function maybeMutatePreset(dynamicScore: number, transientScore: number, nowMs: number) {
  if (!CONFIG.AUTO_PRESET_MUTATION || mashupEnabled) return;
  const cooldownMs = 2200 + (1 - dynamicScore) * 3000;
  if (nowMs - lastAutoPresetAtMs < cooldownMs) return;

  const trigger = transientScore > 0.58 || (dynamicScore > 0.64 && transientScore > 0.42);
  if (!trigger) return;

  goRandomPreset();
  
  lastAutoPresetAtMs = nowMs;
}

function maybeMashupDynamic(
  score: number,
  nowMs: number,
  pulse: number,
  dynamicScore: number,
  beatPhase: number,
  bpmConfidence: number,
  scoreVolatility: number,
  dropLikelihood: number,
  analysisReadiness: number,
  bassHoldActive: boolean,
  futureTransientPeak: number,
) {
  const dynamicAutoEnabled = mashupEnabled || (CONFIG.AUTO_PRESET_MUTATION && CONFIG.MASHUP_DYNAMIC_AUTO_WITHOUT_TOGGLE);
  if (!CONFIG.MASHUP_DYNAMIC_MODE || !dynamicAutoEnabled) return;

  if (lastAutoPresetAtMs <= 0) {
    lastAutoPresetAtMs = nowMs;
  }

  if (bassHoldActive && analysisReadiness >= CONFIG.MASHUP_RUST_ANALYSIS_MIN_READINESS) {
    mashupDynamicArmed = true;
    dropSyncPending = false;
    return;
  }

  const high = CONFIG.MASHUP_DYNAMIC_SCORE_THRESHOLD;
  const adaptiveHysteresis = computeAdaptiveHysteresis(
    CONFIG.MASHUP_DYNAMIC_HYSTERESIS,
    scoreVolatility,
  );
  const low = Math.max(0.2, high - adaptiveHysteresis);

  if (CONFIG.MASHUP_DROP_SYNC_MODE) {
    const canArmDrop =
      !dropSyncPending &&
      nowMs - dropSyncLastArmAtMs >= CONFIG.MASHUP_DROP_SYNC_REARM_MS &&
      score >= CONFIG.MASHUP_DROP_SYNC_MIN_SCORE &&
      dropLikelihood >= CONFIG.MASHUP_DROP_SYNC_MIN_LIKELIHOOD &&
      futureTransientPeak >= 0.42;

    if (canArmDrop) {
      dropSyncPending = true;
      dropSyncWindowUntilMs = nowMs + CONFIG.MASHUP_TRANSITION_TARGET_MS;
      dropSyncLastArmAtMs = nowMs;
    }

    if (dropSyncPending) {
      const windowExpired = nowMs >= dropSyncWindowUntilMs;
      const beatReady =
        !CONFIG.MASHUP_DYNAMIC_BEAT_LOCK ||
        bpmConfidence < 0.18 ||
        isBeatAligned(beatPhase, bpmConfidence, pulse);
      const minDropCooldown = Math.max(900, CONFIG.MASHUP_DYNAMIC_BASE_COOLDOWN_MS * 0.45);

      if ((beatReady || windowExpired) && nowMs - lastAutoPresetAtMs >= minDropCooldown) {
        goRandomPreset();
        lastAutoPresetAtMs = nowMs;
        mashupDynamicArmed = false;
        dropSyncPending = false;
        return;
      }

      if (score < low * 0.92) {
        dropSyncPending = false;
      }
    }
  }

  const sinceLast = nowMs - lastAutoPresetAtMs;
  const idleForce = sinceLast >= CONFIG.MASHUP_DYNAMIC_IDLE_FORCE_MS;
  if (idleForce) {
    const hardForce = sinceLast >= CONFIG.MASHUP_DYNAMIC_IDLE_FORCE_MS * 1.8;
    const relaxedTrigger =
      score >= CONFIG.MASHUP_DYNAMIC_IDLE_MIN_SCORE ||
      pulse >= CONFIG.MASHUP_DYNAMIC_IDLE_MIN_PULSE ||
      futureTransientPeak >= 0.56;

    const relaxedBeatLock =
      !CONFIG.MASHUP_DYNAMIC_BEAT_LOCK ||
      bpmConfidence < 0.18 ||
      isBeatAligned(beatPhase, bpmConfidence, pulse);

    if ((relaxedTrigger && relaxedBeatLock) || hardForce) {
      goRandomPreset();
      lastAutoPresetAtMs = nowMs;
      mashupDynamicArmed = false;
      dropSyncPending = false;
      return;
    }
  }

  if (score < low) {
    mashupDynamicArmed = true;
    dropSyncPending = false;
    return;
  }

  if (!mashupDynamicArmed || score < high) return;

  const cooldownMs = computeDynamicCooldownMs(
    CONFIG.MASHUP_DYNAMIC_BASE_COOLDOWN_MS,
    CONFIG.MASHUP_DYNAMIC_MAX_COOLDOWN_MS,
    dynamicScore,
    bpmConfidence,
    scoreVolatility,
  );

  if (nowMs - lastAutoPresetAtMs < cooldownMs) return;

  const beatLocked = !CONFIG.MASHUP_DYNAMIC_BEAT_LOCK || isBeatAligned(beatPhase, bpmConfidence, pulse);
  if (!beatLocked) return;

  goRandomPreset();
  lastAutoPresetAtMs = nowMs;
  mashupDynamicArmed = false;
  dropSyncPending = false;
}

function syncGeometryFromWasm(geometry: THREE.BufferGeometry, sourceEngine: DaliaEngine) {
  const ptr = sourceEngine.get_geometry_ptr();
  const len = sourceEngine.get_geometry_len();
  const memoryBuffer = wasmModule.memory.buffer;

  const currentAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const currentArray = currentAttr.array;
  const hasFloat32Array = currentArray instanceof Float32Array;

  if (
    hasFloat32Array &&
    currentArray.buffer === memoryBuffer &&
    currentArray.byteOffset === ptr &&
    currentArray.length === len
  ) {
    currentAttr.needsUpdate = true;
    return;
  }

  const nextArray = new Float32Array(memoryBuffer, ptr, len);
  const hasSameLength = hasFloat32Array && currentArray.length === len;

  if (hasSameLength) {
    currentAttr.array = nextArray;
    currentAttr.needsUpdate = true;
    return;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(nextArray, 3));
  const refreshedAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  refreshedAttr.needsUpdate = true;
}

function syncAllGeometryFromWasm() {
  syncGeometryFromWasm(sceneCtx.geometry, engine);

  if (!CONFIG.SINGLE_CORE_MODE) {
    syncGeometryFromWasm(sceneCtx.leftGeometry, leftEngine);
    syncGeometryFromWasm(sceneCtx.rightGeometry, rightEngine);
  }
}

// ─── Render Loop ──────────────────────────────────────────────────────────────
function renderLoop() {
  requestAnimationFrame(renderLoop);

  const nowMs = performance.now();
  const frameDeltaMs = nowMs - lastFrameAtMs;
  if (frameDeltaMs > 0) {
    const fpsInstant = 1000 / frameDeltaMs;
    fpsSmoothed += (fpsInstant - fpsSmoothed) * 0.12;
    if (showFps) {
      ui.updateFps(fpsSmoothed);
    }
  }
  lastFrameAtMs = nowMs;

  const { composer } = sceneCtx;

  if (!audio.isAudioConnected) {
    composer.render();
    return;
  }

  const freqData = audio.getFrequencies();
  if (!freqData) {
    composer.render();
    return;
  }

  const { dataArray, leftDataArray, rightDataArray, audioSampleRate, leftFftSize, rightFftSize } = freqData;

  // 1. WASM Process Audio
  // Calculamos la resolución del bin dependiendo de tu AudioContext
  const hzPerBin = audioSampleRate / leftFftSize;
  const hzPerBinRight = audioSampleRate / rightFftSize;

  const deltaSec = Math.max(0.001, frameDeltaMs / 1000);

  engine.process_audio(dataArray, hzPerBin, deltaSec);

  if (!CONFIG.SINGLE_CORE_MODE) {
    leftEngine.process_audio(leftDataArray, hzPerBin, deltaSec);
    rightEngine.process_audio(rightDataArray, hzPerBinRight, deltaSec);
  }

  syncAllGeometryFromWasm();

  // 2. Audio Metrics
  const bass = engine.get_bass();
  const mid = engine.get_mid();
  const treb = engine.get_treb();
  const energy = engine.get_energy();
  const subBass = engine.get_sub_bass();
  const presence = engine.get_presence();
  const air = engine.get_air();

  const rustFluxGate = engine.get_spectral_flux_gate();
  spectralFluxGate += (rustFluxGate - spectralFluxGate) * 0.28;
  const rustTransient = engine.get_transient_strength();
  const analysisReadiness = engine.get_analysis_readiness();
  const currentTrackTimeSec = Number.isFinite(ui.audioEl.currentTime)
    ? Math.max(0, ui.audioEl.currentTime)
    : 0;
  const absoluteLookaheadActive =
    CONFIG.RUST_LOOKAHEAD_ENABLED &&
    CONFIG.RUST_ABSOLUTE_LOOKAHEAD_ENABLED &&
    engine.has_lookahead_timeline();

  const under150Left = averageBand(leftDataArray, 20, 150, audioSampleRate, leftFftSize);
  const under150Right = averageBand(rightDataArray, 20, 150, audioSampleRate, rightFftSize);
  const fullLeft = averageBand(leftDataArray, 20, 12_000, audioSampleRate, leftFftSize);
  const fullRight = averageBand(rightDataArray, 20, 12_000, audioSampleRate, rightFftSize);

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
  if (momentaryLoudnessDb < loudnessFloorDb) loudnessFloorDb = momentaryLoudnessDb;
  else loudnessFloorDb += (momentaryLoudnessDb - loudnessFloorDb) * 0.002;

  const lraDb = Math.max(0, loudnessPeakDb - loudnessFloorDb);
  const plrDb = Math.max(0, loudnessPeakDb - integratedLoudnessDb);
  dynamicRangeVisual += (clamp01((lraDb - 5) / 16) - dynamicRangeVisual) * 0.08;
  plrVisual += (clamp01((plrDb - 4) / 14) - plrVisual) * 0.08;
  const loudnessVisual = clamp01((momentaryLoudnessDb + 44) / 32);
  const loudnessDrift = clamp01((shortTermLoudnessDb - integratedLoudnessDb + 8) / 16);

  energyFast += (energy - energyFast) * 0.22;
  energySlow += (energy - energySlow) * 0.035;
  const transientFromEnergy = Math.max(0, energyFast - energySlow);
  const transient = Math.max(transientFromEnergy, rustTransient * 0.92);
  transientPulse += (transient * 2.2 + subBass * 0.25 + spectralFluxGate * 0.5 - transientPulse) * 0.18;
  const pulse = Math.min(transientPulse, 1.0);

  const transientNorm = robustNormalize(transientHistory, transient, ROBUST_WINDOW_FRAMES);
  const fluxNorm = robustNormalize(fluxHistory, spectralFluxGate, ROBUST_WINDOW_FRAMES);
  const energyNorm = robustNormalize(energyHistory, energy, ROBUST_WINDOW_FRAMES);
  const spectralStability = computeSpectralStability(fluxHistory);
  const scoreVolatility = computeVolatility(dynamicScoreHistory);

  const harmonicHue = engine.get_harmonic_hue();
  const harmonicConfidence = engine.get_harmonic_confidence();
  const detectedBpm = engine.get_detected_bpm();
  const bpmConfidence = engine.get_bpm_confidence();
  const beatPhase = engine.get_beat_phase();
  const beatPulse = Math.max(0, Math.sin(beatPhase * Math.PI * 2));
  const predictedEnergy = engine.get_predicted_energy(CONFIG.MASHUP_PREDICTION_HORIZON_SEC);
  const macroPredictedEnergyRaw = engine.get_predicted_energy(CONFIG.MASHUP_MACRO_HORIZON_SEC);
  const futureEnergyMean = CONFIG.RUST_LOOKAHEAD_ENABLED
    ? (absoluteLookaheadActive
      ? engine.get_future_energy_mean_at(currentTrackTimeSec, CONFIG.MASHUP_MACRO_HORIZON_SEC)
      : engine.get_future_energy_mean(CONFIG.MASHUP_MACRO_HORIZON_SEC))
    : macroPredictedEnergyRaw;
  const macroPredictedEnergy = clamp01(macroPredictedEnergyRaw * 0.62 + futureEnergyMean * 0.38);
  const futureTransientPeak = CONFIG.RUST_LOOKAHEAD_ENABLED
    ? (absoluteLookaheadActive
      ? engine.get_future_transient_peak_at(currentTrackTimeSec, CONFIG.MASHUP_BASS_SUSTAIN_HORIZON_SEC)
      : engine.get_future_transient_peak(CONFIG.MASHUP_BASS_SUSTAIN_HORIZON_SEC))
    : transientNorm;
  const bassSustainRatio = CONFIG.RUST_LOOKAHEAD_ENABLED
    ? (absoluteLookaheadActive
      ? engine.get_future_bass_sustain_ratio_at(
        currentTrackTimeSec,
        CONFIG.MASHUP_BASS_SUSTAIN_HORIZON_SEC,
        CONFIG.MASHUP_BASS_SUSTAIN_THRESHOLD,
      )
      : engine.get_future_bass_sustain_ratio(
        CONFIG.MASHUP_BASS_SUSTAIN_HORIZON_SEC,
        CONFIG.MASHUP_BASS_SUSTAIN_THRESHOLD,
      ))
    : 0;
  const bassHoldSignal = CONFIG.RUST_LOOKAHEAD_ENABLED
    ? (absoluteLookaheadActive
      ? engine.should_hold_for_sustained_bass_at(
        currentTrackTimeSec,
        CONFIG.MASHUP_BASS_SUSTAIN_HORIZON_SEC,
        CONFIG.MASHUP_BASS_SUSTAIN_THRESHOLD,
        CONFIG.MASHUP_BASS_SUSTAIN_MIN_RATIO,
      )
      : engine.should_hold_for_sustained_bass(
        CONFIG.MASHUP_BASS_SUSTAIN_HORIZON_SEC,
        CONFIG.MASHUP_BASS_SUSTAIN_THRESHOLD,
        CONFIG.MASHUP_BASS_SUSTAIN_MIN_RATIO,
      ))
    : false;
  const readinessReady = absoluteLookaheadActive ||
    analysisReadiness >= CONFIG.MASHUP_RUST_ANALYSIS_MIN_READINESS;
  const bassHoldActive = CONFIG.RUST_LOOKAHEAD_ENABLED &&
    CONFIG.MASHUP_BASS_SUSTAIN_LOCK &&
    readinessReady &&
    bassSustainRatio >= CONFIG.MASHUP_BASS_SUSTAIN_MIN_RATIO &&
    bassHoldSignal;

  harmonicConfidenceSmooth += (harmonicConfidence - harmonicConfidenceSmooth) * 0.18;
  bpmSmooth += (detectedBpm - bpmSmooth) * 0.1;
  bpmConfidenceSmooth += (bpmConfidence - bpmConfidenceSmooth) * 0.15;
  predictedEnergyLead += (predictedEnergy - predictedEnergyLead) * 0.2;
  beatPulseSmooth += (beatPulse - beatPulseSmooth) * 0.22;

  const trend = clampSigned((predictedEnergyLead - energy) / 0.22);
  const spectralClarity = clamp01(1 - fluxNorm * 1.15);
  const dropLikelihood = computeDropLikelihood({
    energy: energyNorm,
    predictedEnergy: predictedEnergyLead,
    macroPredictedEnergy,
    transient: transientNorm,
    pulse,
    bpmConfidence: bpmConfidenceSmooth,
    scoreVolatility,
  });
  
  const time = nowMs * 0.0003;

  const dynamicMashupScore = computeDynamicMashupScore({
    transient: transientNorm,
    spectralFluxGate: fluxNorm,
    pulse,
    energy: energyNorm,
    predictedEnergy: predictedEnergyLead,
    dynamicRange: dynamicRangeVisual,
    loudnessDrift,
    beatPhase,
    bpmConfidence: bpmConfidenceSmooth,
    harmonicConfidence: harmonicConfidenceSmooth,
    trend,
    spectralClarity,
    scoreVolatility,
  });
  const dynamicScoreWithFuture = Math.max(
    dynamicMashupScore,
    clamp01(dynamicMashupScore * 0.82 + futureTransientPeak * 0.18),
  );

  pushRolling(dynamicScoreHistory, dynamicScoreWithFuture, VOLATILITY_WINDOW_FRAMES);

  if (CONFIG.MASHUP_DYNAMIC_MODE) {
    maybeMashupDynamic(
      dynamicScoreWithFuture,
      nowMs,
      pulse,
      dynamicRangeVisual,
      beatPhase,
      bpmConfidenceSmooth,
      scoreVolatility,
      dropLikelihood,
      analysisReadiness,
      bassHoldActive,
      futureTransientPeak,
    );
  } else {
    maybeMutatePreset(dynamicRangeVisual, Math.max(pulse, fluxNorm), nowMs);
  }

  const transitionBlend = clamp01(
    (presetTransitionEndsAtMs - nowMs) / CONFIG.MASHUP_TRANSITION_TARGET_MS,
  );
  const transitionSoftness = 1 - transitionBlend * 0.42;

  const presetIdx = engine.current_preset_index();
  const env = getPresetEnvironment(presetIdx, dynamicRangeVisual, Math.max(pulse, spectralFluxGate), CONFIG.ENVIRONMENT_MODE);

  const under150HzStereo = Math.max(under150Left, under150Right);
  const lowGateNormalized = robustNormalize(lowBandHistory, under150HzStereo, ROBUST_WINDOW_FRAMES);
  const lowGate = clamp01((under150HzStereo - 0.26) / 0.56);
  const glitchFrame = sceneCtx.glitchController.update(
    nowMs,
    { lowGate, transient, subBass, spectralFluxGate, pulse },
    env.glitchGain
  );
  const glitchDrive = Math.max(glitchFrame.level, glitchFrame.dutyCycle * 0.75);

  const psy = getPresetPsyMotion(presetIdx, {
    time, bass, mid, treb, subBass, pulse, transient, spectralFluxGate,
    stereoWidth: stereoWidthSmooth,
    dynamicRange: dynamicRangeVisual,
    glitch: glitchFrame.level,
  });

  // 4. Update Colors & Scene Items
  
  const adaptSpeed = Math.max(
    0.018,
    Math.min(
      0.14,
      0.02 +
        harmonicConfidenceSmooth * 0.07 +
        transient * 0.04 +
        pulse * 0.03 +
        beatPulseSmooth * 0.02,
    ) * transitionSoftness,
  );
  const hueDelta = ((harmonicHue - masterHueBase + 0.5) % 1 + 1) % 1 - 0.5;
  masterHueBase += hueDelta * adaptSpeed;
  masterHueBase += (beatPulseSmooth - 0.35) * 0.006 * bpmConfidenceSmooth;
  masterHueBase = (masterHueBase % 1.0 + 1.0) % 1.0; // clamp seguro circular

  const harmonyEmphasis = clamp01(harmonicConfidenceSmooth * 1.35);
  const dynamicSaturation = Math.max(
    0.62,
    Math.min(
      1.0,
      0.66 +
        treb * 0.18 +
        harmonyEmphasis * 0.22 +
        beatPulseSmooth * 0.06 +
        predictedEnergyLead * 0.08,
    ),
  );
  const dynamicLightness = Math.max(
    0.24,
    Math.min(
      0.56,
      0.34 +
        energy * 0.11 +
        harmonyEmphasis * 0.07 +
        macroPredictedEnergy * 0.03 -
        glitchDrive * 0.04,
    ),
  );
  
  const baseColor = new THREE.Color().setHSL(masterHueBase, dynamicSaturation, dynamicLightness);
  const harmonyHighlightColor = new THREE.Color().setHSL(masterHueBase, 1.0, 0.72);
  const accentAColor = new THREE.Color().setHSL((masterHueBase + 0.5) % 1.0, 1.0, 0.65); // Complementario directo
  const accentBColor = new THREE.Color().setHSL((masterHueBase + 0.15) % 1.0, 1.0, 0.65); // Análogo o Split Complementario
  const leftColor = new THREE.Color().setHSL((masterHueBase + 0.33) % 1.0, dynamicSaturation, dynamicLightness);
  const rightColor = new THREE.Color().setHSL((masterHueBase + 0.66) % 1.0, dynamicSaturation, dynamicLightness);

  const accentMix = clamp01(0.16 + stereoWidthSmooth * 0.34 + pulse * 0.12 + harmonyEmphasis * 0.2);

  spectralColor.lerp(baseColor, Math.max(0.24, Math.min(0.55, 0.28 + harmonyEmphasis * 0.24)));
  const whiteMix = Math.max(0.004, Math.min(0.06, (energy * 0.06 + pulse * 0.04) * (1 - harmonyEmphasis * 0.75)));
  liveColor.copy(spectralColor).lerp(WHITE_POINT, whiteMix);
  
  sceneCtx.pointsMaterial.color.lerp(liveColor, 0.22 + harmonyEmphasis * 0.3);
  sceneCtx.centerAccentMaterial.color
    .copy(accentBColor)
    .lerp(harmonyHighlightColor, 0.45 + harmonyEmphasis * 0.45)
    .lerp(accentColorB, accentMix * 0.18);
  sceneCtx.centerAccentMaterial.opacity = clamp01(0.05 + plrVisual * 0.12 + stereoWidthSmooth * 0.08);
  sceneCtx.centerAccentMaterial.size = Math.max(0.014, sceneCtx.pointsMaterial.size * (0.62 + pulse * 0.16));

  leftLiveColor.copy(spectralColor).lerp(leftColor, clamp01(0.14 + stereoWidthSmooth * 0.42 + leftEnergySmooth * 0.18));
  rightLiveColor.copy(spectralColor).lerp(rightColor, clamp01(0.14 + stereoWidthSmooth * 0.42 + rightEnergySmooth * 0.18));
  sceneCtx.leftPointsMaterial.color.lerp(leftLiveColor, 0.16);
  sceneCtx.rightPointsMaterial.color.lerp(rightLiveColor, 0.16);

  sceneCtx.leftAccentMaterial.color.copy(accentAColor).lerp(accentColorA, clamp01(0.2 + leftEnergySmooth * 0.4));
  sceneCtx.rightAccentMaterial.color.copy(accentBColor).lerp(accentColorA, clamp01(0.2 + rightEnergySmooth * 0.4));
  sceneCtx.leftAccentMaterial.opacity = clamp01(0.05 + leftEnergySmooth * 0.14 + stereoWidthSmooth * 0.08);
  sceneCtx.rightAccentMaterial.opacity = clamp01(0.05 + rightEnergySmooth * 0.14 + stereoWidthSmooth * 0.08);

  sceneCtx.textureMaterial.color.lerp(spectralColor, 0.16 + harmonyEmphasis * 0.16);
  sceneCtx.pointsMaterial.opacity = Math.max(0.26, Math.min(0.62, 0.36 + presence * 0.1 + air * 0.05 + pulse * 0.03));
  sceneCtx.leftPointsMaterial.opacity = clamp01(0.08 + leftEnergySmooth * 0.2 + stereoWidthSmooth * 0.16);
  sceneCtx.rightPointsMaterial.opacity = clamp01(0.08 + rightEnergySmooth * 0.2 + stereoWidthSmooth * 0.16);

  sceneCtx.renderer.toneMappingExposure = Math.max(0.58, Math.min(0.86, 0.62 + loudnessVisual * 0.16 + dynamicRangeVisual * 0.05 + spectralFluxGate * 0.03));

  const targetSize = 0.046 + bass * 0.1 + subBass * 0.07 + treb * 0.02 + pulse * 0.04 + psy.depthPulse * 0.03;
  sceneCtx.pointsMaterial.size += (targetSize - sceneCtx.pointsMaterial.size) * 0.12;
  const coreScaleTarget = 1.6 + energy * 0.52 + pulse * 0.3 + psy.coreScaleBias;
  sceneCtx.points.scale.setScalar(sceneCtx.points.scale.x + (coreScaleTarget - sceneCtx.points.scale.x) * 0.08);
  sceneCtx.centerAccentPoints.scale.setScalar(sceneCtx.points.scale.x * (1.02 + psy.depthPulse * 0.03));

  const panShift = CONFIG.SINGLE_CORE_MODE ? psy.lateralDrift * 0.35 : (stereoBalanceSmooth - 0.5) * 1.2 + psy.lateralDrift;
  sceneCtx.points.position.x = panShift * 0.24;
  sceneCtx.leftPoints.position.x = CONFIG.SINGLE_CORE_MODE ? sceneCtx.points.position.x : (-2.35 + panShift * 0.45);
  sceneCtx.rightPoints.position.x = CONFIG.SINGLE_CORE_MODE ? sceneCtx.points.position.x : (2.35 + panShift * 0.45);

  sceneCtx.leftPointsMaterial.size = Math.max(0.01, sceneCtx.pointsMaterial.size * (0.74 + leftEnergySmooth * 0.34 + stereoWidthSmooth * 0.14));
  sceneCtx.rightPointsMaterial.size = Math.max(0.01, sceneCtx.pointsMaterial.size * (0.74 + rightEnergySmooth * 0.34 + stereoWidthSmooth * 0.14));
  sceneCtx.leftAccentPoints.position.x = sceneCtx.leftPoints.position.x;
  sceneCtx.rightAccentPoints.position.x = sceneCtx.rightPoints.position.x;
  sceneCtx.centerAccentPoints.position.x = sceneCtx.points.position.x;

  sceneCtx.texturePoints.rotation.y += 0.0002 + air * 0.001 + pulse * 0.0005 + psy.parallax * 0.0007;
  sceneCtx.texturePoints.rotation.x = Math.sin(time * 0.22) * 0.18 + psy.coreLift * 0.05;
  sceneCtx.texturePoints.position.z += ((-1.2 - energy * 2.6) - sceneCtx.texturePoints.position.z) * 0.05;
  sceneCtx.textureMaterial.opacity = Math.max(0.04, Math.min(0.32, env.textureOpacity));
  sceneCtx.textureMaterial.size = Math.max(0.01, Math.min(0.06, env.textureSize));
  
  if (sceneCtx.scene.fog instanceof THREE.FogExp2) {
    sceneCtx.scene.fog.color.setHex(env.fogColor);
    sceneCtx.scene.fog.density = Math.max(0.008, Math.min(0.06, env.fogDensity));
  }

  sceneCtx.noisePoints.rotation.y += 0.00008 + air * 0.00045 + psy.parallax * 0.00045;
  sceneCtx.noisePoints.rotation.x = Math.sin(time * 0.12) * 0.08 + psy.coreLift * 0.03;
  sceneCtx.noiseMaterial.opacity = Math.max(0.04, Math.min(0.26, env.noiseOpacity));
  sceneCtx.noiseMaterial.size = Math.max(0.006, Math.min(0.03, env.noiseSize));
  sceneCtx.noiseMaterial.color.copy(spectralColor).lerp(WHITE_POINT, Math.max(0.01, 0.06 * (1 - harmonyEmphasis * 0.6)));

  const tunnelAttr = sceneCtx.tunnelGeometry.getAttribute('position') as THREE.BufferAttribute;
  const tunnelCount = tunnelAttr.count;
  const tunnelSpeed = (0.24 + energy * 1.05 + subBass * 0.72 + pulse * 0.6 + feedbackWarp * 0.5) * psy.tunnelSpeedGain;
  for (let i = 0; i < tunnelCount; i++) {
    const i3 = i * 3;
    sceneCtx.tunnelPositions[i3 + 2] += tunnelSpeed;
    if (sceneCtx.tunnelPositions[i3 + 2] > 8) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.2 + Math.pow(Math.random(), 0.62) * 9.5;
      sceneCtx.tunnelPositions[i3] = Math.cos(angle) * radius;
      sceneCtx.tunnelPositions[i3 + 1] = Math.sin(angle) * radius * 0.72;
      sceneCtx.tunnelPositions[i3 + 2] = -150 - Math.random() * 20;
    }
  }
  tunnelAttr.needsUpdate = true;
  sceneCtx.tunnelPoints.rotation.z += (env.tunnelSpin + feedbackWarp * 0.013 + spectralFluxGate * 0.008) * psy.tunnelSpinGain;
  sceneCtx.tunnelPoints.rotation.x = Math.sin(time * (0.16 + env.tunnelWarp * psy.tunnelWarpGain)) * (0.05 + env.tunnelWarp * 0.08 * psy.tunnelWarpGain) + (stereoBalanceSmooth - 0.5) * 0.07 + psy.coreLift * 0.06;
  sceneCtx.tunnelPoints.position.x = psy.lateralDrift * 0.35;
  sceneCtx.tunnelPoints.position.y = psy.coreLift * 0.24;
  sceneCtx.tunnelMaterial.opacity = clamp01(0.07 + energy * 0.18 + spectralFluxGate * 0.24 + dynamicRangeVisual * 0.08 + psy.depthPulse * 0.06);
  sceneCtx.tunnelMaterial.size = Math.max(0.013, Math.min(0.052, 0.02 + pulse * 0.014 + feedbackWarp * 0.012 + psy.depthPulse * 0.006));
  sceneCtx.tunnelMaterial.color.copy(spectralColor).lerp(accentColorA, env.tunnelHueMix);

  if (CONFIG.SHOW_SPARK_RING) {
    const sparkGate = clamp01((under150HzStereo - 0.24) / 0.36);
    sceneCtx.sparkRingPoints.scale.setScalar(Math.max(0.2, 0.8 + sparkGate * 2.4 + pulse * 0.7));
    sceneCtx.sparkRingMaterial.opacity = clamp01(0.02 + sparkGate * 0.18 + transient * 0.08);
    sceneCtx.sparkRingMaterial.size = Math.max(0.018, Math.min(0.052, 0.022 + sparkGate * 0.03 + pulse * 0.01));
    sceneCtx.sparkRingMaterial.color.copy(spectralColor).lerp(accentColorA, 0.35 + sparkGate * 0.2);
  }

  if (CONFIG.SHOW_WAVEFORM) {
    const waveAttr = sceneCtx.waveformGeometry.getAttribute('position') as THREE.BufferAttribute;
    const waveCount = waveAttr.count;
    const binStep = Math.max(1, Math.floor(dataArray.length / waveCount));
    const waveAmp = 0.35 + energy * 0.85 + spectralFluxGate * 1.0;
    for (let i = 0; i < waveCount; i++) {
      const i3 = i * 3;
      const x = ((i / (waveCount - 1)) - 0.5) * 6.8;
      const sample = dataArray[Math.min(dataArray.length - 1, i * binStep)] / 255;
      const y = (sample - 0.5) * waveAmp * 2.4;
      sceneCtx.waveformPositions[i3] = x;
      sceneCtx.waveformPositions[i3 + 1] = y;
      sceneCtx.waveformPositions[i3 + 2] = Math.sin((i * 0.11) + time * 1.8) * (0.08 + feedbackWarp * 0.16);
    }
    waveAttr.needsUpdate = true;
    sceneCtx.waveformMaterial.opacity = clamp01(0.05 + energy * 0.22 + spectralFluxGate * 0.42);
    sceneCtx.waveformMaterial.color.copy(spectralColor).lerp(WHITE_POINT, 0.18 + spectralFluxGate * 0.2);
    sceneCtx.waveformLine.position.y = -1.38 + subBass * 0.32 + pulse * 0.16;
    sceneCtx.waveformLine.rotation.y = (stereoBalanceSmooth - 0.5) * 0.25;
  }

  const warpTarget = clamp01((mid * 0.55 + presence * 0.45 + spectralFluxGate * 0.65 + stereoWidthSmooth * 0.45) * psy.warpGain);
  feedbackWarp += (warpTarget - feedbackWarp) * (0.09 + psy.depthPulse * 0.05);
  const warpX = Math.sin(time * (0.9 + feedbackWarp * 0.8 + psy.coreTwist * 0.12)) * feedbackWarp;
  const warpY = Math.cos(time * (0.7 + feedbackWarp * 0.6 + psy.coreTwist * 0.09)) * feedbackWarp;
  sceneCtx.texturePoints.position.x = warpX * 1.8 + psy.lateralDrift * 0.3;
  sceneCtx.texturePoints.position.y = warpY * 1.3 + psy.coreLift * 0.22;
  sceneCtx.noisePoints.position.x = -warpX * 0.9;
  sceneCtx.noisePoints.position.z = -0.2 + warpY * 2.1 + psy.lookDepth * 0.08;

  const baseBloom = 0.15 + (env.bloomBoost * 0.5);
  const reactiveBloom = (subBass * 0.15) + (pulse * 0.12) + (energy * 0.08) + (glitchDrive * 0.05);
  const targetBloom = Math.max(0.1, Math.min(0.5, (baseBloom + reactiveBloom) * transitionSoftness));

  sceneCtx.bloomPass.strength += (targetBloom - sceneCtx.bloomPass.strength) * 0.08;
  sceneCtx.bloomPass.radius += (0.15 + (treb * 0.05) - sceneCtx.bloomPass.radius) * 0.05;
  sceneCtx.bloomPass.threshold = 0.25;

  const camShake = Math.min(0.07, (glitchDrive * 0.014 + transient * 0.012 + plrVisual * 0.01 + psy.depthPulse * 0.012) * transitionSoftness);
  const jitterX = (Math.random() - 0.5) * camShake;
  const jitterY = (Math.random() - 0.5) * camShake * 0.6;
  const jitterZ = (Math.random() - 0.5) * camShake;

  if (CONFIG.WORMHOLE_MODE) {
    camOrbitAngle += 0.0006 + mid * 0.0012 + pulse * 0.0008 + psy.orbitBoost;
    camZoomTarget = 2.4 - subBass * 0.34 - pulse * 0.2 - dynamicRangeVisual * 0.14 + psy.zoomBias;
    camZoomBase += (camZoomTarget - camZoomBase) * 0.08;

    const driftX = Math.sin(time * 0.55 + camOrbitAngle) * 0.34 + psy.lateralDrift * 0.45;
    const driftY = Math.cos(time * 0.37 + camOrbitAngle * 0.7) * 0.24 + psy.coreLift * 0.22;

    sceneCtx.camera.position.set(driftX + jitterX, driftY + jitterY, camZoomBase + jitterZ);
    sceneCtx.camera.lookAt(psy.lateralDrift * 0.22, psy.coreLift * 0.16, -22 + psy.lookDepth);
    sceneCtx.camera.rotation.z = psy.roll;

    sceneCtx.points.position.z = -16 + pulse * 1.8 + psy.lookDepth * 0.28;
    sceneCtx.centerAccentPoints.position.z = sceneCtx.points.position.z;
  } else {
    camOrbitAngle += 0.0016 + mid * 0.0028 + pulse * 0.0012 + psy.orbitBoost * 1.6;
    camZoomTarget = 8.28 - subBass * 0.86 - bass * 0.56 - pulse * 0.34 - dynamicRangeVisual * 0.22 - plrVisual * 0.16 + stereoWidthSmooth * 0.12 + psy.zoomBias * 1.8;
    camZoomBase += (camZoomTarget - camZoomBase) * 0.05;

    const camX = Math.sin(camOrbitAngle) * (camZoomBase + Math.cos(time * 0.7) * 0.5) + psy.lateralDrift * 0.55;
    const camZ = Math.cos(camOrbitAngle) * (camZoomBase + Math.sin(time * 0.5) * 0.5);
    const camY = Math.sin(time * 0.4) * (0.9 + loudnessDrift * 0.12) + 0.9 + pulse * 0.1 + psy.coreLift * 0.3;

    sceneCtx.camera.position.set(camX + jitterX, camY + jitterY, camZ + jitterZ);
    sceneCtx.camera.lookAt(psy.lateralDrift * 0.35, psy.coreLift * 0.25, psy.lookDepth * 0.2);
    sceneCtx.camera.rotation.z = psy.roll * 0.75;
  }

  sceneCtx.points.rotation.y += 0.00035 + bass * 0.0018 + pulse * 0.0012 + psy.coreTwist * 0.0016;
  sceneCtx.points.rotation.x  = Math.sin(time * 0.3) * 0.07 + presence * 0.03 + pulse * 0.02 + psy.coreLift * 0.05;
  sceneCtx.points.rotation.z  = Math.sin(time * 0.6) * feedbackWarp * 0.3 + psy.roll * 0.6;
  sceneCtx.centerAccentPoints.rotation.y = sceneCtx.points.rotation.y * 1.03;
  sceneCtx.centerAccentPoints.rotation.x = sceneCtx.points.rotation.x * 1.08;
  sceneCtx.leftPoints.rotation.y = sceneCtx.points.rotation.y * 0.9 - stereoWidthSmooth * 0.36;
  sceneCtx.rightPoints.rotation.y = sceneCtx.points.rotation.y * 0.9 + stereoWidthSmooth * 0.36;
  sceneCtx.leftPoints.rotation.x = sceneCtx.points.rotation.x * 0.85 + (leftEnergySmooth - rightEnergySmooth) * 0.2;
  sceneCtx.rightPoints.rotation.x = sceneCtx.points.rotation.x * 0.85 + (rightEnergySmooth - leftEnergySmooth) * 0.2;
  sceneCtx.leftAccentPoints.rotation.y = sceneCtx.leftPoints.rotation.y * 1.08;
  sceneCtx.rightAccentPoints.rotation.y = sceneCtx.rightPoints.rotation.y * 1.08;
  sceneCtx.leftAccentPoints.rotation.x = sceneCtx.leftPoints.rotation.x * 1.12;
  sceneCtx.rightAccentPoints.rotation.x = sceneCtx.rightPoints.rotation.x * 1.12;
  sceneCtx.leftPoints.rotation.z = -feedbackWarp * 0.24 - psy.coreTwist * 0.02;
  sceneCtx.rightPoints.rotation.z = feedbackWarp * 0.24 + psy.coreTwist * 0.02;

  const isHeavyPreset = presetIdx > 7;
  const isInfernalBass = under150HzStereo > 0.48; // Disparo desde frecuencias infernales
  const hasBassTrigger = under150HzStereo > 0.20; // Condicionante base pedido por usuario
  const harmonyGate = 1 - clampDynamics(harmonyEmphasis * 0.55);
  
  // Condición exigida: El Glitch se corta de cuajo (abruptamente) si no hay bajos presentes
  sceneCtx.glitchPass.enabled =
    glitchFrame.enabled && isHeavyPreset && hasBassTrigger && glitchFrame.level * harmonyGate * transitionSoftness > 0.12;
  sceneCtx.glitchPass.goWild =
    glitchFrame.goWild && isHeavyPreset && hasBassTrigger && harmonyEmphasis < 0.62 && transitionBlend < 0.85;
  
  // Aberracion cromatica subordinada a la confianza armonica.
  const aberrationAmount = computeAberrationAmount({
    lowGate: under150HzStereo,
    lowGateNormalized,
    harmonyConfidence: harmonicConfidenceSmooth,
    hasBassTrigger: isInfernalBass,
    beatPulse: beatPulseSmooth,
    spectralStability,
    chromaAutocorrelation: harmonicConfidenceSmooth,
  }) * transitionSoftness;
  // Smoothing lineal de la aberración para que baje como si fuera fluida
  sceneCtx.rgbShiftPass.uniforms['amount'].value += (aberrationAmount - sceneCtx.rgbShiftPass.uniforms['amount'].value) * 0.2;
  sceneCtx.rgbShiftPass.uniforms['angle'].value = time * (1.6 + bpmSmooth / 180) + subBass * Math.PI;
  
  const jitter = isHeavyPreset ? glitchFrame.jitter : 0.0;
  sceneCtx.points.position.x = panShift * 0.24 + psy.lateralDrift * 0.32 + (Math.random() - 0.5) * jitter;
  sceneCtx.points.position.y = psy.coreLift * 0.16 + (Math.random() - 0.5) * jitter * 0.6;

  composer.render();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
  wasmModule = await init();
  engine = new DaliaEngine();
  leftEngine = new DaliaEngine();
  rightEngine = new DaliaEngine();

  sceneCtx = setupWebGL(ui.canvas, engine, leftEngine, rightEngine, wasmModule);

  ui.initPlayer(() => {
    audio.connect(ui.audioEl, () => {
      if (audio.audioCtx && audio.audioCtx.state === 'suspended') {
        audio.audioCtx.resume();
      }
      void refreshAbsoluteLookaheadTimeline();
    });
  });

  ui.audioEl.addEventListener('loadedmetadata', () => {
    void refreshAbsoluteLookaheadTimeline();
  });
  ui.audioEl.addEventListener('emptied', () => {
    lookaheadTimelineToken += 1;
    clearLookaheadTimelineOnEngines();
  });
  ui.audioEl.addEventListener('error', () => {
    lookaheadTimelineToken += 1;
    clearLookaheadTimelineOnEngines();
  });
  
  ui.initTrackPicker(CONFIG.DEFAULT_TRACK_NAME);
  void refreshAbsoluteLookaheadTimeline();

  window.addEventListener('keydown', (event) => {
    const isHardReloadKey = event.ctrlKey && event.shiftKey && (event.key === 'R' || event.key === 'r');
    if (isHardReloadKey) {
      clearPersistedUiState();
    }
  });

  window.addEventListener('resize', () => {
    if (!sceneCtx.camera || !sceneCtx.renderer) return;
    sceneCtx.camera.aspect = window.innerWidth / window.innerHeight;
    sceneCtx.camera.updateProjectionMatrix();
    sceneCtx.renderer.setSize(window.innerWidth, window.innerHeight);
    sceneCtx.composer.setSize(window.innerWidth, window.innerHeight);
    sceneCtx.bloomPass.setSize(window.innerWidth / 2, window.innerHeight / 2);
  });

  ui.recordBtn.addEventListener('click', () => {
    recorder.toggleQuickRecording(
      ui.canvas,
      audio.audioDestination,
      ui.recordBtn,
    );
  });

  ui.insertPresetControls(goPrevPreset, goNextPreset, {
    presetNames: CONFIG.PRESET_NAMES,
    mashupEnabled,
    mashupAutoRunsWithoutToggle:
      CONFIG.MASHUP_DYNAMIC_MODE &&
      CONFIG.AUTO_PRESET_MUTATION &&
      CONFIG.MASHUP_DYNAMIC_AUTO_WITHOUT_TOGGLE,
    fpsEnabled: showFps,
    onToggleMashup: setMashupMode,
    onApplyPreset: setPresetByIndex,
    onToggleFps: setFpsMode,
  });

  const restoredState = applyPersistedUiState();
  if (!restoredState) {
    try { syncPresetUI(); } catch (_) {}
  }

  renderLoop();
}

main().catch(console.error);
