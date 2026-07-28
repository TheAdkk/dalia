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
    const wrapped = getPresetPsyMotion(27, inputs); // 27 % 26 === 1
    expect(wrapped).toStrictEqual(direct);
  });

  it('returns finite values for all presets on multiple timestamps', () => {
    const times = [0, 1.2, 3.7, 7.5];

    for (let presetIndex = 0; presetIndex < 26; presetIndex += 1) {
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

  it('hyperspace (index 21) has the highest tunnel speed gain of all presets', () => {
    const inputs = { ...BASE_INPUTS, time: 2.4 };
    const motions = Array.from({ length: 26 }, (_, i) => getPresetPsyMotion(i, inputs));
    const hyperspace = motions[21];

    for (let i = 0; i < motions.length; i += 1) {
      if (i === 21) continue;
      expect(hyperspace.tunnelSpeedGain).toBeGreaterThanOrEqual(motions[i].tunnelSpeedGain);
    }
  });

  it('mycelia (index 22) has the lowest tunnel speed gain of all presets', () => {
    const inputs = { ...BASE_INPUTS, time: 2.4 };
    const motions = Array.from({ length: 26 }, (_, i) => getPresetPsyMotion(i, inputs));
    const mycelia = motions[22];

    for (let i = 0; i < motions.length; i += 1) {
      if (i === 22) continue;
      expect(mycelia.tunnelSpeedGain).toBeLessThanOrEqual(motions[i].tunnelSpeedGain);
    }
  });

  it('k-hole (index 24) has the lowest mean tunnel spin gain across time samples', () => {
    // tunnelSpinGain has a per-time abs(twistWave) term that can spike on any preset;
    // averaging eliminates the LFO noise so the signature.spinGain ordering shows.
    const times = [0.2, 0.8, 1.5, 2.4, 3.3, 4.7, 6.1, 8.5];

    function avgSpin(presetIndex: number): number {
      let sum = 0;
      for (const time of times) {
        sum += getPresetPsyMotion(presetIndex, { ...BASE_INPUTS, time }).tunnelSpinGain;
      }
      return sum / times.length;
    }

    const kHoleAvg = avgSpin(24);
    for (let i = 0; i < 26; i += 1) {
      if (i === 24) continue;
      expect(kHoleAvg).toBeLessThanOrEqual(avgSpin(i));
    }
  });

  it('k-hole roll stays small in magnitude across multiple sample times', () => {
    const times = [0.3, 0.9, 1.7, 2.4, 3.1, 4.5, 6.2, 8.8];

    function avgAbsRoll(presetIndex: number): number {
      let sum = 0;
      for (const time of times) {
        sum += Math.abs(getPresetPsyMotion(presetIndex, { ...BASE_INPUTS, time }).roll);
      }
      return sum / times.length;
    }

    const kHoleAvg = avgAbsRoll(24);
    for (let i = 0; i < 26; i += 1) {
      if (i === 24) continue;
      expect(kHoleAvg).toBeLessThanOrEqual(avgAbsRoll(i));
    }
  });

  it('maintains perceptual spacing between preset motions', () => {
    const vectors: number[][] = [];

    for (let presetIndex = 0; presetIndex < 26; presetIndex += 1) {
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
