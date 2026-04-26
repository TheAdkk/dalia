# 🌸 Dalia

**Real-time audio-reactive visualization engine powered by Rust/WASM and Three.js.**

Dalia turns music into immersive 3D visuals — driven by math, shaders, and real-time audio analysis. No physics simulations, no baked animations. Every frame is computed from the music.

[**▶ Try the Live Demo**](https://dalia-phi.vercel.app)

---

## ✨ Features

- **20 procedural geometry presets** — from Vector Spheres to Black Hole Singularities, each generated in real-time by mathematical equations
- **Rust/WASM audio analysis** — FFT-based feature extraction with 7-band energy tracking, chromagram, BPM detection, beat phase, spectral flux gating, and transient detection
- **Harmonic color system** — colors derived from real-time chromagram analysis, mapping detected musical key to HSL palettes
- **Dynamic mashup system** — beat-locked preset switching with drop prediction, bass sustain analysis, and lookahead energy forecasting
- **Post-processing pipeline** — bloom, chromatic aberration, and glitch effects all reactive to audio dynamics
- **Stereo-aware rendering** — left/right channel separation with independent energy tracking and spatial visualization
- **Wormhole mode** — cinematic camera with tunnel particles, fog dynamics, and depth-reactive motion
- **Load your own music** — drag any audio file and watch Dalia react

## 🏗️ Architecture

```
dalia/
├── dalia-core/          ← Rust/WASM engine
│   └── src/
│       ├── audio.rs     ← FFT, chromagram, BPM, beat phase, spectral flux, lookahead
│       ├── geometry.rs  ← 20 procedural geometry generators (math-driven vertices)
│       ├── presets.rs   ← Preset enum and navigation
│       ├── mashup.rs    ← Transition controller with smoothstep blending
│       └── lib.rs       ← DaliaEngine: WASM-exported API surface
│
└── dalia-ts/            ← TypeScript demo / visual playground
    └── src/
        ├── main.ts      ← Render loop and audio-visual orchestration
        ├── audio/       ← Web Audio API manager with stereo splitting
        ├── render/      ← Three.js scene setup, materials, post-processing
        ├── visual/      ← Preset environments, psy-motion, glitch controller, rhythm dynamics
        ├── ui/          ← Player controls, preset picker, recording
        ├── core/        ← Configuration constants
        └── wasm/        ← Pre-compiled WASM artifacts
```

### Signal Flow

```
Microphone/File → Web Audio API → FFT → dalia-core (WASM)
                                            ├── Band energy (sub-bass → air)
                                            ├── Chromagram → harmonic hue
                                            ├── BPM detection → beat phase
                                            ├── Spectral flux → transient gate
                                            ├── Lookahead prediction
                                            └── Geometry vertices
                                                    ↓
                                         Three.js render pipeline
                                            ├── Point cloud rendering
                                            ├── Stereo L/R separation
                                            ├── Tunnel particles
                                            ├── Bloom + Glitch + RGB Shift
                                            └── Wormhole camera
```

## 🎨 Presets

| # | Preset | # | Preset |
|---|--------|---|--------|
| 0 | Vector Sphere | 10 | Voxel Grid |
| 1 | Mutant Torus | 11 | Morphing Cube |
| 2 | Lissajous Knot | 12 | Heart Pulse |
| 3 | Plasma Field | 13 | Black Hole Singularity |
| 4 | Fractal Spiral | 14 | Tesseract Fold |
| 5 | Hyperbolic Paraboloid | 15 | Hyperspace Jump |
| 6 | Nebula Vortex | 16 | Wormhole Bridge |
| 7 | Chaos Ribbon | 17 | Supernova Remnant |
| 8 | Quantum String | 18 | Andromeda Spiral |
| 9 | Galactic Web | 19 | Gamma-Ray Pulsar |

Presets switch automatically via the dynamic mashup system — beat-locked, drop-synced, and bass-aware.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Audio DSP | Rust → WebAssembly (`wasm-bindgen`) |
| 3D Rendering | Three.js with custom post-processing |
| Build | Vite + TypeScript |
| WASM Tooling | `wasm-pack` (build locally, artifacts committed) |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://rustup.rs/) + `wasm-pack` (only needed if modifying `dalia-core`)

### Run the demo

```bash
cd dalia-ts
npm install
npm run dev
```

Open `http://localhost:5173`, click play, and enjoy.

### Modify the Rust core

```bash
# Install wasm-pack if you haven't
cargo install wasm-pack

# Rebuild WASM and start dev server
cd dalia-ts
npm run build      # compiles Rust → WASM → bundles everything
npm run dev
```

### Production build (for deployment)

```bash
cd dalia-ts
npm run build:deploy   # skips Rust compilation, uses pre-built WASM
```

## 🎯 Inspirations

Dalia draws from the legacy of classic music visualizers:

- [projectM](https://github.com/projectM-visualizer/projectm) — the open-source Milkdrop reimplementation
- [Butterchurn](https://github.com/jberg/butterchurn) — Milkdrop in WebGL

## 📄 License

GPL-3.0 License

## 🤝 Contributing

Contributions welcome for:

- New geometry presets
- Audio analysis improvements
- Performance optimizations
- Visual regression tests
- Documentation

Please keep PRs focused and small. See the architecture section to understand where your change fits.
