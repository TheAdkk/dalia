# Dalia

Dalia is an audio reactive visualization engine inspired by classic visualizers and modern open source projects.

## Vision

Dalia is not a particle physics engine. It is a math and shader based visualization engine focused on:

- Readable music reaction from low to high bands.
- Stable visual quality without overexposure.
- Extensible presets and rendering pipeline.
- Reproducible behavior for open source collaboration.

## Main inspirations

- projectM: https://github.com/projectM-visualizer/projectm
- Butterchurn: https://github.com/jberg/butterchurn

## Repository structure

- dalia-core: Rust and WASM core engine.
- dalia-ts: TypeScript demo app and visual playground.

## Architecture

1. Audio analysis
   - FFT based features and per-band energy tracking.
2. Preset system
   - Real time equations for warp, transform, motion, and color behavior.
3. Rendering pipeline
   - Feedback and layered composition using web graphics APIs.
4. Future offline rendering
   - Export path for deterministic video output.

## Open source scope

Primary public product:

- dalia-core as the official reusable engine.

Secondary support:

- dalia-ts as an optional demo/reference app.

This keeps the core focused while still giving contributors a practical visual testbed.

## Git workflow

- main: stable production branch.
- dev: active integration branch.
- feature/*: short lived branches for isolated work.

## Contribution direction

- Keep rendering behavior deterministic where possible.
- Avoid uncontrolled brightness spikes.
- Prefer small focused pull requests.
- Add tests for critical signal and preset behavior.
# Dalia Engine

Dalia es un motor de visualizacion audio-reactiva enfocado en evaluacion matematica y shaders.

## Alcance Open Source

- Componente principal: `dalia-core` (Rust + WASM).
- Componente opcional: `dalia-ts` como demo de referencia para integracion y pruebas visuales.

## Inspiraciones

- projectM: https://github.com/projectM-visualizer/projectm
- Butterchurn: https://github.com/jberg/butterchurn

## Vision Tecnica

1. Analisis de audio por FFT y bandas para controlar dinamicas visuales.
2. Sistema de presets con evaluacion por frame para warp, rotacion, zoom y composicion.
3. Pipeline con feedback loop para producir movimiento continuo y coherente con la musica.

## Arquitectura

- `dalia-core/`: procesamiento de senal, logica de presets y exportaciones WASM.
- `dalia-ts/`: app/demo en TypeScript (UI, escena, orquestacion de audio y render).

## Flujo de Ramas

- `main`: rama estable.
- `dev`: integracion activa.
- `feature/*`: cambios puntuales por funcionalidad.

## Contribucion

Se aceptan contribuciones para:

- mejoras de analisis musical,
- nuevos presets y capas visuales,
- optimizacion de rendimiento,
- pruebas de regresion visual y estabilidad.
