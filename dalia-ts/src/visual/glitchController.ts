export type GlitchInputs = {
  lowGate: number;
  transient: number;
  subBass: number;
  spectralFluxGate: number;
  pulse: number;
};

export type GlitchFrame = {
  level: number;
  enabled: boolean;
  goWild: boolean;
  jitter: number;
  dutyCycle: number;
};

export type GlitchProfile = 'mellow' | 'aggressive' | 'feral';

type WeightedMix = {
  burst: number;
  lowGate: number;
  transient: number;
  pulse: number;
  flux: number;
};

type BurstWeights = {
  lowGate: number;
  transient: number;
  subBass: number;
  flux: number;
};

export type GlitchControllerConfig = {
  glitchBurstDecay: number;
  glitchBurstWeights: BurstWeights;
  glitchLevelWeights: WeightedMix;
  levelBias: number;
  activationThreshold: number;
  activationDurationBaseMs: number;
  activationDurationScaleMs: number;
  cooldownBaseMs: number;
  cooldownScaleMs: number;
  goWildThreshold: number;
  goWildProbability: number;
  jitterScale: number;
  jitterMax: number;
  dutyWindowMs: number;
  maxDutyCycle: number;
  minActivationMs: number;
  dutyPenaltyMs: number;
};

type ActiveSpan = {
  start: number;
  end: number;
};

const MELLOW_GLITCH_CONFIG: GlitchControllerConfig = {
  glitchBurstDecay: 0.95,
  glitchBurstWeights: {
    lowGate: 0.42,
    transient: 0.34,
    subBass: 0.15,
    flux: 0.16,
  },
  glitchLevelWeights: {
    burst: 0.3,
    lowGate: 0.29,
    transient: 0.14,
    pulse: 0.08,
    flux: 0.1,
  },
  levelBias: -0.24,
  activationThreshold: 0.6,
  activationDurationBaseMs: 90,
  activationDurationScaleMs: 150,
  cooldownBaseMs: 380,
  cooldownScaleMs: 320,
  goWildThreshold: 0.9,
  goWildProbability: 0.008,
  jitterScale: 0.016,
  jitterMax: 0.018,
  dutyWindowMs: 10_000,
  maxDutyCycle: 0.25,
  minActivationMs: 55,
  dutyPenaltyMs: 460,
};

const AGGRESSIVE_GLITCH_CONFIG: GlitchControllerConfig = {
  glitchBurstDecay: 0.972,
  glitchBurstWeights: {
    lowGate: 0.62,
    transient: 0.58,
    subBass: 0.3,
    flux: 0.3,
  },
  glitchLevelWeights: {
    burst: 0.47,
    lowGate: 0.39,
    transient: 0.22,
    pulse: 0.14,
    flux: 0.19,
  },
  levelBias: -0.05,
  activationThreshold: 0.32,
  activationDurationBaseMs: 90,
  activationDurationScaleMs: 150,
  cooldownBaseMs: 110,
  cooldownScaleMs: 90,
  goWildThreshold: 0.65,
  goWildProbability: 0.06,
  jitterScale: 0.02,
  jitterMax: 0.025,
  dutyWindowMs: 10_000,
  maxDutyCycle: 0.35,
  minActivationMs: 60,
  dutyPenaltyMs: 320,
};

const FERAL_GLITCH_CONFIG: GlitchControllerConfig = {
  glitchBurstDecay: 0.98,
  glitchBurstWeights: {
    lowGate: 0.74,
    transient: 0.72,
    subBass: 0.4,
    flux: 0.4,
  },
  glitchLevelWeights: {
    burst: 0.58,
    lowGate: 0.5,
    transient: 0.29,
    pulse: 0.2,
    flux: 0.27,
  },
  levelBias: -0.02,
  activationThreshold: 0.34,
  activationDurationBaseMs: 180,
  activationDurationScaleMs: 380,
  cooldownBaseMs: 140,
  cooldownScaleMs: 130,
  goWildThreshold: 0.62,
  goWildProbability: 0.08,
  jitterScale: 0.062,
  jitterMax: 0.07,
  dutyWindowMs: 10_000,
  maxDutyCycle: 0.5,
  minActivationMs: 70,
  dutyPenaltyMs: 220,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function overlapMs(startA: number, endA: number, startB: number, endB: number): number {
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return Math.max(0, end - start);
}

export class GlitchController {
  private readonly config: GlitchControllerConfig;
  private glitchBurst = 0;
  private glitchCooldownUntilMs = 0;
  private glitchActiveUntilMs = 0;
  private spans: ActiveSpan[] = [];
  private activeStartMs: number | null = null;

  constructor(config: GlitchControllerConfig) {
    this.config = config;
  }

  update(nowMs: number, inputs: GlitchInputs, glitchGain: number): GlitchFrame {
    const burstInput =
      inputs.lowGate * this.config.glitchBurstWeights.lowGate +
      inputs.transient * this.config.glitchBurstWeights.transient +
      inputs.subBass * this.config.glitchBurstWeights.subBass +
      inputs.spectralFluxGate * this.config.glitchBurstWeights.flux;

    this.glitchBurst = Math.max(this.glitchBurst * this.config.glitchBurstDecay, burstInput);

    const rawLevel =
      this.glitchBurst * this.config.glitchLevelWeights.burst +
      inputs.lowGate * this.config.glitchLevelWeights.lowGate +
      inputs.transient * this.config.glitchLevelWeights.transient +
      inputs.pulse * this.config.glitchLevelWeights.pulse +
      inputs.spectralFluxGate * this.config.glitchLevelWeights.flux +
      this.config.levelBias;

    const level = clamp01(rawLevel * glitchGain);

    if (level > this.config.activationThreshold && nowMs > this.glitchCooldownUntilMs) {
      const dutyCycle = this.computeDutyCycle(nowMs);
      const budgetMs = this.config.maxDutyCycle * this.config.dutyWindowMs - dutyCycle * this.config.dutyWindowMs;

      if (budgetMs > this.config.minActivationMs) {
        const rawDuration = this.config.activationDurationBaseMs + level * this.config.activationDurationScaleMs;
        const duration = Math.min(rawDuration, Math.max(this.config.minActivationMs, budgetMs * 0.85));

        this.glitchActiveUntilMs = nowMs + duration;
        this.glitchCooldownUntilMs =
          nowMs + this.config.cooldownBaseMs + (1 - level) * this.config.cooldownScaleMs;
      } else {
        this.glitchCooldownUntilMs = nowMs + this.config.cooldownBaseMs + this.config.dutyPenaltyMs;
      }
    }

    const enabled = nowMs < this.glitchActiveUntilMs;
    this.updateActiveSpans(nowMs, enabled);

    const dutyCycle = this.computeDutyCycle(nowMs);
    const goWild =
      enabled && level > this.config.goWildThreshold && Math.random() < this.config.goWildProbability;
    const jitter = enabled ? Math.min(this.config.jitterMax, level * this.config.jitterScale) : 0;

    return {
      level,
      enabled,
      goWild,
      jitter,
      dutyCycle,
    };
  }

  private updateActiveSpans(nowMs: number, enabled: boolean): void {
    if (enabled) {
      if (this.activeStartMs === null) {
        this.activeStartMs = nowMs;
      }
      return;
    }

    if (this.activeStartMs !== null) {
      this.spans.push({ start: this.activeStartMs, end: nowMs });
      this.activeStartMs = null;
    }

    this.pruneSpans(nowMs);
  }

  private computeDutyCycle(nowMs: number): number {
    this.pruneSpans(nowMs);

    const windowStart = nowMs - this.config.dutyWindowMs;
    let activeMs = 0;

    for (const span of this.spans) {
      activeMs += overlapMs(span.start, span.end, windowStart, nowMs);
    }

    if (this.activeStartMs !== null) {
      activeMs += overlapMs(this.activeStartMs, nowMs, windowStart, nowMs);
    }

    return clamp01(activeMs / this.config.dutyWindowMs);
  }

  private pruneSpans(nowMs: number): void {
    const windowStart = nowMs - this.config.dutyWindowMs;
    this.spans = this.spans.filter((span) => span.end > windowStart);
  }
}

export function createGlitchController(profile: GlitchProfile): GlitchController {
  switch (profile) {
    case 'mellow':
      return new GlitchController(MELLOW_GLITCH_CONFIG);
    case 'aggressive':
      return new GlitchController(AGGRESSIVE_GLITCH_CONFIG);
    case 'feral':
      return new GlitchController(FERAL_GLITCH_CONFIG);
    default:
      return new GlitchController(AGGRESSIVE_GLITCH_CONFIG);
  }
}

export function createAggressiveGlitchController(): GlitchController {
  return createGlitchController('aggressive');
}
