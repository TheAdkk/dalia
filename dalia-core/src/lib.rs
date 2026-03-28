mod presets;
mod audio;
mod mashup;
mod geometry;

use wasm_bindgen::prelude::*;

use audio::AudioState;
use mashup::MashupController;
use geometry::{vertex, BUFFER_SIZE, NUM_VERTICES};

#[wasm_bindgen]
pub struct DaliaEngine {
    processed_data:    Vec<f32>,
    time:              f32,
    geometry_buffer:   Vec<f32>,
    mashup_controller: MashupController,
    audio_state:       AudioState,
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
            audio_state:       AudioState::new(),
        }
    }

    pub fn get_bass(&self)   -> f32 { self.audio_state.bass }
    pub fn get_mid(&self)    -> f32 { self.audio_state.mid }
    pub fn get_treb(&self)   -> f32 { self.audio_state.treb }
    pub fn get_energy(&self) -> f32 { self.audio_state.energy }
    pub fn get_sub_bass(&self) -> f32 { self.audio_state.sub_bass }
    pub fn get_low_mid(&self) -> f32 { self.audio_state.low_mid }
    pub fn get_upper_mid(&self) -> f32 { self.audio_state.upper_mid }
    pub fn get_air(&self)    -> f32 { self.audio_state.air }
    pub fn get_presence(&self) -> f32 { self.audio_state.presence }

    pub fn next_preset(&mut self) {
        let target = self.mashup_controller.current_preset.next();
        self.mashup_controller.start_transition(target);
    }

    pub fn prev_preset(&mut self) {
        let target = self.mashup_controller.current_preset.prev();
        self.mashup_controller.start_transition(target);
    }

    pub fn random_preset(&mut self, target_idx: u32) {
        let target = presets::Preset::from_index(target_idx);
        self.mashup_controller.start_transition(target);
    }

    pub fn current_preset_index(&self) -> u32 {
        self.mashup_controller.current_preset.index()
    }

    pub fn toggle_mashup(&mut self) {
        self.next_preset();
    }

    pub fn process_audio(&mut self, frequency_data: &[u8]) {
        self.audio_state.process_audio(frequency_data, &mut self.processed_data);

        self.time += 0.016;
        self.mashup_controller.update();

        // Generate geometry
        if let Some(next) = self.mashup_controller.next_preset {
            let t = self.mashup_controller.transition_progress;
            let t_e = t * t * (3.0 - 2.0 * t); // smoothstep
            for i in 0..NUM_VERTICES {
                let p1 = vertex(i, self.mashup_controller.current_preset, &self.audio_state, self.time);
                let p2 = vertex(i, next, &self.audio_state, self.time);
                let idx = i * 3;
                self.geometry_buffer[idx]     = p1.0 + (p2.0 - p1.0) * t_e;
                self.geometry_buffer[idx + 1] = p1.1 + (p2.1 - p1.1) * t_e;
                self.geometry_buffer[idx + 2] = p1.2 + (p2.2 - p1.2) * t_e;
            }
        } else {
            let preset = self.mashup_controller.current_preset;
            for i in 0..NUM_VERTICES {
                let p = vertex(i, preset, &self.audio_state, self.time);
                let idx = i * 3;
                self.geometry_buffer[idx]     = p.0;
                self.geometry_buffer[idx + 1] = p.1;
                self.geometry_buffer[idx + 2] = p.2;
            }
        }
    }

    pub fn get_geometry_ptr(&self) -> *const f32 { self.geometry_buffer.as_ptr() }
    pub fn get_geometry_len(&self) -> usize       { self.geometry_buffer.len() }
    pub fn get_processed_data_ptr(&self) -> *const f32 { self.processed_data.as_ptr() }
    pub fn get_processed_data_len(&self) -> usize      { self.processed_data.len() }
}
