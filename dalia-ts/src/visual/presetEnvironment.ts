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

  const phase = presetIndex % 4;
  const drive = Math.max(dynamicScore, transientScore);

  if (phase === 0) {
    return {
      fogColor: 0x070504,
      fogDensity: 0.022 + drive * 0.014,
      textureOpacity: 0.14 + drive * 0.12,
      textureSize: 0.02 + drive * 0.014,
      noiseOpacity: 0.09 + drive * 0.14,
      noiseSize: 0.012 + drive * 0.01,
      tunnelSpin: 0.0014 + drive * 0.0018,
      tunnelWarp: 0.18 + drive * 0.12,
      tunnelHueMix: 0.34,
      bloomBoost: 0.01 + drive * 0.05,
      glitchGain: 0.85,
    };
  }

  if (phase === 1) {
    return {
      fogColor: 0x090c04,
      fogDensity: 0.018 + drive * 0.012,
      textureOpacity: 0.16 + drive * 0.13,
      textureSize: 0.023 + drive * 0.016,
      noiseOpacity: 0.07 + drive * 0.09,
      noiseSize: 0.01 + drive * 0.008,
      tunnelSpin: 0.0017 + drive * 0.0024,
      tunnelWarp: 0.24 + drive * 0.14,
      tunnelHueMix: 0.46,
      bloomBoost: 0.03 + drive * 0.08,
      glitchGain: 0.9,
    };
  }

  if (phase === 2) {
    return {
      fogColor: 0x05060c,
      fogDensity: 0.017 + drive * 0.011,
      textureOpacity: 0.15 + drive * 0.1,
      textureSize: 0.021 + drive * 0.015,
      noiseOpacity: 0.08 + drive * 0.12,
      noiseSize: 0.011 + drive * 0.009,
      tunnelSpin: 0.0022 + drive * 0.003,
      tunnelWarp: 0.3 + drive * 0.16,
      tunnelHueMix: 0.58,
      bloomBoost: 0.02 + drive * 0.06,
      glitchGain: 0.95,
    };
  }

  return {
    fogColor: 0x040404,
    fogDensity: 0.014 + drive * 0.01,
    textureOpacity: 0.12 + drive * 0.11,
    textureSize: 0.019 + drive * 0.013,
    noiseOpacity: 0.1 + drive * 0.16,
    noiseSize: 0.012 + drive * 0.012,
    tunnelSpin: 0.0015 + drive * 0.0022,
    tunnelWarp: 0.22 + drive * 0.15,
    tunnelHueMix: 0.4,
    bloomBoost: 0.01 + drive * 0.04,
    glitchGain: 1.05,
  };
}
