use wasm_bindgen::prelude::*;

pub const NUM_VERTICES: usize = 12_000;
pub const BUFFER_SIZE: usize = NUM_VERTICES * 3;

// ─── Presets ────────────────────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq)]
pub enum Preset {
    VectorSphere,
    MutantTorus,
    LissajousKnot,
    PlasmaField,
    FractalSpiral,
    HyperbolicParaboloid,
}

impl Preset {
    pub fn next(self) -> Preset {
        match self {
            Preset::VectorSphere        => Preset::MutantTorus,
            Preset::MutantTorus         => Preset::LissajousKnot,
            Preset::LissajousKnot       => Preset::PlasmaField,
            Preset::PlasmaField         => Preset::FractalSpiral,
            Preset::FractalSpiral       => Preset::HyperbolicParaboloid,
            Preset::HyperbolicParaboloid => Preset::VectorSphere,
        }
    }

    pub fn prev(self) -> Preset {
        match self {
            Preset::VectorSphere         => Preset::HyperbolicParaboloid,
            Preset::MutantTorus          => Preset::VectorSphere,
            Preset::LissajousKnot        => Preset::MutantTorus,
            Preset::PlasmaField          => Preset::LissajousKnot,
            Preset::FractalSpiral        => Preset::PlasmaField,
            Preset::HyperbolicParaboloid => Preset::FractalSpiral,
        }
    }

    pub fn index(self) -> u32 {
        match self {
            Preset::VectorSphere         => 0,
            Preset::MutantTorus          => 1,
            Preset::LissajousKnot        => 2,
            Preset::PlasmaField          => 3,
            Preset::FractalSpiral        => 4,
            Preset::HyperbolicParaboloid => 5,
        }
    }

    pub fn from_index(i: u32) -> Preset {
        match i % 6 {
            0 => Preset::VectorSphere,
            1 => Preset::MutantTorus,
            2 => Preset::LissajousKnot,
            3 => Preset::PlasmaField,
            4 => Preset::FractalSpiral,
            _ => Preset::HyperbolicParaboloid,
        }
    }
}

// ─── Mashup Controller ───────────────────────────────────────────────────────

pub struct MashupController {
    pub current_preset:      Preset,
    pub next_preset:         Option<Preset>,
    pub transition_progress: f32,
    pub transition_speed:    f32,
}

impl MashupController {
    pub fn new() -> Self {
        Self {
            current_preset:      Preset::VectorSphere,
            next_preset:         None,
            transition_progress: 0.0,
            transition_speed:    0.006,
        }
    }

    pub fn start_transition(&mut self, target: Preset) {
        if self.next_preset.is_none() {
            self.next_preset         = Some(target);
            self.transition_progress = 0.0;
        }
    }

    pub fn update(&mut self) {
        if self.next_preset.is_some() {
            self.transition_progress += self.transition_speed;
            if self.transition_progress >= 1.0 {
                self.current_preset  = self.next_preset.take().unwrap();
                self.transition_progress = 0.0;
            }
        }
    }
}

// ─── Engine ──────────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct DaliaEngine {
    processed_data:    Vec<f32>,
    time:              f32,
    geometry_buffer:   Vec<f32>,
    mashup_controller: MashupController,

    // 8 smoothed frequency bands
    sub_bass:   f32,  // 0–60 Hz
    bass:       f32,  // 60–250 Hz
    low_mid:    f32,  // 250–500 Hz
    mid:        f32,  // 500–2k Hz
    upper_mid:  f32,  // 2k–4k Hz
    presence:   f32,  // 4k–6k Hz
    treb:       f32,  // 6k–12k Hz
    air:        f32,  // 12k–20k Hz

    // Overall energy (RMS)
    energy:     f32,
}

#[wasm_bindgen]
impl DaliaEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> DaliaEngine {
        DaliaEngine {
            processed_data:    Vec::new(),
            time:              0.0,
            geometry_buffer:   vec![0.0; BUFFER_SIZE],
            mashup_controller: MashupController::new(),
            sub_bass:          0.0,
            bass:              0.0,
            low_mid:           0.0,
            mid:               0.0,
            upper_mid:         0.0,
            presence:          0.0,
            treb:              0.0,
            air:               0.0,
            energy:            0.0,
        }
    }

    // ─── Audio-reactive getters (for TS color/bloom modulation) ──────────────
    pub fn get_bass(&self)   -> f32 { self.bass }
    pub fn get_mid(&self)    -> f32 { self.mid }
    pub fn get_treb(&self)   -> f32 { self.treb }
    pub fn get_energy(&self) -> f32 { self.energy }
    pub fn get_sub_bass(&self) -> f32 { self.sub_bass }
    pub fn get_air(&self)    -> f32 { self.air }
    pub fn get_presence(&self) -> f32 { self.presence }

    // ─── Preset navigation ───────────────────────────────────────────────────
    pub fn next_preset(&mut self) {
        let target = self.mashup_controller.current_preset.next();
        self.mashup_controller.start_transition(target);
    }

    pub fn prev_preset(&mut self) {
        let target = self.mashup_controller.current_preset.prev();
        self.mashup_controller.start_transition(target);
    }

    /// Returns current preset index (0-5)
    pub fn current_preset_index(&self) -> u32 {
        self.mashup_controller.current_preset.index()
    }

    /// Legacy toggle for Mashup button – cycles forward
    pub fn toggle_mashup(&mut self) {
        self.next_preset();
    }

    // ─── Main audio processing ───────────────────────────────────────────────
    pub fn process_audio(&mut self, frequency_data: &[u8]) {
        let len = frequency_data.len();
        if len == 0 { return; }

        if self.processed_data.len() != len {
            self.processed_data.resize(len, 0.0);
        }

        // Normalize bytes -> 0.0..1.0
        let mut energy_sum = 0.0_f32;
        for (i, &byte) in frequency_data.iter().enumerate() {
            let v = byte as f32 / 255.0;
            self.processed_data[i] = v;
            energy_sum += v * v;
        }
        let rms = (energy_sum / len as f32).sqrt();

        // Map FFT bins to 8 perceptual bands
        // With fftSize=2048, frequencyBinCount=1024 bins; nyquist at 22050 Hz
        // Bin bandwidth = 22050 / 1024 ≈ 21.5 Hz
        let band_ranges: [(usize, usize); 8] = [
            (0,   3),    // sub-bass   0-60 Hz
            (3,   12),   // bass       60-250 Hz
            (12,  23),   // low-mid    250-500 Hz
            (23,  93),   // mid        500-2k Hz
            (93,  186),  // upper-mid  2k-4k Hz
            (186, 279),  // presence   4k-6k Hz
            (279, 558),  // treb       6k-12k Hz
            (558, len.min(930)), // air 12k-20k Hz
        ];

        let mut band_vals = [0.0_f32; 8];
        for (b, &(lo, hi)) in band_ranges.iter().enumerate() {
            let hi = hi.min(len);
            if lo >= hi { band_vals[b] = 0.0; continue; }
            let mut sum = 0.0_f32;
            for i in lo..hi {
                sum += self.processed_data[i];
            }
            band_vals[b] = sum / (hi - lo) as f32;
        }

        // Smooth: fast attack (0.5), slow release (0.08)
        fn smooth(old: f32, new: f32) -> f32 {
            if new > old { old * 0.5 + new * 0.5 } else { old * 0.92 + new * 0.08 }
        }

        self.sub_bass  = smooth(self.sub_bass,  band_vals[0]);
        self.bass      = smooth(self.bass,      band_vals[1]);
        self.low_mid   = smooth(self.low_mid,   band_vals[2]);
        self.mid       = smooth(self.mid,       band_vals[3]);
        self.upper_mid = smooth(self.upper_mid, band_vals[4]);
        self.presence  = smooth(self.presence,  band_vals[5]);
        self.treb      = smooth(self.treb,      band_vals[6]);
        self.air       = smooth(self.air,       band_vals[7]);
        self.energy    = smooth(self.energy,    rms);

        self.time += 0.016;
        self.mashup_controller.update();

        // Generate geometry
        if let Some(next) = self.mashup_controller.next_preset {
            let t = self.mashup_controller.transition_progress;
            let t_e = t * t * (3.0 - 2.0 * t); // smoothstep
            for i in 0..NUM_VERTICES {
                let p1 = self.vertex(i, self.mashup_controller.current_preset);
                let p2 = self.vertex(i, next);
                let idx = i * 3;
                self.geometry_buffer[idx]     = p1.0 + (p2.0 - p1.0) * t_e;
                self.geometry_buffer[idx + 1] = p1.1 + (p2.1 - p1.1) * t_e;
                self.geometry_buffer[idx + 2] = p1.2 + (p2.2 - p1.2) * t_e;
            }
        } else {
            let preset = self.mashup_controller.current_preset;
            for i in 0..NUM_VERTICES {
                let p = self.vertex(i, preset);
                let idx = i * 3;
                self.geometry_buffer[idx]     = p.0;
                self.geometry_buffer[idx + 1] = p.1;
                self.geometry_buffer[idx + 2] = p.2;
            }
        }
    }

    // ─── Vertex calculators ───────────────────────────────────────────────────
    fn vertex(&self, index: usize, preset: Preset) -> (f32, f32, f32) {
        match preset {
            Preset::VectorSphere         => self.vertex_sphere(index),
            Preset::MutantTorus          => self.vertex_torus(index),
            Preset::LissajousKnot        => self.vertex_lissajous(index),
            Preset::PlasmaField          => self.vertex_plasma(index),
            Preset::FractalSpiral        => self.vertex_fractal_spiral(index),
            Preset::HyperbolicParaboloid => self.vertex_hyperbolic(index),
        }
    }

    // ── (0) VectorSphere — Fibonacci sphere pulsing with bass ─────────────────
    fn vertex_sphere(&self, index: usize) -> (f32, f32, f32) {
        let f = index as f32;
        let n = NUM_VERTICES as f32;
        let phi = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
        let y = 1.0 - (f / (n - 1.0)) * 2.0;
        let ry = (1.0 - y * y).sqrt();
        let theta = phi * f;
        let x = theta.cos() * ry;
        let z = theta.sin() * ry;
        // Bass pulses radius; sub-bass ripples the poles; treb adds noise
        let r = 2.2
            + self.bass * 2.5
            + self.sub_bass * (self.time * 3.0 + y * 8.0).sin() * 0.6
            + self.treb   * (self.time * 7.0 + f * 0.003).cos() * 0.25;
        (x * r, y * r, z * r)
    }

    // ── (1) MutantTorus — torus knot driven by mid/treb ──────────────────────
    fn vertex_torus(&self, index: usize) -> (f32, f32, f32) {
        let f = index as f32;
        let n = NUM_VERTICES as f32;
        let u = (f / n) * std::f32::consts::PI * 2.0;
        let v = (f / n) * std::f32::consts::PI * 20.0;
        let r_main = 2.2 + self.mid * 1.8 + (self.time * 1.2).sin() * 0.3;
        let r_tube = 0.5 + self.treb * 1.2 + self.presence * 0.4;
        let twist  = self.time * 0.6 + self.mid * std::f32::consts::PI;
        let x = (r_main + r_tube * v.cos()) * (u + twist).cos();
        let y = (r_main + r_tube * v.cos()) * (u + twist).sin();
        let z = r_tube * v.sin()
              + (self.time * 4.0 + u * 6.0).sin() * self.bass * 0.8
              + self.sub_bass * (self.time * 2.0).sin() * 0.5;
        (x, y, z)
    }

    // ── (2) LissajousKnot — 3D parametric Lissajous tangled by bass ──────────
    fn vertex_lissajous(&self, index: usize) -> (f32, f32, f32) {
        let f = index as f32;
        let n = NUM_VERTICES as f32;
        let t = (f / n) * std::f32::consts::TAU;

        // Frequency ratios that create interesting Lissajous figures
        let ax = 3.0 + self.bass * 2.0;
        let ay = 2.0 + self.mid  * 1.5;
        let az = 5.0 + self.treb * 3.0;

        // Phase offsets modulated by different audio bands
        let dx = self.time * 0.7 + self.sub_bass * std::f32::consts::PI;
        let dy = self.time * 0.5 + self.presence * std::f32::consts::PI * 0.5;
        let dz = self.time * 0.3 + self.air      * std::f32::consts::PI * 2.0;

        let scale = 2.8 + self.energy * 1.5;
        let x = (ax * t + dx).sin() * scale;
        let y = (ay * t + dy).sin() * scale;
        let z = (az * t + dz).cos() * scale
              + (self.time * 5.0 + t * 3.0).sin() * self.bass * 0.6;
        (x, y, z)
    }

    // ── (3) PlasmaField — sine interference rings pulsing with treble ─────────
    fn vertex_plasma(&self, index: usize) -> (f32, f32, f32) {
        let f = index as f32;
        let n = NUM_VERTICES as f32;

        // Distribute points in a disk using Fibonacci spiral
        let phi_g = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
        let r_norm = (f / n).sqrt(); // uniformly distribute radially
        let angle  = phi_g * f;
        let px = angle.cos() * r_norm;
        let py = angle.sin() * r_norm;

        // Multiple sine wave interference for plasma
        let freq1 = 4.0  + self.treb    * 8.0;
        let freq2 = 7.0  + self.presence * 5.0;
        let freq3 = 11.0 + self.upper_mid * 6.0;

        let d1 = (px * freq1 + self.time * 1.5).sin();
        let d2 = (py * freq2 + self.time * 2.1).sin();
        let d3 = ((px * px + py * py).sqrt() * freq3 - self.time * 3.0).sin();
        let d4 = ((px - 0.5) * freq2 + (py + 0.3) * freq1 + self.time).sin();

        let plasma = (d1 + d2 + d3 + d4) * 0.25;
        let z = plasma * (1.8 + self.bass * 2.5 + self.sub_bass * 1.5);

        // Spread radius based on energy
        let spread = 4.5 + self.energy * 2.0;
        (px * spread, py * spread, z)
    }

    // ── (4) FractalSpiral — galaxy spiral arms that fork with mid ────────────
    fn vertex_fractal_spiral(&self, index: usize) -> (f32, f32, f32) {
        let f = index as f32;
        let n = NUM_VERTICES as f32;
        let t = f / n;

        // Number of arms (2-5 depending on mid)
        let num_arms = 3.0 + (self.mid * 4.0).floor();
        let arm_idx  = (f % num_arms) as f32;
        let arm_t    = t * num_arms; // parameter within the arm

        // Logarithmic spiral: r = a * e^(b * theta)
        let theta      = arm_t * std::f32::consts::PI * 5.0 + arm_idx * (std::f32::consts::TAU / num_arms);
        let b          = 0.2 + self.upper_mid * 0.15;
        let r          = (0.15 * (b * theta).exp()).min(5.0);

        // Audio-reactive warp
        let warp_r = r
            + self.bass    * (theta * 3.0 + self.time * 2.0).sin() * 0.6
            + self.treb    * (theta * 7.0 + self.time * 5.0).cos() * 0.2;
        let twist  = self.time * 0.4 + self.mid * 2.0;

        let x = (theta + twist).cos() * warp_r;
        let y = (theta + twist).sin() * warp_r;
        // Out-of-plane ripple driven by presence + sub-bass
        let z = (self.time * 3.0 + theta * 2.0).sin() * self.presence * 0.8
              + (self.time * 1.5 + r * 4.0).cos() * self.sub_bass * 1.2;
        (x, y, z)
    }

    // ── (5) HyperbolicParaboloid — saddle surface rippling with all bands ─────
    fn vertex_hyperbolic(&self, index: usize) -> (f32, f32, f32) {
        let f = index as f32;
        let n = NUM_VERTICES as f32;

        // Map to 2D grid
        let side = (n.sqrt()) as usize;
        let ix = (index % side) as f32 / side as f32; // 0..1
        let iy = (index / side) as f32 / side as f32; // 0..1

        let px = (ix - 0.5) * 8.0; // -4..4
        let py = (iy - 0.5) * 8.0;

        // Classic saddle: z = (x^2 - y^2) / a
        let saddle_z = (px * px - py * py) / (4.0 + self.bass * 4.0);

        // Layered wave interference on top
        let wave1 = (px * (2.0 + self.treb * 4.0) + self.time * 2.0).sin()
                  * self.treb * 0.8;
        let wave2 = (py * (3.0 + self.presence * 3.0) - self.time * 1.5).cos()
                  * self.presence * 0.6;
        let wave3 = ((px * px + py * py).sqrt() * (1.5 + self.mid * 3.0) - self.time * 4.0).sin()
                  * self.mid * 1.0;
        let wave4 = (px * 1.2 + py * 0.8 + self.time * 3.5).sin()
                  * self.sub_bass * 1.5;

        let z = saddle_z + wave1 + wave2 + wave3 + wave4;
        (px, py, z.clamp(-5.0, 5.0))
    }

    // ─── Memory accessors ─────────────────────────────────────────────────────
    pub fn get_geometry_ptr(&self) -> *const f32 { self.geometry_buffer.as_ptr() }
    pub fn get_geometry_len(&self) -> usize       { self.geometry_buffer.len() }
    pub fn get_processed_data_ptr(&self) -> *const f32 { self.processed_data.as_ptr() }
    pub fn get_processed_data_len(&self) -> usize      { self.processed_data.len() }
}
