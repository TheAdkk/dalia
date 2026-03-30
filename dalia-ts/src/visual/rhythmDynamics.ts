export type DynamicMashupScoreInputs = {
  transient: number;
  spectralFluxGate: number;
  pulse: number;
  energy: number;
  predictedEnergy: number;
  dynamicRange: number;
  loudnessDrift: number;
  beatPhase: number;
  bpmConfidence: number;
  harmonicConfidence?: number;
  trend?: number;
  spectralClarity?: number;
  scoreVolatility?: number;
};

export type AberrationInputs = {
  lowGate: number;
  harmonyConfidence: number;
  hasBassTrigger: boolean;
  beatPulse: number;
  lowGateNormalized?: number;
  spectralStability?: number;
  chromaAutocorrelation?: number;
};

export type DropLikelihoodInputs = {
  energy: number;
  predictedEnergy: number;
  macroPredictedEnergy: number;
  transient: number;
  pulse: number;
  bpmConfidence: number;
  scoreVolatility: number;
};

type AdaptiveWeightResult = {
  transientMultiplier: number;
  fluxMultiplier: number;
  pulseMultiplier: number;
  beatWindow: number;
  confidenceBlend: number;
};

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampSigned(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function computeAdaptiveWeights(inputs: DynamicMashupScoreInputs): AdaptiveWeightResult {
  const harmonicConfidence = clamp01(inputs.harmonicConfidence ?? 0);
  const bpmConfidence = clamp01(inputs.bpmConfidence);
  const spectralClarity = clamp01(inputs.spectralClarity ?? (1 - inputs.spectralFluxGate * 1.2));

  const confidenceBlend = clamp01(harmonicConfidence * 0.58 + bpmConfidence * 0.42);

  const transientMultiplier = 2.0 + spectralClarity * 0.55 + confidenceBlend * 0.45;
  const fluxMultiplier = 0.85 + spectralClarity * 0.35;
  const pulseMultiplier = 0.4 + bpmConfidence * 0.4;
  const beatWindow = 0.18 + bpmConfidence * 0.12;

  return {
    transientMultiplier,
    fluxMultiplier,
    pulseMultiplier,
    beatWindow,
    confidenceBlend,
  };
}

export function computeDynamicMashupScore(inputs: DynamicMashupScoreInputs): number {
  const trend = clampSigned(inputs.trend ?? 0);
  const volatility = clamp01(inputs.scoreVolatility ?? 0);
  const {
    transientMultiplier,
    fluxMultiplier,
    pulseMultiplier,
    beatWindow,
    confidenceBlend,
  } = computeAdaptiveWeights(inputs);

  const transientScore = clamp01(
    inputs.transient * transientMultiplier +
      inputs.spectralFluxGate * fluxMultiplier +
      inputs.pulse * pulseMultiplier,
  );

  const predictiveOffset = 0.08 + trend * 0.08;
  const predictiveLift = clamp01((inputs.predictedEnergy - inputs.energy + predictiveOffset) / 0.44);
  const dynamicLift = clamp01(inputs.dynamicRange * 0.85 + inputs.loudnessDrift * 0.4 + trend * 0.12);

  const beatDistance = Math.min(Math.abs(inputs.beatPhase), Math.abs(1 - inputs.beatPhase));
  const beatSupport = inputs.bpmConfidence > 0.2
    ? clamp01(1 - beatDistance / beatWindow)
    : 0.35;

  const volatilityPenalty = 1 - volatility * 0.2;
  const transientWeight = 0.5 + confidenceBlend * 0.07;
  const predictiveWeight = 0.15 + confidenceBlend * 0.04;
  const dynamicWeight = 0.19;
  const beatWeight = 1 - transientWeight - predictiveWeight - dynamicWeight;

  return clamp01(
    (
      transientScore * transientWeight +
      predictiveLift * predictiveWeight +
      dynamicLift * dynamicWeight +
      beatSupport * beatWeight
    ) * volatilityPenalty,
  );
}

export function computeDynamicCooldownMs(
  baseCooldownMs: number,
  maxCooldownMs: number,
  dynamicRange: number,
  bpmConfidence: number,
  scoreVolatility = 0,
): number {
  const span = Math.max(0, maxCooldownMs - baseCooldownMs);
  const dynamicGain = clamp01(dynamicRange);
  const bpmGain = clamp01(bpmConfidence);
  const volatility = clamp01(scoreVolatility);

  const reactivity =
    dynamicGain * 0.55 +
    bpmGain * 0.25 +
    (1 - volatility) * 0.2;

  const cooldown = maxCooldownMs - span * reactivity;
  return Math.max(baseCooldownMs, Math.min(maxCooldownMs, cooldown));
}

export function computeAdaptiveHysteresis(baseHysteresis: number, scoreVolatility: number): number {
  const volatility = clamp01(scoreVolatility / 0.2);
  const hysteresis = baseHysteresis * (0.8 + volatility * 0.5);
  return Math.max(baseHysteresis * 0.75, Math.min(baseHysteresis * 1.45, hysteresis));
}

export function isBeatAligned(beatPhase: number, bpmConfidence: number, pulse: number): boolean {
  if (bpmConfidence < 0.28) {
    return pulse > 0.62;
  }

  const beatDistance = Math.min(Math.abs(beatPhase), Math.abs(1 - beatPhase));
  return beatDistance < 0.14 || pulse > 0.78;
}

export function computeDropLikelihood(inputs: DropLikelihoodInputs): number {
  const leadLift = clamp01((inputs.predictedEnergy - inputs.energy + 0.06) / 0.5);
  const macroLift = clamp01((inputs.macroPredictedEnergy - inputs.predictedEnergy + 0.04) / 0.45);
  const rhythmicImpact = clamp01(
    inputs.transient * 0.45 +
      inputs.pulse * 0.35 +
      inputs.bpmConfidence * 0.2,
  );

  const volatilityPenalty = 1 - clamp01(inputs.scoreVolatility) * 0.22;

  return clamp01(
    (leadLift * 0.52 + macroLift * 0.2 + rhythmicImpact * 0.28) * volatilityPenalty,
  );
}

export function computeAberrationAmount(inputs: AberrationInputs): number {
  if (!inputs.hasBassTrigger) {
    return 0;
  }

  const chromaAutocorrelation = clamp01(inputs.chromaAutocorrelation ?? inputs.harmonyConfidence);
  const spectralStability = clamp01(inputs.spectralStability ?? 0.5);
  const tonalClarity = clamp01(
    inputs.harmonyConfidence * 0.6 +
      chromaAutocorrelation * 0.25 +
      spectralStability * 0.15,
  );

  const suppression = 1 - clamp01(tonalClarity * 1.15);
  const rhythmMod = 0.65 + clamp01(inputs.beatPulse) * 0.55;
  const lowGate = clamp01(inputs.lowGateNormalized ?? inputs.lowGate);
  const amount = lowGate * 0.0135 * suppression * rhythmMod;

  return Math.max(0, Math.min(0.018, amount));
}
