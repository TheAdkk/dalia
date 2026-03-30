import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveHysteresis,
  computeAberrationAmount,
  computeDynamicCooldownMs,
  computeDynamicMashupScore,
  computeDropLikelihood,
  isBeatAligned,
} from './rhythmDynamics';

describe('rhythmDynamics', () => {
  it('increases mashup score with stronger transients', () => {
    const weak = computeDynamicMashupScore({
      transient: 0.12,
      spectralFluxGate: 0.2,
      pulse: 0.18,
      energy: 0.35,
      predictedEnergy: 0.4,
      dynamicRange: 0.22,
      loudnessDrift: 0.15,
      beatPhase: 0.08,
      bpmConfidence: 0.7,
    });

    const strong = computeDynamicMashupScore({
      transient: 0.45,
      spectralFluxGate: 0.52,
      pulse: 0.6,
      energy: 0.35,
      predictedEnergy: 0.65,
      dynamicRange: 0.6,
      loudnessDrift: 0.42,
      beatPhase: 0.03,
      bpmConfidence: 0.82,
    });

    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeLessThanOrEqual(1);
  });

  it('reduces cooldown with better rhythmic confidence', () => {
    const conservative = computeDynamicCooldownMs(2200, 6800, 0.1, 0.05);
    const reactive = computeDynamicCooldownMs(2200, 6800, 0.8, 0.85);

    expect(reactive).toBeLessThan(conservative);
    expect(reactive).toBeGreaterThanOrEqual(2200);
    expect(conservative).toBeLessThanOrEqual(6800);
  });

  it('increases cooldown when score volatility is high', () => {
    const lowVolatility = computeDynamicCooldownMs(2200, 6800, 0.6, 0.8, 0.05);
    const highVolatility = computeDynamicCooldownMs(2200, 6800, 0.6, 0.8, 0.9);

    expect(highVolatility).toBeGreaterThan(lowVolatility);
  });

  it('widens hysteresis with high volatility', () => {
    const calm = computeAdaptiveHysteresis(0.12, 0.03);
    const volatile = computeAdaptiveHysteresis(0.12, 0.3);

    expect(volatile).toBeGreaterThan(calm);
    expect(calm).toBeGreaterThanOrEqual(0.09);
    expect(volatile).toBeLessThanOrEqual(0.174);
  });

  it('accepts near-beat triggers and rejects off-beat low pulse', () => {
    expect(isBeatAligned(0.04, 0.9, 0.2)).toBe(true);
    expect(isBeatAligned(0.43, 0.9, 0.3)).toBe(false);
    expect(isBeatAligned(0.43, 0.2, 0.7)).toBe(true);
  });

  it('suppresses aberration when harmony confidence is high', () => {
    const lowConfidence = computeAberrationAmount({
      lowGate: 0.82,
      harmonyConfidence: 0.1,
      hasBassTrigger: true,
      beatPulse: 0.65,
    });

    const highConfidence = computeAberrationAmount({
      lowGate: 0.82,
      harmonyConfidence: 0.9,
      hasBassTrigger: true,
      beatPulse: 0.65,
    });

    expect(highConfidence).toBeLessThan(lowConfidence);
    expect(computeAberrationAmount({
      lowGate: 1,
      harmonyConfidence: 0,
      hasBassTrigger: false,
      beatPulse: 1,
    })).toBe(0);
  });

  it('raises drop likelihood when near-term and macro predictions rise', () => {
    const flat = computeDropLikelihood({
      energy: 0.52,
      predictedEnergy: 0.53,
      macroPredictedEnergy: 0.54,
      transient: 0.22,
      pulse: 0.28,
      bpmConfidence: 0.44,
      scoreVolatility: 0.08,
    });

    const ramping = computeDropLikelihood({
      energy: 0.42,
      predictedEnergy: 0.72,
      macroPredictedEnergy: 0.86,
      transient: 0.58,
      pulse: 0.66,
      bpmConfidence: 0.78,
      scoreVolatility: 0.06,
    });

    expect(ramping).toBeGreaterThan(flat);
    expect(ramping).toBeLessThanOrEqual(1);
  });
});
