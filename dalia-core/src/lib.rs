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
    pub fn get_harmonic_hue(&self) -> f32 { self.audio_state.harmonic_hue() }
    pub fn get_harmonic_confidence(&self) -> f32 { self.audio_state.harmonic_confidence() }
    pub fn get_detected_bpm(&self) -> f32 { self.audio_state.detected_bpm() }
    pub fn get_bpm_confidence(&self) -> f32 { self.audio_state.bpm_confidence() }
    pub fn get_beat_phase(&self) -> f32 { self.audio_state.beat_phase() }
    pub fn set_lookahead_timeline(
        &mut self,
        energy_timeline: &[f32],
        transient_timeline: &[f32],
        low_band_timeline: &[f32],
        fps: f32,
    ) -> bool {
        self.audio_state.set_lookahead_timeline(
            energy_timeline,
            transient_timeline,
            low_band_timeline,
            fps,
        )
    }
    pub fn clear_lookahead_timeline(&mut self) { self.audio_state.clear_lookahead_timeline() }
    pub fn has_lookahead_timeline(&self) -> bool { self.audio_state.has_lookahead_timeline() }
    pub fn get_predicted_energy(&self, horizon_seconds: f32) -> f32 {
        self.audio_state.predicted_energy(horizon_seconds)
    }
    pub fn get_spectral_flux_gate(&self) -> f32 { self.audio_state.spectral_flux_gate() }
    pub fn get_transient_strength(&self) -> f32 { self.audio_state.transient_strength() }
    pub fn get_analysis_readiness(&self) -> f32 { self.audio_state.analysis_readiness() }
    pub fn get_low_band_energy(&self) -> f32 { self.audio_state.low_band_energy() }
    pub fn get_predicted_low_band(&self, horizon_seconds: f32) -> f32 {
        self.audio_state.predicted_low_band(horizon_seconds)
    }
    pub fn get_future_energy_mean(&self, horizon_seconds: f32) -> f32 {
        self.audio_state.future_energy_mean(horizon_seconds)
    }
    pub fn get_future_energy_mean_at(&self, current_time_seconds: f32, horizon_seconds: f32) -> f32 {
        self.audio_state.future_energy_mean_at(current_time_seconds, horizon_seconds)
    }
    pub fn get_future_transient_peak(&self, horizon_seconds: f32) -> f32 {
        self.audio_state.future_transient_peak(horizon_seconds)
    }
    pub fn get_future_transient_peak_at(&self, current_time_seconds: f32, horizon_seconds: f32) -> f32 {
        self.audio_state.future_transient_peak_at(current_time_seconds, horizon_seconds)
    }
    pub fn get_future_bass_sustain_ratio(&self, horizon_seconds: f32, threshold: f32) -> f32 {
        self.audio_state.future_bass_sustain_ratio(horizon_seconds, threshold)
    }
    pub fn get_future_bass_sustain_ratio_at(
        &self,
        current_time_seconds: f32,
        horizon_seconds: f32,
        threshold: f32,
    ) -> f32 {
        self.audio_state
            .future_bass_sustain_ratio_at(current_time_seconds, horizon_seconds, threshold)
    }
    pub fn should_hold_for_sustained_bass(&self, horizon_seconds: f32, threshold: f32, min_ratio: f32) -> bool {
        self.audio_state.should_hold_for_sustained_bass(horizon_seconds, threshold, min_ratio)
    }
    pub fn should_hold_for_sustained_bass_at(
        &self,
        current_time_seconds: f32,
        horizon_seconds: f32,
        threshold: f32,
        min_ratio: f32,
    ) -> bool {
        self.audio_state
            .should_hold_for_sustained_bass_at(current_time_seconds, horizon_seconds, threshold, min_ratio)
    }
    pub fn get_buffered_energy_mean(&self) -> f32 { self.audio_state.buffered_energy_mean() }
    
    // Obtiene el tono logarítmico (0.0..1.0) para mapeo a HSL directo basado en el acorde más ruidoso
    pub fn get_chroma_base(&self) -> f32 {
        let mut max_val = 0.0;
        let mut max_idx = 0;
        for (i, &v) in self.audio_state.chroma.iter().enumerate() {
            if v > max_val {
                max_val = v;
                max_idx = i;
            }
        }
        max_idx as f32 / 12.0
    }

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

    pub fn process_audio(&mut self, frequency_data: &[u8], hz_per_bin: f32, delta_time: f32) {
        self.audio_state.process_audio(
            frequency_data,
            &mut self.processed_data,
            hz_per_bin,
            delta_time,
        );

        self.time += delta_time;
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
