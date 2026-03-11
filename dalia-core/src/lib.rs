use wasm_bindgen::prelude::*;

/// The core audio processing engine for Dalia.
/// Receives raw frequency data from JavaScript and processes it
/// into normalized float data accessible via shared WASM memory.
#[wasm_bindgen]
pub struct DaliaEngine {
    /// Internal buffer holding processed audio data (normalized 0.0–1.0)
    processed_data: Vec<f32>,
}

#[wasm_bindgen]
impl DaliaEngine {
    /// Creates a new DaliaEngine instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> DaliaEngine {
        DaliaEngine {
            processed_data: Vec::new(),
        }
    }

    /// Receives raw byte frequency data from the Web Audio API's AnalyserNode
    /// (values 0–255) and normalizes each sample to a f32 in the range [0.0, 1.0].
    ///
    /// This is the zero-copy entry point: JS passes a &[u8] view directly
    /// into WASM linear memory — no JSON, no serde.
    pub fn process_audio(&mut self, frequency_data: &[u8]) {
        // Resize buffer only if necessary
        if self.processed_data.len() != frequency_data.len() {
            self.processed_data.resize(frequency_data.len(), 0.0);
        }

        // Normalize each byte (0–255) to a float (0.0–1.0)
        for (i, &byte) in frequency_data.iter().enumerate() {
            self.processed_data[i] = byte as f32 / 255.0;
        }
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
