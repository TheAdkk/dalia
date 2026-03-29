import { describe, expect, it } from 'vitest';
import { getPresetEnvironment } from './presetEnvironment';

const NUMERIC_KEYS = [
  'fogDensity',
  'textureOpacity',
  'textureSize',
  'noiseOpacity',
  'noiseSize',
  'tunnelSpin',
  'tunnelWarp',
  'tunnelHueMix',
  'bloomBoost',
  'glitchGain',
] as const;

type NumericEnvironmentKey = typeof NUMERIC_KEYS[number];

function colorToNormalizedRgb(color: number): [number, number, number] {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return [r, g, b];
}

function environmentDistance(a: ReturnType<typeof getPresetEnvironment>, b: ReturnType<typeof getPresetEnvironment>): number {
  let sum = 0;

  for (const key of NUMERIC_KEYS) {
    const delta = a[key] - b[key];
    sum += delta * delta;
  }

  const [ar, ag, ab] = colorToNormalizedRgb(a.fogColor);
  const [br, bg, bb] = colorToNormalizedRgb(b.fogColor);
  sum += (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2;

  return Math.sqrt(sum);
}

describe('getPresetEnvironment', () => {
  it('returns deterministic disabled baseline', () => {
    const env = getPresetEnvironment(7, 0.9, 0.8, false);
    expect(env).toStrictEqual({
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
    });
  });

  it('keeps finite bounded outputs for all presets', () => {
    for (let presetIndex = 0; presetIndex < 20; presetIndex += 1) {
      const env = getPresetEnvironment(presetIndex, 0.62, 0.47, true);

      for (const key of NUMERIC_KEYS) {
        const value = env[key as NumericEnvironmentKey];
        expect(Number.isFinite(value)).toBe(true);
      }

      expect(env.fogDensity).toBeGreaterThan(0.006);
      expect(env.fogDensity).toBeLessThan(0.09);
      expect(env.glitchGain).toBeGreaterThan(0.6);
      expect(env.glitchGain).toBeLessThan(1.5);
      expect(env.tunnelHueMix).toBeGreaterThan(0.15);
      expect(env.tunnelHueMix).toBeLessThan(0.9);
    }
  });

  it('avoids repeated modulo-4 environments and preserves spacing', () => {
    const driveDynamic = 0.44;
    const driveTransient = 0.35;
    const envs = Array.from({ length: 20 }, (_, index) =>
      getPresetEnvironment(index, driveDynamic, driveTransient, true),
    );

    for (let i = 0; i < 16; i += 1) {
      expect(envs[i]).not.toStrictEqual(envs[i + 4]);
    }

    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < envs.length; i += 1) {
      for (let j = i + 1; j < envs.length; j += 1) {
        minDistance = Math.min(minDistance, environmentDistance(envs[i], envs[j]));
      }
    }

    expect(minDistance).toBeGreaterThan(0.03);
  });
});
