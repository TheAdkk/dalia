use wasm_bindgen::prelude::*;

pub const NUM_VERTICES: usize = 5000;
pub const BUFFER_SIZE: usize = NUM_VERTICES * 3;

#[derive(Clone, Copy)]
pub enum Preset {
    VectorSphere,
    MutantTorus,
}

pub struct MashupController {
    pub current_preset: Preset,
    pub next_preset: Option<Preset>,
    pub transition_progress: f32,
    pub transition_speed: f32,
}

impl MashupController {
    pub fn new() -> Self {
        Self {
            current_preset: Preset::VectorSphere,
            next_preset: None,
            transition_progress: 0.0,
            transition_speed: 0.005, // Adjust for transition duration
        }
    }

    pub fn trigger_transition(&mut self) {
        if self.next_preset.is_none() {
            self.next_preset = match self.current_preset {
                Preset::VectorSphere => Some(Preset::MutantTorus),
                Preset::MutantTorus => Some(Preset::VectorSphere),
            };
            self.transition_progress = 0.0;
        }
    }

    pub fn update(&mut self) {
        if self.next_preset.is_some() {
            self.transition_progress += self.transition_speed;
            if self.transition_progress >= 1.0 {
                self.current_preset = self.next_preset.take().unwrap();
                self.transition_progress = 0.0;
            }
        }
    }
}

/// The core audio processing engine for Dalia.
/// Receives raw frequency data from JavaScript and processes it
/// into a 3D vertex geometry buffer accessible via shared WASM memory.
#[wasm_bindgen]
pub struct DaliaEngine {
    /// Internal buffer holding processed audio data (normalized 0.0–1.0)
    processed_data: Vec<f32>,
    /// Accumulated time for shaders
    time: f32,
    /// 3D Vertex Buffer: [x, y, z, x, y, z, ...]
    geometry_buffer: Vec<f32>,
    /// Holds the state for preset transitions
    mashup_controller: MashupController,
    /// Smoothed audio bands
    bass: f32,
    mid: f32,
    treb: f32,
}

#[wasm_bindgen]
impl DaliaEngine {
    /// Creates a new DaliaEngine instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> DaliaEngine {
        DaliaEngine {
            processed_data: Vec::new(),
            time: 0.0,
            geometry_buffer: vec![0.0; BUFFER_SIZE],
            mashup_controller: MashupController::new(),
            bass: 0.0,
            mid: 0.0,
            treb: 0.0,
        }
    }

    /// Toggles the mashup mode to transition to the next preset.
    pub fn toggle_mashup(&mut self) {
        self.mashup_controller.trigger_transition();
    }

    /// Receives raw byte frequency data from the Web Audio API's AnalyserNode
    /// (values 0–255) and normalizes each sample to a f32 in the range [0.0, 1.0].
    ///
    /// This is the zero-copy entry point: JS passes a &[u8] view directly
    /// into WASM linear memory — no JSON, no serde.
    pub fn process_audio(&mut self, frequency_data: &[u8]) {
        // Resize buffer only if necessary
        let len = frequency_data.len();
        if self.processed_data.len() != len {
            self.processed_data.resize(len, 0.0);
        }

        // Normalize each byte (0–255) to a float (0.0–1.0)
        let Mut_slice = &mut self.processed_data;
        for (i, &byte) in frequency_data.iter().enumerate() {
            Mut_slice[i] = byte as f32 / 255.0;
        }

        // --- Math Preset Evaluator ---
        // Calculate bass, mid, treb from the frequency array
        let mut bass_sum = 0.0;
        let mut mid_sum = 0.0;
        let mut treb_sum = 0.0;

        let third = len / 3;
        for i in 0..len {
            let val = Mut_slice[i];
            if i < third {
                bass_sum += val;
            } else if i < 2 * third {
                mid_sum += val;
            } else {
                treb_sum += val;
            }
        }

        let count = (third as f32).max(1.0);
        let current_bass = bass_sum / count;
        let current_mid = mid_sum / count;
        let current_treb = treb_sum / count;

        // Apply smoothing (e.g., 0.8 old + 0.2 new)
        let alpha = 0.2;
        self.bass = self.bass * (1.0 - alpha) + current_bass * alpha;
        self.mid = self.mid * (1.0 - alpha) + current_mid * alpha;
        self.treb = self.treb * (1.0 - alpha) + current_treb * alpha;

        // Advance time (approx 60fps)
        self.time += 0.016;

        self.mashup_controller.update();

        // Generate geometry based on active preset(s)
        if let Some(next_preset) = self.mashup_controller.next_preset {
            // Transitioning (Lerp)
            let t = self.mashup_controller.transition_progress;
            // Easing function (smoothstep-like)
            let t_eased = t * t * (3.0 - 2.0 * t);
            
            for i in 0..NUM_VERTICES {
                let p1 = self.calculate_vertex(i, self.mashup_controller.current_preset);
                let p2 = self.calculate_vertex(i, next_preset);
                
                let idx = i * 3;
                self.geometry_buffer[idx] = p1.0 + (p2.0 - p1.0) * t_eased;
                self.geometry_buffer[idx + 1] = p1.1 + (p2.1 - p1.1) * t_eased;
                self.geometry_buffer[idx + 2] = p1.2 + (p2.2 - p1.2) * t_eased;
            }
        } else {
            // Static preset
            for i in 0..NUM_VERTICES {
                let p = self.calculate_vertex(i, self.mashup_controller.current_preset);
                let idx = i * 3;
                self.geometry_buffer[idx] = p.0;
                self.geometry_buffer[idx + 1] = p.1;
                self.geometry_buffer[idx + 2] = p.2;
            }
        }
    }

    fn calculate_vertex(&self, index: usize, preset: Preset) -> (f32, f32, f32) {
        let f_index = index as f32;
        let n = NUM_VERTICES as f32;
        let phi = std::f32::consts::PI * (3.0 - (5.0f32).sqrt()); // golden angle

        match preset {
            Preset::VectorSphere => {
                // Fibonacci sphere
                let y = 1.0 - (f_index / (n - 1.0)) * 2.0; // y goes from 1 to -1
                let radius_at_y = (1.0 - y * y).sqrt();
                let theta = phi * f_index;

                let x = theta.cos() * radius_at_y;
                let z = theta.sin() * radius_at_y;

                // Mutate radius with bass
                let r = 2.0 + (self.bass * 2.0) + (self.time * 2.0 + y * 10.0).sin() * 0.1;
                
                (x * r, y * r, z * r)
            },
            Preset::MutantTorus => {
                // Torus knot-like structure
                let u = (f_index / n) * std::f32::consts::PI * 2.0;
                let v = (f_index / n) * std::f32::consts::PI * 20.0; // Wrapping

                let r_main = 2.0 + (self.mid * 1.5).sin();
                let r_tube = 0.5 + (self.treb * 1.0);

                // Twist based on time and audio
                let twist = self.time * 0.5 + (self.mid * std::f32::consts::PI);
                let x = (r_main + r_tube * v.cos()) * (u + twist).cos();
                let y = (r_main + r_tube * v.cos()) * (u + twist).sin();
                let z = r_tube * v.sin() + (self.time * 3.0 + u * 5.0).sin() * (self.bass * 0.5);

                (x, y, z)
            }
        }
    }

    /// Returns a raw pointer to the calculated 3D geometry buffer.
    /// JS will read a Float32Array of length NUM_VERTICES * 3.
    pub fn get_geometry_ptr(&self) -> *const f32 {
        self.geometry_buffer.as_ptr()
    }

    /// Returns the length of the geometry buffer in floats (NUM_VERTICES * 3).
    pub fn get_geometry_len(&self) -> usize {
        self.geometry_buffer.len()
    }

    /// Returns a raw pointer to the processed data buffer.
    /// JavaScript reads this pointer to create a Float32Array view
    /// directly into WASM linear memory (zero-copy read).
    pub fn get_processed_data_ptr(&self) -> *const f32 {
        self.processed_data.as_ptr()
    }

    /// Returns the length of the processed data buffer.
    pub fn get_processed_data_len(&self) -> usize {
        self.processed_data.len()
    }
}
