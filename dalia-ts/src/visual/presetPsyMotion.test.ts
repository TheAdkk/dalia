import { describe, expect, it } from 'vitest';
import { getPresetPsyMotion, type PresetPsyMotion, type PsyMotionInputs } from './presetPsyMotion';

const BASE_INPUTS: PsyMotionInputs = {
  time: 0,
  bass: 0.58,
  mid: 0.41,
  treb: 0.36,
  subBass: 0.49,
  pulse: 0.44,
  transient: 0.33,
  spectralFluxGate: 0.52,
  stereoWidth: 0.46,
  dynamicRange: 0.39,
  glitch: 0.28,
};

const MOTION_KEYS: Array<keyof PresetPsyMotion> = [
  'coreScaleBias',
  'coreLift',
  'coreTwist',
  'lateralDrift',
  'orbitBoost',
  'zoomBias',
  'lookDepth',
  'roll',
  'warpGain',
  'tunnelSpeedGain',
  'tunnelSpinGain',
  'tunnelWarpGain',
  'parallax',
  'depthPulse',
];

function toVector(motion: PresetPsyMotion): number[] {
  return MOTION_KEYS.map((key) => motion[key]);
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

describe('getPresetPsyMotion', () => {
  it('wraps preset index with modulo', () => {
    const inputs = { ...BASE_INPUTS, time: 1.4 };
    const direct = getPresetPsyMotion(1, inputs);
    const wrapped = getPresetPsyMotion(21, inputs);
    expect(wrapped).toStrictEqual(direct);
  });

  it('returns finite values for all presets on multiple timestamps', () => {
    const times = [0, 1.2, 3.7, 7.5];

    for (let presetIndex = 0; presetIndex < 20; presetIndex += 1) {
      for (const time of times) {
        const motion = getPresetPsyMotion(presetIndex, { ...BASE_INPUTS, time });

        for (const key of MOTION_KEYS) {
          const value = motion[key];
          expect(Number.isFinite(value)).toBe(true);
        }

        expect(motion.warpGain).toBeGreaterThan(0.5);
        expect(motion.tunnelSpeedGain).toBeGreaterThan(0.5);
        expect(motion.tunnelSpinGain).toBeGreaterThan(0.5);
      }
    }
  });

  it('maintains perceptual spacing between preset motions', () => {
    const vectors: number[][] = [];

    for (let presetIndex = 0; presetIndex < 20; presetIndex += 1) {
      const motion = getPresetPsyMotion(presetIndex, { ...BASE_INPUTS, time: 5.25 });
      vectors.push(toVector(motion));
    }

    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < vectors.length; i += 1) {
      for (let j = i + 1; j < vectors.length; j += 1) {
        minDistance = Math.min(minDistance, euclideanDistance(vectors[i], vectors[j]));
      }
    }

    expect(minDistance).toBeGreaterThan(0.08);
  });
});
