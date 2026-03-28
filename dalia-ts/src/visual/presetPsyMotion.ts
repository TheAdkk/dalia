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
  { breatheHz: 2.85, swingHz: 1.85, phase: 5.3, scaleBase: 0.1, scaleBeat: 0.52, scaleRush: 0.36, liftGain: 0.84, twistGain: 1.82, driftGain: 1.05, orbitGain: 1.62, zoomGain: 1.12, lookGain: 1.34, rollGain: 1.44, tunnelGain: 1.36, spinGain: 1.76, warpGain: 1.86, parallaxGain: 1.42 },
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
