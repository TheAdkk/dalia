use std::f32::consts::TAU;

const HISTORY_SECONDS: f32 = 6.0;
const ASSUMED_FPS: f32 = 60.0;
const HISTORY_CAPACITY: usize = (HISTORY_SECONDS * ASSUMED_FPS) as usize;
const BPM_MIN: f32 = 70.0;
const BPM_MAX: f32 = 190.0;
const LOOKAHEAD_SAMPLE_STEPS: usize = 12;
const MIN_ANALYSIS_SECONDS: f32 = 2.0;

#[derive(Clone, Copy, Debug, Default)]
struct AudioFrame {
    energy: f32,
    transient: f32,
    flux: f32,
    onset: f32,
    low_band: f32,
}

#[derive(Clone, Copy, Debug, Default)]
struct LookaheadFrame {
    energy: f32,
    transient: f32,
    low_band: f32,
}

#[derive(Clone, Debug)]
pub struct AudioState {
    pub sub_bass:   f32,  // 0-60 Hz
    pub bass:       f32,  // 60-250 Hz
    pub low_mid:    f32,  // 250-500 Hz
    pub mid:        f32,  // 500-2k Hz
    pub upper_mid:  f32,  // 2k-4k Hz
    pub presence:   f32,  // 4k-6k Hz
    pub treb:       f32,  // 6k-12k Hz
    pub air:        f32,  // 12k-20k Hz
    pub energy:     f32,
    pub chroma:     [f32; 12],
    chroma_confidence: f32,
    harmonic_hue: f32,
    spectral_flux: f32,
    transient: f32,
    energy_fast: f32,
    energy_slow: f32,
    history: Vec<AudioFrame>,
    history_cursor: usize,
    history_len: usize,
    lookahead_timeline: Vec<LookaheadFrame>,
    lookahead_timeline_fps: f32,
    prev_spectrum: Vec<f32>,
    elapsed_seconds: f32,
    bpm: f32,
    bpm_confidence: f32,
    beat_phase: f32,
}

impl Default for AudioState {
    fn default() -> Self {
        Self {
            sub_bass: 0.0,
            bass: 0.0,
            low_mid: 0.0,
            mid: 0.0,
            upper_mid: 0.0,
            presence: 0.0,
            treb: 0.0,
            air: 0.0,
            energy: 0.0,
            chroma: [0.0; 12],
            chroma_confidence: 0.0,
            harmonic_hue: 0.0,
            spectral_flux: 0.0,
            transient: 0.0,
            energy_fast: 0.0,
            energy_slow: 0.0,
            history: vec![AudioFrame::default(); HISTORY_CAPACITY],
            history_cursor: 0,
            history_len: 0,
            lookahead_timeline: Vec::new(),
            lookahead_timeline_fps: 0.0,
            prev_spectrum: Vec::new(),
            elapsed_seconds: 0.0,
            bpm: 120.0,
            bpm_confidence: 0.0,
            beat_phase: 0.0,
        }
    }
}

impl AudioState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn harmonic_hue(&self) -> f32 {
        self.harmonic_hue
    }

    pub fn harmonic_confidence(&self) -> f32 {
        self.chroma_confidence
    }

    pub fn detected_bpm(&self) -> f32 {
        self.bpm
    }

    pub fn bpm_confidence(&self) -> f32 {
        self.bpm_confidence
    }

    pub fn beat_phase(&self) -> f32 {
        self.beat_phase
    }

    pub fn spectral_flux_gate(&self) -> f32 {
        ((self.spectral_flux - 0.005) / 0.04).clamp(0.0, 1.0)
    }

    pub fn transient_strength(&self) -> f32 {
        let flux_gate = self.spectral_flux_gate();
        (self.transient * 2.1 + flux_gate * 0.9 + self.sub_bass * 0.35).clamp(0.0, 1.0)
    }

    pub fn analysis_readiness(&self) -> f32 {
        let target_frames = (ASSUMED_FPS * MIN_ANALYSIS_SECONDS).round() as usize;
        if target_frames == 0 {
            return 1.0;
        }
        (self.history_len as f32 / target_frames as f32).clamp(0.0, 1.0)
    }

    pub fn low_band_energy(&self) -> f32 {
        (self.sub_bass * 0.58 + self.bass * 0.42).clamp(0.0, 1.0)
    }

    pub fn set_lookahead_timeline(
        &mut self,
        energy_timeline: &[f32],
        transient_timeline: &[f32],
        low_band_timeline: &[f32],
        fps: f32,
    ) -> bool {
        self.clear_lookahead_timeline();

        if !fps.is_finite() || fps <= 0.0 {
            return false;
        }

        let len = energy_timeline
            .len()
            .min(transient_timeline.len())
            .min(low_band_timeline.len());

        if len == 0 {
            return false;
        }

        self.lookahead_timeline.reserve(len);
        for i in 0..len {
            let sanitize = |value: f32| {
                if value.is_finite() {
                    value.clamp(0.0, 1.0)
                } else {
                    0.0
                }
            };

            self.lookahead_timeline.push(LookaheadFrame {
                energy: sanitize(energy_timeline[i]),
                transient: sanitize(transient_timeline[i]),
                low_band: sanitize(low_band_timeline[i]),
            });
        }

        self.lookahead_timeline_fps = fps;
        true
    }

    pub fn clear_lookahead_timeline(&mut self) {
        self.lookahead_timeline.clear();
        self.lookahead_timeline_fps = 0.0;
    }

    pub fn has_lookahead_timeline(&self) -> bool {
        !self.lookahead_timeline.is_empty() && self.lookahead_timeline_fps > 0.0
    }

    pub fn future_energy_mean_at(&self, current_time_seconds: f32, horizon_seconds: f32) -> f32 {
        if !self.has_lookahead_timeline() {
            return self.future_energy_mean(horizon_seconds);
        }

        if horizon_seconds <= 0.0 {
            return self
                .lookahead_sample_at(current_time_seconds)
                .map(|frame| frame.energy)
                .unwrap_or(self.energy);
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let mut sum = 0.0_f32;
        let mut count = 0.0_f32;

        for step in 0..=LOOKAHEAD_SAMPLE_STEPS {
            let t = current_time_seconds + horizon * step as f32 / LOOKAHEAD_SAMPLE_STEPS as f32;
            if let Some(frame) = self.lookahead_sample_at(t) {
                sum += frame.energy;
                count += 1.0;
            }
        }

        if count <= 0.0 {
            self.future_energy_mean(horizon_seconds)
        } else {
            (sum / count).clamp(0.0, 1.0)
        }
    }

    pub fn future_transient_peak_at(&self, current_time_seconds: f32, horizon_seconds: f32) -> f32 {
        if !self.has_lookahead_timeline() {
            return self.future_transient_peak(horizon_seconds);
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let mut recent_peak = 0.0_f32;
        let recent_window = ((ASSUMED_FPS * 0.8).round() as usize).max(1);

        for i in 0..recent_window {
            let t = (current_time_seconds - i as f32 / ASSUMED_FPS).max(0.0);
            if let Some(frame) = self.lookahead_sample_at(t) {
                recent_peak = recent_peak.max(frame.transient);
            }
        }

        let mut future_peak = 0.0_f32;
        let mut prev_energy = self
            .lookahead_sample_at(current_time_seconds)
            .map(|frame| frame.energy)
            .unwrap_or(self.energy);

        for step in 1..=LOOKAHEAD_SAMPLE_STEPS {
            let t = current_time_seconds + horizon * step as f32 / LOOKAHEAD_SAMPLE_STEPS as f32;
            if let Some(frame) = self.lookahead_sample_at(t) {
                let derivative = (frame.energy - prev_energy).max(0.0);
                let candidate = (frame.transient * 0.86 + derivative * 1.14).clamp(0.0, 1.0);
                future_peak = future_peak.max(candidate);
                prev_energy = frame.energy;
            }
        }

        recent_peak.max(future_peak).clamp(0.0, 1.0)
    }

    pub fn future_bass_sustain_ratio_at(
        &self,
        current_time_seconds: f32,
        horizon_seconds: f32,
        threshold: f32,
    ) -> f32 {
        if !self.has_lookahead_timeline() {
            return self.future_bass_sustain_ratio(horizon_seconds, threshold);
        }

        let threshold = threshold.clamp(0.0, 1.0);
        if horizon_seconds <= 0.0 {
            return self
                .lookahead_sample_at(current_time_seconds)
                .map(|frame| if frame.low_band >= threshold { 1.0 } else { 0.0 })
                .unwrap_or(0.0);
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let mut hits = 0.0_f32;
        let mut count = 0.0_f32;

        for step in 1..=LOOKAHEAD_SAMPLE_STEPS {
            let t = current_time_seconds + horizon * step as f32 / LOOKAHEAD_SAMPLE_STEPS as f32;
            if let Some(frame) = self.lookahead_sample_at(t) {
                if frame.low_band >= threshold {
                    hits += 1.0;
                }
                count += 1.0;
            }
        }

        if count <= 0.0 {
            0.0
        } else {
            (hits / count).clamp(0.0, 1.0)
        }
    }

    pub fn should_hold_for_sustained_bass_at(
        &self,
        current_time_seconds: f32,
        horizon_seconds: f32,
        threshold: f32,
        min_ratio: f32,
    ) -> bool {
        if !self.has_lookahead_timeline() {
            return self.should_hold_for_sustained_bass(horizon_seconds, threshold, min_ratio);
        }

        let threshold = threshold.clamp(0.0, 1.0);
        let min_ratio = min_ratio.clamp(0.0, 1.0);
        let sustain_ratio = self.future_bass_sustain_ratio_at(current_time_seconds, horizon_seconds, threshold);
        let current_low_band = self
            .lookahead_sample_at(current_time_seconds)
            .map(|frame| frame.low_band)
            .unwrap_or(0.0);

        sustain_ratio >= min_ratio && current_low_band >= threshold * 0.82
    }

    pub fn buffered_energy_mean(&self) -> f32 {
        if self.history_len == 0 {
            return self.energy;
        }

        let mut sum = 0.0;
        for i in 0..self.history_len {
            sum += self.frame_from_end(i).energy;
        }
        sum / self.history_len as f32
    }

    pub fn predicted_energy(&self, horizon_seconds: f32) -> f32 {
        if self.history_len < 4 {
            return self.energy;
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let frames_ahead = (horizon * ASSUMED_FPS).round() as usize;

        let latest = self.frame_from_end(0);
        let lookback = (ASSUMED_FPS * 0.8).round() as usize;
        let back = lookback.min(self.history_len.saturating_sub(1)).max(1);
        let past = self.frame_from_end(back);

        let slope = (latest.energy - past.energy) / back as f32;

        let transient_window = ((ASSUMED_FPS * 1.2).round() as usize)
            .min(self.history_len)
            .max(1);
        let mut transient_sum = 0.0;
        let mut flux_sum = 0.0;
        for i in 0..transient_window {
            let frame = self.frame_from_end(i);
            transient_sum += frame.transient;
            flux_sum += frame.flux;
        }
        let transient_mean = transient_sum / transient_window as f32;
        let flux_mean = flux_sum / transient_window as f32;

        let mut predicted = latest.energy + slope * frames_ahead as f32 * 0.7 + flux_mean * 0.08;

        if self.bpm_confidence > 0.25 {
            let beat_interval = 60.0 / self.bpm.max(1.0);
            let future_phase = ((self.elapsed_seconds + horizon) / beat_interval).fract();
            let beat_wave = (future_phase * TAU).sin().max(0.0);
            predicted += (beat_wave - 0.3) * transient_mean * 0.45 * self.bpm_confidence;
        }

        predicted.clamp(0.0, 1.0)
    }

    pub fn predicted_low_band(&self, horizon_seconds: f32) -> f32 {
        if self.history_len < 4 {
            return self.low_band_energy();
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let frames_ahead = (horizon * ASSUMED_FPS).round() as usize;

        let latest = self.frame_from_end(0).low_band;
        let lookback = (ASSUMED_FPS * 0.9).round() as usize;
        let back = lookback.min(self.history_len.saturating_sub(1)).max(1);
        let past = self.frame_from_end(back).low_band;
        let slope = (latest - past) / back as f32;

        let trend_lift = (self.predicted_energy(horizon) - self.energy).max(-0.3);
        let predicted =
            latest + slope * frames_ahead as f32 * 0.75 + trend_lift * 0.22 + self.transient * 0.08;

        predicted.clamp(0.0, 1.0)
    }

    pub fn future_energy_mean(&self, horizon_seconds: f32) -> f32 {
        if horizon_seconds <= 0.0 {
            return self.energy;
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let mut sum = self.energy;
        let mut count = 1.0;

        for step in 1..=LOOKAHEAD_SAMPLE_STEPS {
            let t = horizon * step as f32 / LOOKAHEAD_SAMPLE_STEPS as f32;
            sum += self.predicted_energy(t);
            count += 1.0;
        }

        (sum / count).clamp(0.0, 1.0)
    }

    pub fn future_transient_peak(&self, horizon_seconds: f32) -> f32 {
        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let recent_window = ((ASSUMED_FPS * 0.8).round() as usize)
            .min(self.history_len)
            .max(1);

        let mut recent_peak = 0.0_f32;
        for i in 0..recent_window {
            recent_peak = recent_peak.max(self.frame_from_end(i).onset);
        }

        let mut future_peak = 0.0_f32;
        let mut prev_energy = self.energy;
        for step in 1..=LOOKAHEAD_SAMPLE_STEPS {
            let t = horizon * step as f32 / LOOKAHEAD_SAMPLE_STEPS as f32;
            let energy = self.predicted_energy(t);
            let derivative = (energy - prev_energy).max(0.0);
            let candidate =
                (derivative * 3.4 + self.transient * 1.1 + self.spectral_flux_gate() * 0.7).clamp(0.0, 1.0);
            future_peak = future_peak.max(candidate);
            prev_energy = energy;
        }

        recent_peak.max(future_peak * 0.92).clamp(0.0, 1.0)
    }

    pub fn future_bass_sustain_ratio(&self, horizon_seconds: f32, threshold: f32) -> f32 {
        let threshold = threshold.clamp(0.0, 1.0);
        if horizon_seconds <= 0.0 {
            return if self.low_band_energy() >= threshold { 1.0 } else { 0.0 };
        }

        let horizon = horizon_seconds.clamp(0.0, HISTORY_SECONDS);
        let mut hits = 0.0_f32;
        for step in 1..=LOOKAHEAD_SAMPLE_STEPS {
            let t = horizon * step as f32 / LOOKAHEAD_SAMPLE_STEPS as f32;
            if self.predicted_low_band(t) >= threshold {
                hits += 1.0;
            }
        }

        (hits / LOOKAHEAD_SAMPLE_STEPS as f32).clamp(0.0, 1.0)
    }

    pub fn should_hold_for_sustained_bass(
        &self,
        horizon_seconds: f32,
        threshold: f32,
        min_ratio: f32,
    ) -> bool {
        if self.analysis_readiness() < 0.22 {
            return false;
        }

        let threshold = threshold.clamp(0.0, 1.0);
        let min_ratio = min_ratio.clamp(0.0, 1.0);
        let sustain_ratio = self.future_bass_sustain_ratio(horizon_seconds, threshold);

        sustain_ratio >= min_ratio && self.low_band_energy() >= threshold * 0.82
    }

    pub fn process_audio(&mut self, frequency_data: &[u8], processed_data: &mut Vec<f32>, hz_per_bin: f32) {
        let len = frequency_data.len();
        if len == 0 {
            return;
        }

        if processed_data.len() != len {
            processed_data.resize(len, 0.0);
        }

        let mut energy_sum = 0.0_f32;
        for (i, &byte) in frequency_data.iter().enumerate() {
            let v = byte as f32 / 255.0;
            processed_data[i] = v;
            energy_sum += v * v;
        }
        let rms = (energy_sum / len as f32).sqrt();

        let band_ranges: [(usize, usize); 8] = [
            (0,   3),
            (3,   12),
            (12,  23),
            (23,  93),
            (93,  186),
            (186, 279),
            (279, 558),
            (558, len.min(930)),
        ];

        let mut band_vals = [0.0_f32; 8];
        for (b, &(lo, hi)) in band_ranges.iter().enumerate() {
            let hi = hi.min(len);
            if lo >= hi {
                band_vals[b] = 0.0;
                continue;
            }

            let mut sum = 0.0_f32;
            for i in lo..hi {
                sum += processed_data[i];
            }
            band_vals[b] = sum / (hi - lo) as f32;
        }

        fn smooth(old: f32, new: f32) -> f32 {
            if new > old {
                old * 0.5 + new * 0.5
            } else {
                old * 0.92 + new * 0.08
            }
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

        self.energy_fast += (self.energy - self.energy_fast) * 0.22;
        self.energy_slow += (self.energy - self.energy_slow) * 0.05;
        self.transient = (self.energy_fast - self.energy_slow).max(0.0);

        let mut flux = 0.0_f32;
        if self.prev_spectrum.len() == len {
            for (old, &current) in self.prev_spectrum.iter_mut().zip(processed_data.iter()) {
                let delta = (current - *old).max(0.0);
                flux += delta;
                *old = current;
            }
            flux /= len as f32;
        } else {
            self.prev_spectrum.clear();
            self.prev_spectrum.extend_from_slice(processed_data);
        }
        self.spectral_flux += (flux - self.spectral_flux) * 0.35;

        // Generacion de chromagram para tono armonico
        if hz_per_bin > 0.0 {
            let mut new_chroma = [0.0_f32; 12];
            let mut total_chroma = 0.0_f32;

            for (i, &mag) in processed_data.iter().enumerate().skip(1) {
                let f = i as f32 * hz_per_bin;
                if f >= 27.5 && f <= 4186.0 {
                    let pitch = 69.0 + 12.0 * (f / 440.0).log2();
                    let pitch_class = (pitch.round() as i32).rem_euclid(12) as usize;
                    new_chroma[pitch_class] += mag;
                    total_chroma += mag;
                }
            }

            if total_chroma > 0.0 {
                for c in 0..12 {
                    self.chroma[c] = self.chroma[c] * 0.82 + (new_chroma[c] / total_chroma) * 0.18;
                }
            }
            self.update_harmonic_hue();
        }

        self.elapsed_seconds += 1.0 / ASSUMED_FPS;

        let onset = self.transient_strength();
        let low_band = self.low_band_energy();

        self.push_frame(AudioFrame {
            energy: self.energy,
            transient: self.transient,
            flux: self.spectral_flux,
            onset,
            low_band,
        });

        self.update_bpm_estimate();
    }

    fn push_frame(&mut self, frame: AudioFrame) {
        self.history[self.history_cursor] = frame;
        self.history_cursor = (self.history_cursor + 1) % self.history.len();
        self.history_len = (self.history_len + 1).min(self.history.len());
    }

    fn frame_from_end(&self, back: usize) -> AudioFrame {
        let cap = self.history.len();
        let idx = (self.history_cursor + cap - 1 - (back % cap)) % cap;
        self.history[idx]
    }

    fn lookahead_sample_at(&self, time_seconds: f32) -> Option<LookaheadFrame> {
        if !self.has_lookahead_timeline() {
            return None;
        }

        let max_index = self.lookahead_timeline.len().saturating_sub(1);
        if max_index == 0 {
            return self.lookahead_timeline.first().copied();
        }

        let t = if time_seconds.is_finite() {
            time_seconds.max(0.0)
        } else {
            0.0
        };
        let frame_position = (t * self.lookahead_timeline_fps).clamp(0.0, max_index as f32);
        let idx_a = frame_position.floor() as usize;
        let idx_b = (idx_a + 1).min(max_index);
        let frac = frame_position - idx_a as f32;

        let frame_a = self.lookahead_timeline[idx_a];
        let frame_b = self.lookahead_timeline[idx_b];

        Some(LookaheadFrame {
            energy: frame_a.energy + (frame_b.energy - frame_a.energy) * frac,
            transient: frame_a.transient + (frame_b.transient - frame_a.transient) * frac,
            low_band: frame_a.low_band + (frame_b.low_band - frame_a.low_band) * frac,
        })
    }

    fn update_harmonic_hue(&mut self) {
        let mut x = 0.0_f32;
        let mut y = 0.0_f32;
        let mut weight_sum = 0.0_f32;

        for (i, value) in self.chroma.iter().enumerate() {
            let angle = (i as f32 / 12.0) * TAU;
            x += *value * angle.cos();
            y += *value * angle.sin();
            weight_sum += *value;
        }

        if weight_sum <= 1e-5 {
            return;
        }

        let raw_hue = (y.atan2(x) / TAU).rem_euclid(1.0);
        let raw_confidence = ((x * x + y * y).sqrt() / weight_sum).clamp(0.0, 1.0);

        self.chroma_confidence += (raw_confidence - self.chroma_confidence) * 0.2;

        let alpha = 0.06 + self.chroma_confidence * 0.24;
        let delta = ((raw_hue - self.harmonic_hue + 0.5).rem_euclid(1.0)) - 0.5;
        self.harmonic_hue = (self.harmonic_hue + delta * alpha).rem_euclid(1.0);
    }

    fn update_bpm_estimate(&mut self) {
        let window = self.history_len.min((ASSUMED_FPS * 4.0) as usize);
        if window < 96 {
            return;
        }

        let min_lag = (ASSUMED_FPS * 60.0 / BPM_MAX).round() as usize;
        let max_lag = (ASSUMED_FPS * 60.0 / BPM_MIN).round() as usize;
        if window <= max_lag + 2 {
            return;
        }

        let mut onset_values = Vec::with_capacity(window);
        for back in (0..window).rev() {
            onset_values.push(self.frame_from_end(back).onset);
        }

        let mean = onset_values.iter().sum::<f32>() / window as f32;
        let mut centered = vec![0.0_f32; window];
        for (i, value) in onset_values.iter().enumerate() {
            centered[i] = *value - mean;
        }

        let norm = centered.iter().map(|v| v * v).sum::<f32>().max(1e-6);

        let mut best_lag = min_lag;
        let mut best_score = f32::MIN;
        let mut second_score = f32::MIN;

        for lag in min_lag..=max_lag {
            let mut score = 0.0_f32;
            for i in lag..window {
                score += centered[i] * centered[i - lag];
            }

            if score > best_score {
                second_score = best_score;
                best_score = score;
                best_lag = lag;
            } else if score > second_score {
                second_score = score;
            }
        }

        if best_score > 0.0 {
            let bpm_estimate = 60.0 * ASSUMED_FPS / best_lag as f32;
            let clarity = (best_score / norm).clamp(0.0, 1.0);
            let separation = ((best_score - second_score.max(0.0)) / (best_score + 1e-6)).clamp(0.0, 1.0);
            let confidence_target = (clarity * 0.7 + separation * 0.3).clamp(0.0, 1.0);

            self.bpm_confidence += (confidence_target - self.bpm_confidence) * 0.14;

            let alpha = 0.04 + 0.24 * self.bpm_confidence;
            self.bpm += (bpm_estimate - self.bpm) * alpha;
            self.bpm = self.bpm.clamp(BPM_MIN, BPM_MAX);
        } else {
            self.bpm_confidence *= 0.97;
        }

        let beat_interval = 60.0 / self.bpm.max(1.0);
        self.beat_phase = ((self.elapsed_seconds / beat_interval) % 1.0 + 1.0) % 1.0;
    }
}

#[cfg(test)]
mod tests {
    use super::AudioState;

    fn assert_band_ranges(state: &AudioState) {
        let bands = [
            state.sub_bass,
            state.bass,
            state.low_mid,
            state.mid,
            state.upper_mid,
            state.presence,
            state.treb,
            state.air,
            state.energy,
        ];

        for value in bands {
            assert!(value.is_finite());
            assert!((0.0..=1.0).contains(&value));
        }

        for value in state.chroma {
            assert!(value.is_finite());
            assert!((0.0..=1.0).contains(&value));
        }

        assert!(state.harmonic_hue().is_finite());
        assert!((0.0..=1.0).contains(&state.harmonic_hue()));
        assert!(state.harmonic_confidence().is_finite());
        assert!((0.0..=1.0).contains(&state.harmonic_confidence()));
        assert!(state.detected_bpm().is_finite());
        assert!((70.0..=190.0).contains(&state.detected_bpm()));
        assert!(state.bpm_confidence().is_finite());
        assert!((0.0..=1.0).contains(&state.bpm_confidence()));
        assert!(state.predicted_energy(0.6).is_finite());
        assert!((0.0..=1.0).contains(&state.predicted_energy(0.6)));
        assert!(state.predicted_energy(6.0).is_finite());
        assert!((0.0..=1.0).contains(&state.predicted_energy(6.0)));
        assert!(state.spectral_flux_gate().is_finite());
        assert!((0.0..=1.0).contains(&state.spectral_flux_gate()));
        assert!(state.transient_strength().is_finite());
        assert!((0.0..=1.0).contains(&state.transient_strength()));
        assert!(state.analysis_readiness().is_finite());
        assert!((0.0..=1.0).contains(&state.analysis_readiness()));
        assert!(state.low_band_energy().is_finite());
        assert!((0.0..=1.0).contains(&state.low_band_energy()));
        assert!(state.predicted_low_band(2.0).is_finite());
        assert!((0.0..=1.0).contains(&state.predicted_low_band(2.0)));
        assert!(state.future_energy_mean(2.0).is_finite());
        assert!((0.0..=1.0).contains(&state.future_energy_mean(2.0)));
        assert!(state.future_transient_peak(2.0).is_finite());
        assert!((0.0..=1.0).contains(&state.future_transient_peak(2.0)));
        assert!(state.future_bass_sustain_ratio(2.0, 0.5).is_finite());
        assert!((0.0..=1.0).contains(&state.future_bass_sustain_ratio(2.0, 0.5)));
        assert!(state.future_energy_mean_at(0.0, 2.0).is_finite());
        assert!((0.0..=1.0).contains(&state.future_energy_mean_at(0.0, 2.0)));
        assert!(state.future_transient_peak_at(0.0, 2.0).is_finite());
        assert!((0.0..=1.0).contains(&state.future_transient_peak_at(0.0, 2.0)));
        assert!(state.future_bass_sustain_ratio_at(0.0, 2.0, 0.5).is_finite());
        assert!((0.0..=1.0).contains(&state.future_bass_sustain_ratio_at(0.0, 2.0, 0.5)));
    }

    #[test]
    fn empty_audio_input_keeps_default_state() {
        let mut state = AudioState::new();
        let mut processed = Vec::new();

        state.process_audio(&[], &mut processed, 43.0);

        assert!(processed.is_empty());
        assert_eq!(state.energy, 0.0);
        assert!(state.chroma.iter().all(|v| *v == 0.0));
        assert_eq!(state.buffered_energy_mean(), 0.0);
        assert_band_ranges(&state);
    }

    #[test]
    fn process_audio_outputs_finite_and_bounded_values() {
        let mut state = AudioState::new();
        let mut processed = Vec::new();

        let frequency_data: Vec<u8> = (0..1024)
            .map(|i| ((i * 37 + 11) % 255) as u8)
            .collect();

        state.process_audio(&frequency_data, &mut processed, 43.0);

        assert_eq!(processed.len(), frequency_data.len());
        assert!(processed.iter().all(|v| v.is_finite() && (0.0..=1.0).contains(v)));
        assert_band_ranges(&state);

        let chroma_sum: f32 = state.chroma.iter().sum();
        assert!(chroma_sum <= 1.0 + 1e-6);

        let silence = vec![0_u8; 1024];
        state.process_audio(&silence, &mut processed, 43.0);
        assert_band_ranges(&state);
    }

    #[test]
    fn bpm_detector_tracks_regular_pulse_train() {
        let mut state = AudioState::new();
        let mut processed = Vec::new();

        for frame in 0..540 {
            let mut frequency_data = vec![6_u8; 1024];

            if frame % 30 == 0 || frame % 30 == 1 {
                for value in frequency_data.iter_mut().take(32) {
                    *value = 255;
                }
                for value in frequency_data.iter_mut().take(96).skip(32) {
                    *value = 180;
                }
            } else {
                for value in frequency_data.iter_mut().take(32) {
                    *value = 24;
                }
            }

            state.process_audio(&frequency_data, &mut processed, 43.0);
        }

        let bpm = state.detected_bpm();
        assert!((95.0..=145.0).contains(&bpm), "detected bpm out of range: {bpm}");
        assert!(state.bpm_confidence() > 0.12);
    }

    #[test]
    fn sustained_bass_window_triggers_hold_signal() {
        let mut state = AudioState::new();
        let mut processed = Vec::new();

        for _ in 0..300 {
            let mut frequency_data = vec![8_u8; 1024];
            for value in frequency_data.iter_mut().take(48) {
                *value = 235;
            }
            for value in frequency_data.iter_mut().take(120).skip(48) {
                *value = 180;
            }
            state.process_audio(&frequency_data, &mut processed, 43.0);
        }

        let ratio = state.future_bass_sustain_ratio(2.4, 0.55);
        assert!(ratio > 0.45, "bass sustain ratio too low: {ratio}");
        assert!(state.should_hold_for_sustained_bass(2.4, 0.55, 0.5));
    }

    #[test]
    fn absolute_timeline_queries_follow_current_time() {
        let mut state = AudioState::new();

        let energy = [0.12, 0.18, 0.95, 0.22, 0.15];
        let transient = [0.08, 0.12, 0.86, 0.2, 0.12];
        let low_band = [0.38, 0.82, 0.88, 0.84, 0.32];

        assert!(state.set_lookahead_timeline(&energy, &transient, &low_band, 2.0));
        assert!(state.has_lookahead_timeline());

        let mean_energy = state.future_energy_mean_at(0.5, 1.2);
        let transient_peak = state.future_transient_peak_at(0.5, 1.2);
        let sustain_ratio = state.future_bass_sustain_ratio_at(0.5, 1.2, 0.8);

        assert!(mean_energy > 0.22, "absolute mean energy too low: {mean_energy}");
        assert!(transient_peak > 0.62, "absolute transient peak too low: {transient_peak}");
        assert!(sustain_ratio > 0.42, "absolute bass sustain too low: {sustain_ratio}");
        assert!(state.should_hold_for_sustained_bass_at(0.5, 1.2, 0.8, 0.42));

        state.clear_lookahead_timeline();
        assert!(!state.has_lookahead_timeline());
    }
}
