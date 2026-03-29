export type PresetEnvironment = {
  fogColor: number;
  fogDensity: number;
  textureOpacity: number;
  textureSize: number;
  noiseOpacity: number;
  noiseSize: number;
  tunnelSpin: number;
  tunnelWarp: number;
  tunnelHueMix: number;
  bloomBoost: number;
  glitchGain: number;
};

type PresetEnvironmentProfile = PresetEnvironment & {
  driveGain: number;
  transientGain: number;
};

const PRESET_ENVIRONMENT_PROFILES: PresetEnvironmentProfile[] = [
  { fogColor: 0x06090d, fogDensity: 0.018, textureOpacity: 0.14, textureSize: 0.018, noiseOpacity: 0.07, noiseSize: 0.011, tunnelSpin: 0.0013, tunnelWarp: 0.18, tunnelHueMix: 0.28, bloomBoost: 0.012, glitchGain: 0.84, driveGain: 0.92, transientGain: 0.48 },
  { fogColor: 0x120904, fogDensity: 0.02, textureOpacity: 0.15, textureSize: 0.02, noiseOpacity: 0.08, noiseSize: 0.012, tunnelSpin: 0.0017, tunnelWarp: 0.22, tunnelHueMix: 0.36, bloomBoost: 0.02, glitchGain: 0.88, driveGain: 0.96, transientGain: 0.54 },
  { fogColor: 0x08110a, fogDensity: 0.017, textureOpacity: 0.16, textureSize: 0.022, noiseOpacity: 0.09, noiseSize: 0.012, tunnelSpin: 0.0019, tunnelWarp: 0.26, tunnelHueMix: 0.41, bloomBoost: 0.024, glitchGain: 0.9, driveGain: 0.98, transientGain: 0.5 },
  { fogColor: 0x150b16, fogDensity: 0.021, textureOpacity: 0.17, textureSize: 0.024, noiseOpacity: 0.11, noiseSize: 0.013, tunnelSpin: 0.0022, tunnelWarp: 0.3, tunnelHueMix: 0.47, bloomBoost: 0.03, glitchGain: 0.94, driveGain: 1.04, transientGain: 0.6 },
  { fogColor: 0x041014, fogDensity: 0.016, textureOpacity: 0.14, textureSize: 0.02, noiseOpacity: 0.1, noiseSize: 0.012, tunnelSpin: 0.0016, tunnelWarp: 0.24, tunnelHueMix: 0.5, bloomBoost: 0.018, glitchGain: 0.86, driveGain: 0.9, transientGain: 0.44 },
  { fogColor: 0x0f080b, fogDensity: 0.018, textureOpacity: 0.15, textureSize: 0.021, noiseOpacity: 0.09, noiseSize: 0.011, tunnelSpin: 0.0018, tunnelWarp: 0.21, tunnelHueMix: 0.33, bloomBoost: 0.022, glitchGain: 0.89, driveGain: 0.93, transientGain: 0.47 },
  { fogColor: 0x060812, fogDensity: 0.019, textureOpacity: 0.17, textureSize: 0.023, noiseOpacity: 0.12, noiseSize: 0.014, tunnelSpin: 0.0021, tunnelWarp: 0.34, tunnelHueMix: 0.56, bloomBoost: 0.032, glitchGain: 0.96, driveGain: 1.08, transientGain: 0.64 },
  { fogColor: 0x160606, fogDensity: 0.022, textureOpacity: 0.18, textureSize: 0.024, noiseOpacity: 0.13, noiseSize: 0.014, tunnelSpin: 0.0024, tunnelWarp: 0.38, tunnelHueMix: 0.6, bloomBoost: 0.036, glitchGain: 1.0, driveGain: 1.12, transientGain: 0.68 },
  { fogColor: 0x04060f, fogDensity: 0.018, textureOpacity: 0.16, textureSize: 0.022, noiseOpacity: 0.1, noiseSize: 0.012, tunnelSpin: 0.0023, tunnelWarp: 0.41, tunnelHueMix: 0.62, bloomBoost: 0.03, glitchGain: 0.95, driveGain: 1.06, transientGain: 0.61 },
  { fogColor: 0x070a12, fogDensity: 0.017, textureOpacity: 0.14, textureSize: 0.019, noiseOpacity: 0.08, noiseSize: 0.011, tunnelSpin: 0.0015, tunnelWarp: 0.2, tunnelHueMix: 0.39, bloomBoost: 0.014, glitchGain: 0.83, driveGain: 0.88, transientGain: 0.4 },
  { fogColor: 0x0e1012, fogDensity: 0.016, textureOpacity: 0.13, textureSize: 0.018, noiseOpacity: 0.07, noiseSize: 0.01, tunnelSpin: 0.0012, tunnelWarp: 0.17, tunnelHueMix: 0.29, bloomBoost: 0.01, glitchGain: 0.8, driveGain: 0.84, transientGain: 0.36 },
  { fogColor: 0x16130a, fogDensity: 0.015, textureOpacity: 0.11, textureSize: 0.016, noiseOpacity: 0.06, noiseSize: 0.009, tunnelSpin: 0.0011, tunnelWarp: 0.14, tunnelHueMix: 0.24, bloomBoost: 0.008, glitchGain: 0.78, driveGain: 0.8, transientGain: 0.32 },
  { fogColor: 0x19090c, fogDensity: 0.019, textureOpacity: 0.16, textureSize: 0.02, noiseOpacity: 0.08, noiseSize: 0.011, tunnelSpin: 0.0014, tunnelWarp: 0.16, tunnelHueMix: 0.3, bloomBoost: 0.02, glitchGain: 0.84, driveGain: 0.9, transientGain: 0.49 },
  { fogColor: 0x020204, fogDensity: 0.022, textureOpacity: 0.15, textureSize: 0.021, noiseOpacity: 0.14, noiseSize: 0.014, tunnelSpin: 0.002, tunnelWarp: 0.44, tunnelHueMix: 0.66, bloomBoost: 0.028, glitchGain: 1.02, driveGain: 1.16, transientGain: 0.72 },
  { fogColor: 0x0f1217, fogDensity: 0.021, textureOpacity: 0.17, textureSize: 0.024, noiseOpacity: 0.11, noiseSize: 0.012, tunnelSpin: 0.0023, tunnelWarp: 0.35, tunnelHueMix: 0.54, bloomBoost: 0.033, glitchGain: 0.98, driveGain: 1.1, transientGain: 0.67 },
  { fogColor: 0x1a1018, fogDensity: 0.024, textureOpacity: 0.18, textureSize: 0.025, noiseOpacity: 0.12, noiseSize: 0.013, tunnelSpin: 0.0024, tunnelWarp: 0.46, tunnelHueMix: 0.58, bloomBoost: 0.038, glitchGain: 1.04, driveGain: 1.18, transientGain: 0.74 },
  { fogColor: 0x050a16, fogDensity: 0.02, textureOpacity: 0.16, textureSize: 0.023, noiseOpacity: 0.1, noiseSize: 0.012, tunnelSpin: 0.0025, tunnelWarp: 0.48, tunnelHueMix: 0.61, bloomBoost: 0.029, glitchGain: 0.97, driveGain: 1.14, transientGain: 0.7 },
  { fogColor: 0x1f0905, fogDensity: 0.023, textureOpacity: 0.18, textureSize: 0.026, noiseOpacity: 0.13, noiseSize: 0.013, tunnelSpin: 0.0022, tunnelWarp: 0.4, tunnelHueMix: 0.52, bloomBoost: 0.042, glitchGain: 1.01, driveGain: 1.15, transientGain: 0.75 },
  { fogColor: 0x091624, fogDensity: 0.02, textureOpacity: 0.17, textureSize: 0.024, noiseOpacity: 0.1, noiseSize: 0.011, tunnelSpin: 0.0019, tunnelWarp: 0.29, tunnelHueMix: 0.49, bloomBoost: 0.026, glitchGain: 0.92, driveGain: 1.02, transientGain: 0.58 },
  { fogColor: 0x25070a, fogDensity: 0.022, textureOpacity: 0.19, textureSize: 0.027, noiseOpacity: 0.14, noiseSize: 0.014, tunnelSpin: 0.0026, tunnelWarp: 0.5, tunnelHueMix: 0.68, bloomBoost: 0.044, glitchGain: 1.05, driveGain: 1.2, transientGain: 0.78 },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getPresetEnvironment(
  presetIndex: number,
  dynamicScore: number,
  transientScore: number,
  enabled: boolean,
): PresetEnvironment {
  if (!enabled) {
    return {
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
    };
  }

  const profile = PRESET_ENVIRONMENT_PROFILES[presetIndex % PRESET_ENVIRONMENT_PROFILES.length];
  const drive = clamp01(Math.max(dynamicScore, transientScore));
  const transientEdge = clamp01(Math.max(0, transientScore - dynamicScore) * 1.4);
  const driveScale = drive * profile.driveGain;
  const transientScale = transientEdge * profile.transientGain;

  return {
    fogColor: profile.fogColor,
    fogDensity: profile.fogDensity + driveScale * 0.014 + transientScale * 0.005,
    textureOpacity: profile.textureOpacity + driveScale * 0.12 + transientScale * 0.04,
    textureSize: profile.textureSize + driveScale * 0.011 + transientScale * 0.004,
    noiseOpacity: profile.noiseOpacity + driveScale * 0.1 + transientScale * 0.05,
    noiseSize: profile.noiseSize + driveScale * 0.008 + transientScale * 0.003,
    tunnelSpin: profile.tunnelSpin + driveScale * 0.0022 + transientScale * 0.0009,
    tunnelWarp: profile.tunnelWarp + driveScale * 0.12 + transientScale * 0.05,
    tunnelHueMix: profile.tunnelHueMix + driveScale * 0.1 + transientScale * 0.04,
    bloomBoost: profile.bloomBoost + driveScale * 0.05 + transientScale * 0.03,
    glitchGain: profile.glitchGain + driveScale * 0.12 + transientScale * 0.18,
  };
}
