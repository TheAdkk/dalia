export type PsyMotionInputs = {
  time: number;
  bass: number;
  mid: number;
  treb: number;
  subBass: number;
  pulse: number;
  transient: number;
  spectralFluxGate: number;
  stereoWidth: number;
  dynamicRange: number;
  glitch: number;
};

export type PresetPsyMotion = {
  coreScaleBias: number;
  coreLift: number;
  coreTwist: number;
  lateralDrift: number;
  orbitBoost: number;
  zoomBias: number;
  lookDepth: number;
  roll: number;
  warpGain: number;
  tunnelSpeedGain: number;
  tunnelSpinGain: number;
  tunnelWarpGain: number;
  parallax: number;
  depthPulse: number;
};

type PresetSignature = {
  breatheHz: number;
  swingHz: number;
  phase: number;
  scaleBase: number;
  scaleBeat: number;
  scaleRush: number;
  liftGain: number;
  twistGain: number;
  driftGain: number;
  orbitGain: number;
  zoomGain: number;
  lookGain: number;
  rollGain: number;
  tunnelGain: number;
  spinGain: number;
  warpGain: number;
  parallaxGain: number;
};

const PRESET_SIGNATURES: PresetSignature[] = [
  // Vector Sphere
  { breatheHz: 1.5, swingHz: 0.7, phase: 0.0, scaleBase: 0.04, scaleBeat: 0.28, scaleRush: 0.08, liftGain: 0.38, twistGain: 0.62, driftGain: 0.26, orbitGain: 0.42, zoomGain: 0.42, lookGain: 0.36, rollGain: 0.48, tunnelGain: 0.5, spinGain: 0.55, warpGain: 0.75, parallaxGain: 0.62 },
  // Mutant Torus
  { breatheHz: 1.95, swingHz: 0.95, phase: 0.9, scaleBase: 0.06, scaleBeat: 0.34, scaleRush: 0.14, liftGain: 0.42, twistGain: 0.95, driftGain: 0.42, orbitGain: 0.7, zoomGain: 0.55, lookGain: 0.58, rollGain: 0.7, tunnelGain: 0.72, spinGain: 0.92, warpGain: 1.1, parallaxGain: 0.85 },
  // Lissajous Knot
  { breatheHz: 1.8, swingHz: 1.15, phase: 1.7, scaleBase: 0.05, scaleBeat: 0.31, scaleRush: 0.2, liftGain: 0.5, twistGain: 1.22, driftGain: 0.58, orbitGain: 0.96, zoomGain: 0.7, lookGain: 0.72, rollGain: 0.88, tunnelGain: 0.82, spinGain: 1.1, warpGain: 1.28, parallaxGain: 0.98 },
  // Plasma Field
  { breatheHz: 2.25, swingHz: 1.35, phase: 2.3, scaleBase: 0.08, scaleBeat: 0.38, scaleRush: 0.24, liftGain: 0.66, twistGain: 1.45, driftGain: 0.72, orbitGain: 1.18, zoomGain: 0.86, lookGain: 0.96, rollGain: 1.08, tunnelGain: 0.98, spinGain: 1.32, warpGain: 1.46, parallaxGain: 1.15 },
  // Fractal Spiral
  { breatheHz: 1.4, swingHz: 0.65, phase: 3.0, scaleBase: 0.03, scaleBeat: 0.3, scaleRush: 0.11, liftGain: 0.34, twistGain: 0.82, driftGain: 0.48, orbitGain: 0.64, zoomGain: 0.48, lookGain: 0.56, rollGain: 0.62, tunnelGain: 0.76, spinGain: 0.88, warpGain: 1.08, parallaxGain: 0.84 },
  // Hyperbolic Paraboloid
  { breatheHz: 1.7, swingHz: 0.9, phase: 3.9, scaleBase: 0.06, scaleBeat: 0.29, scaleRush: 0.18, liftGain: 0.44, twistGain: 1.02, driftGain: 0.52, orbitGain: 0.9, zoomGain: 0.64, lookGain: 0.7, rollGain: 0.8, tunnelGain: 0.9, spinGain: 1.04, warpGain: 1.22, parallaxGain: 0.96 },
  // Nebula Vortex
  { breatheHz: 2.55, swingHz: 1.55, phase: 4.6, scaleBase: 0.09, scaleBeat: 0.45, scaleRush: 0.3, liftGain: 0.74, twistGain: 1.58, driftGain: 0.86, orbitGain: 1.36, zoomGain: 0.98, lookGain: 1.12, rollGain: 1.25, tunnelGain: 1.2, spinGain: 1.54, warpGain: 1.62, parallaxGain: 1.26 },
  // Chaos Ribbon
  { breatheHz: 2.35, swingHz: 2.75, phase: 5.3, scaleBase: 0.09, scaleBeat: 0.56, scaleRush: 0.44, liftGain: 0.92, twistGain: 1.95, driftGain: 1.38, orbitGain: 1.84, zoomGain: 1.26, lookGain: 1.46, rollGain: 1.86, tunnelGain: 1.22, spinGain: 1.44, warpGain: 1.64, parallaxGain: 1.58 },
  // Quantum String
  { breatheHz: 3.85, swingHz: 1.28, phase: 5.9, scaleBase: 0.12, scaleBeat: 0.42, scaleRush: 0.5, liftGain: 0.62, twistGain: 1.28, driftGain: 0.54, orbitGain: 1.08, zoomGain: 1.42, lookGain: 1.18, rollGain: 0.78, tunnelGain: 1.86, spinGain: 2.08, warpGain: 2.24, parallaxGain: 1.12 },
  // Galactic Web
  { breatheHz: 1.35, swingHz: 0.55, phase: 6.5, scaleBase: 0.04, scaleBeat: 0.26, scaleRush: 0.09, liftGain: 0.3, twistGain: 0.68, driftGain: 0.22, orbitGain: 0.48, zoomGain: 0.4, lookGain: 0.44, rollGain: 0.4, tunnelGain: 0.62, spinGain: 0.66, warpGain: 0.88, parallaxGain: 0.74 },
  // Voxel Grid
  { breatheHz: 1.95, swingHz: 0.46, phase: 7.1, scaleBase: 0.045, scaleBeat: 0.27, scaleRush: 0.1, liftGain: 0.32, twistGain: 0.66, driftGain: 0.14, orbitGain: 0.42, zoomGain: 0.36, lookGain: 0.52, rollGain: 0.34, tunnelGain: 0.92, spinGain: 0.58, warpGain: 0.86, parallaxGain: 0.72 },
  // Morphing Cube
  { breatheHz: 0.95, swingHz: 0.42, phase: 7.7, scaleBase: 0.02, scaleBeat: 0.24, scaleRush: 0.06, liftGain: 0.24, twistGain: 0.56, driftGain: 0.16, orbitGain: 0.34, zoomGain: 0.28, lookGain: 0.4, rollGain: 0.26, tunnelGain: 0.52, spinGain: 0.44, warpGain: 0.62, parallaxGain: 0.58 },
  // Heart Pulse
  { breatheHz: 1.28, swingHz: 2.6, phase: 8.2, scaleBase: 0.1, scaleBeat: 0.62, scaleRush: 0.12, liftGain: 0.88, twistGain: 0.42, driftGain: 0.12, orbitGain: 0.28, zoomGain: 0.74, lookGain: 0.7, rollGain: 0.22, tunnelGain: 0.42, spinGain: 0.36, warpGain: 0.58, parallaxGain: 0.64 },
  // Black Hole Singularity
  { breatheHz: 1.92, swingHz: 0.64, phase: 8.9, scaleBase: 0.07, scaleBeat: 0.34, scaleRush: 0.3, liftGain: 0.52, twistGain: 1.08, driftGain: 0.34, orbitGain: 0.92, zoomGain: 0.96, lookGain: 1.44, rollGain: 0.54, tunnelGain: 1.64, spinGain: 1.2, warpGain: 2.22, parallaxGain: 0.94 },
  // Tesseract Fold
  { breatheHz: 2.62, swingHz: 1.86, phase: 9.5, scaleBase: 0.1, scaleBeat: 0.4, scaleRush: 0.36, liftGain: 0.72, twistGain: 2.12, driftGain: 0.66, orbitGain: 1.42, zoomGain: 0.86, lookGain: 1.08, rollGain: 1.48, tunnelGain: 1.18, spinGain: 2.04, warpGain: 1.54, parallaxGain: 1.28 },
  // Hyperspace Jump
  { breatheHz: 3.15, swingHz: 2.1, phase: 10.1, scaleBase: 0.12, scaleBeat: 0.54, scaleRush: 0.4, liftGain: 0.88, twistGain: 2.04, driftGain: 1.18, orbitGain: 1.88, zoomGain: 1.24, lookGain: 1.46, rollGain: 1.58, tunnelGain: 1.62, spinGain: 1.98, warpGain: 2.06, parallaxGain: 1.46 },
  // Wormhole Bridge
  { breatheHz: 2.18, swingHz: 1.22, phase: 10.7, scaleBase: 0.09, scaleBeat: 0.4, scaleRush: 0.26, liftGain: 0.62, twistGain: 1.26, driftGain: 0.48, orbitGain: 0.96, zoomGain: 0.9, lookGain: 0.98, rollGain: 0.72, tunnelGain: 2.28, spinGain: 2.26, warpGain: 1.96, parallaxGain: 1.44 },
  // Supernova Remnant
  { breatheHz: 3.28, swingHz: 2.46, phase: 11.3, scaleBase: 0.14, scaleBeat: 0.62, scaleRush: 0.46, liftGain: 1.12, twistGain: 1.52, driftGain: 1.18, orbitGain: 2.18, zoomGain: 1.36, lookGain: 1.34, rollGain: 1.02, tunnelGain: 1.08, spinGain: 1.22, warpGain: 1.62, parallaxGain: 1.68 },
  // Andromeda Spiral
  { breatheHz: 1.75, swingHz: 0.98, phase: 12.0, scaleBase: 0.06, scaleBeat: 0.31, scaleRush: 0.2, liftGain: 0.46, twistGain: 1.08, driftGain: 0.54, orbitGain: 1.02, zoomGain: 0.7, lookGain: 0.84, rollGain: 0.88, tunnelGain: 0.96, spinGain: 1.1, warpGain: 1.26, parallaxGain: 1.02 },
  // Gamma-Ray Pulsar
  { breatheHz: 3.35, swingHz: 2.35, phase: 12.6, scaleBase: 0.13, scaleBeat: 0.58, scaleRush: 0.42, liftGain: 0.92, twistGain: 2.18, driftGain: 1.06, orbitGain: 1.94, zoomGain: 1.26, lookGain: 1.52, rollGain: 1.66, tunnelGain: 1.72, spinGain: 2.12, warpGain: 2.18, parallaxGain: 1.48 },
  // Peyote — slow radial breath, big scale-on-beat, low drift (kaleidoscope stays centered)
  { breatheHz: 1.15, swingHz: 0.55, phase: 13.2, scaleBase: 0.10, scaleBeat: 0.62, scaleRush: 0.16, liftGain: 0.32, twistGain: 1.12, driftGain: 0.14, orbitGain: 0.46, zoomGain: 0.78, lookGain: 0.62, rollGain: 0.62, tunnelGain: 0.42, spinGain: 0.92, warpGain: 1.08, parallaxGain: 0.86 },
  // Hyperspace (DMT) — extreme tunnel speed/spin, deep zoom
  { breatheHz: 2.95, swingHz: 1.85, phase: 13.8, scaleBase: 0.11, scaleBeat: 0.5, scaleRush: 0.46, liftGain: 0.66, twistGain: 1.78, driftGain: 0.72, orbitGain: 1.42, zoomGain: 1.58, lookGain: 1.68, rollGain: 1.22, tunnelGain: 2.48, spinGain: 2.32, warpGain: 2.34, parallaxGain: 1.62 },
  // Mycelia (psilocybin) — slow, soft, near-zero rotation, gentle breath
  { breatheHz: 0.72, swingHz: 0.34, phase: 14.4, scaleBase: 0.04, scaleBeat: 0.22, scaleRush: 0.06, liftGain: 0.22, twistGain: 0.36, driftGain: 0.42, orbitGain: 0.24, zoomGain: 0.28, lookGain: 0.42, rollGain: 0.18, tunnelGain: 0.36, spinGain: 0.28, warpGain: 0.62, parallaxGain: 0.74 },
  // Recursion (LSD) — deep breathing zoom, mid drift, recursive feel
  { breatheHz: 1.85, swingHz: 1.02, phase: 15.0, scaleBase: 0.08, scaleBeat: 0.4, scaleRush: 0.32, liftGain: 0.48, twistGain: 1.32, driftGain: 0.62, orbitGain: 0.94, zoomGain: 1.22, lookGain: 1.06, rollGain: 0.92, tunnelGain: 1.16, spinGain: 1.42, warpGain: 1.86, parallaxGain: 1.18 },
  // K-Hole (ketamine) — near-zero rotation, sub-bass-driven inward zoom only
  { breatheHz: 0.42, swingHz: 0.18, phase: 15.6, scaleBase: 0.02, scaleBeat: 0.12, scaleRush: 0.04, liftGain: 0.08, twistGain: 0.14, driftGain: 0.08, orbitGain: 0.08, zoomGain: 1.84, lookGain: 1.92, rollGain: 0.08, tunnelGain: 1.62, spinGain: 0.12, warpGain: 0.32, parallaxGain: 0.46 },
  // Erdős Lattice — slow stately turn to read the graph, bass-locked breath, no tunnel
  { breatheHz: 0.85, swingHz: 0.4, phase: 16.2, scaleBase: 0.05, scaleBeat: 0.3, scaleRush: 0.12, liftGain: 0.3, twistGain: 0.5, driftGain: 0.2, orbitGain: 0.66, zoomGain: 0.5, lookGain: 0.5, rollGain: 0.3, tunnelGain: 0.4, spinGain: 0.6, warpGain: 0.6, parallaxGain: 0.7 },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lfo(time: number, speed: number, phase: number): number {
  return Math.sin(time * speed + phase);
}

export function getPresetPsyMotion(presetIndex: number, inputs: PsyMotionInputs): PresetPsyMotion {
  const signature = PRESET_SIGNATURES[presetIndex % PRESET_SIGNATURES.length];

  const beat = clamp01(inputs.pulse * 0.74 + inputs.subBass * 0.32 + inputs.transient * 0.26);
  const rush = clamp01(inputs.spectralFluxGate * 0.72 + inputs.glitch * 0.48 + inputs.treb * 0.28);
  const trance = clamp01(inputs.dynamicRange * 0.55 + inputs.stereoWidth * 0.45 + inputs.mid * 0.2);

  const breathe = lfo(inputs.time, signature.breatheHz, signature.phase);
  const swing = lfo(inputs.time, signature.swingHz, signature.phase * 1.7);
  const twistWave = lfo(inputs.time, signature.swingHz * 1.35, signature.phase * 2.1);

  const coreScaleBias =
    signature.scaleBase +
    beat * signature.scaleBeat +
    rush * signature.scaleRush +
    Math.abs(breathe) * 0.08;

  const coreLift = swing * (0.18 + signature.liftGain * (0.42 + trance * 0.58));
  const coreTwist = twistWave * (0.28 + beat * 0.9) * signature.twistGain;
  const lateralDrift =
    lfo(inputs.time, signature.swingHz * 0.82, signature.phase * 0.9) *
    (0.1 + signature.driftGain * (0.34 + trance * 0.5));

  const orbitBoost = Math.abs(twistWave) * (0.00024 + beat * 0.0014) * signature.orbitGain;
  const zoomBias =
    -Math.abs(breathe) * (0.05 + beat * 0.32) * signature.zoomGain +
    rush * 0.08 * signature.zoomGain;

  const lookDepth =
    -2.4 * signature.lookGain * (0.25 + trance * 0.75) +
    lfo(inputs.time, signature.breatheHz * 0.7, signature.phase * 0.6) * 0.55;

  const roll = swing * (0.012 + rush * 0.09) * signature.rollGain;

  const warpGain =
    0.82 +
    signature.warpGain * (0.14 + trance * 0.32) +
    rush * 0.25;

  const tunnelSpeedGain =
    0.9 +
    signature.tunnelGain * (0.08 + beat * 0.52) +
    trance * 0.18;

  const tunnelSpinGain =
    0.9 +
    signature.spinGain * (0.1 + rush * 0.68) +
    Math.abs(twistWave) * 0.15;

  const tunnelWarpGain =
    0.86 +
    signature.warpGain * (0.08 + trance * 0.3) +
    beat * 0.1;

  const parallax =
    0.66 +
    signature.parallaxGain * (0.1 + trance * 0.52) +
    rush * 0.12;

  const depthPulse = Math.abs(breathe) * (0.4 + beat * 0.8 + rush * 0.35);

  return {
    coreScaleBias,
    coreLift,
    coreTwist,
    lateralDrift,
    orbitBoost,
    zoomBias,
    lookDepth,
    roll,
    warpGain,
    tunnelSpeedGain,
    tunnelSpinGain,
    tunnelWarpGain,
    parallax,
    depthPulse,
  };
}
