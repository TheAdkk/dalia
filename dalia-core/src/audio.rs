#[derive(Clone, Default, Debug)]
pub struct AudioState {
    pub sub_bass:   f32,  // 0–60 Hz
    pub bass:       f32,  // 60–250 Hz
    pub low_mid:    f32,  // 250–500 Hz
    pub mid:        f32,  // 500–2k Hz
    pub upper_mid:  f32,  // 2k–4k Hz
    pub presence:   f32,  // 4k–6k Hz
    pub treb:       f32,  // 6k–12k Hz
    pub air:        f32,  // 12k–20k Hz
    pub energy:     f32,
    pub chroma:     [f32; 12],
}

impl AudioState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn process_audio(&mut self, frequency_data: &[u8], processed_data: &mut Vec<f32>, hz_per_bin: f32) {
        let len = frequency_data.len();
        if len == 0 { return; }

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
            if lo >= hi { band_vals[b] = 0.0; continue; }
            let mut sum = 0.0_f32;
            for i in lo..hi {
                sum += processed_data[i];
            }
            band_vals[b] = sum / (hi - lo) as f32;
        }

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

        // ─── Generación de Chromagram (Tonalidad Musical) ───
        if hz_per_bin > 0.0 {
            let mut new_chroma = [0.0_f32; 12];
            let mut total_chroma = 0.0_f32;
            
            for (i, &mag) in processed_data.iter().enumerate().skip(1) {
                let f = i as f32 * hz_per_bin;
                if f >= 27.5 && f <= 4186.0 { // Rango Piano A0 -> C8
                    let pitch = 69.0 + 12.0 * (f / 440.0).log2();
                    let pitch_class = (pitch.round() as i32).rem_euclid(12) as usize;
                    new_chroma[pitch_class] += mag;
                    total_chroma += mag;
                }
            }
            // Suavizado en tiempo real (evita parpadeos tonales)
            if total_chroma > 0.0 {
                for c in 0..12 {
                    self.chroma[c] = self.chroma[c] * 0.90 + (new_chroma[c] / total_chroma) * 0.10;
                }
            }
        }
    }
}
