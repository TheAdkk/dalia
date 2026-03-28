export const CONFIG = {
  PRESET_NAMES: [
    'Vector Sphere',
    'Mutant Torus',
    'Lissajous Knot',
    'Plasma Field',
    'Fractal Spiral',
    'Hyperbolic Paraboloid',
    'Nebula Vortex',
    'Chaos Ribbon',
  ],
  SPECTRAL_PALETTE: [
    '#08120A', '#18BF34', '#B8E61F', '#FFB11A',
    '#FF6D0A', '#FF1F1F', '#B30000', '#2A0000'
  ],
  WHITE_POINT: '#FFFFFF',
  SINGLE_CORE_MODE: true,
  WORMHOLE_MODE: true,
  SHOW_WAVEFORM: false,
  SHOW_SPARK_RING: false,
  AUTO_PRESET_MUTATION: true,
  ENVIRONMENT_MODE: true,
  GLITCH_PROFILE: 'aggressive' as const,
  MASHUP_INTERVAL_MS: 15_000,
  DEFAULT_TRACK_NAME: 'test_music.opus',
};
