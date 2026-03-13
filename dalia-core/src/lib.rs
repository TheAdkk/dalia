use wasm_bindgen::prelude::*;

/// The core audio processing engine for Dalia.
/// Receives raw frequency data from JavaScript and processes it
/// into normalized float data accessible via shared WASM memory.
#[wasm_bindgen]
pub struct DaliaEngine {
    /// Internal buffer holding processed audio data (normalized 0.0–1.0)
    processed_data: Vec<f32>,
    /// Contiguous array for uniforms: [bass, mid, treb, zoom, rot, warp]
    uniforms: [f32; 6],
}

#[wasm_bindgen]
impl DaliaEngine {
    /// Creates a new DaliaEngine instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> DaliaEngine {
        DaliaEngine {
            processed_data: Vec::new(),
            uniforms: [0.0; 6],
        }
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
        let bass = self.uniforms[0] * (1.0 - alpha) + current_bass * alpha;
        let mid = self.uniforms[1] * (1.0 - alpha) + current_mid * alpha;
        let treb = self.uniforms[2] * (1.0 - alpha) + current_treb * alpha;

        // Calculate transformation variables
        let zoom = 1.0 + (bass * 0.05);
        let rot = treb * 0.01;
        let warp = mid * 0.02;

        self.uniforms = [bass, mid, treb, zoom, rot, warp];
    }

    /// Returns a raw pointer to the calculated uniforms buffer.
    /// JS will read a Float32Array of length 6.
    pub fn get_shader_uniforms_ptr(&self) -> *const f32 {
        self.uniforms.as_ptr()
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
