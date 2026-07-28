use crate::audio::AudioState;
use crate::geometry::NUM_VERTICES;
use crate::presets::Preset;

pub const COLOR_BUFFER_SIZE: usize = NUM_VERTICES * 3;

// Per-preset palette hint: (hue_offset, hue_spread, saturation_boost, lightness_boost).
// Only the 5 psychedelic presets diverge from the harmonic-hue rainbow baseline.
fn palette(preset: Preset) -> (f32, f32, f32, f32) {
    match preset {
        Preset::Peyote     => (0.95, 1.00, 0.18, 0.05),  // hot magenta→yellow rainbow
        Preset::Hyperspace => (0.36, 0.85, 0.22, 0.08),  // emerald/magenta/gold triad
        Preset::Mycelia    => (0.08, 0.45, -0.08, -0.02), // warm ochre→violet
        Preset::Recursion  => (0.55, 0.95, 0.20, 0.04),  // cyan→magenta cycle
        Preset::KHole      => (0.62, 0.30, -0.30, -0.12), // desaturated blue-black + neon
        _                  => (0.0, 1.0, 0.0, 0.0),
    }
}

pub(crate) fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    let h = h.rem_euclid(1.0);
    let s = s.clamp(0.0, 1.0);
    let l = l.clamp(0.0, 1.0);

    if s <= 0.0 {
        return (l, l, l);
    }

    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;

    let hk = |mut t: f32| {
        if t < 0.0 { t += 1.0; }
        if t > 1.0 { t -= 1.0; }
        if t < 1.0 / 6.0 { p + (q - p) * 6.0 * t }
        else if t < 0.5 { q }
        else if t < 2.0 / 3.0 { p + (q - p) * (2.0 / 3.0 - t) * 6.0 }
        else { p }
    };

    (hk(h + 1.0 / 3.0), hk(h), hk(h - 1.0 / 3.0))
}

pub fn vertex_color(
    index: usize,
    preset: Preset,
    audio: &AudioState,
    time: f32,
) -> (f32, f32, f32) {
    let bin = index % 12;
    let chroma_intensity = audio.chroma[bin]; // 0..~0.5 typically
    let chroma_norm = (chroma_intensity * 6.0).clamp(0.0, 1.0);

    // Erdős Lattice: lattice nodes glow white-hot; edge sparks are hued by the
    // song's harmonic root. The graph reads as a crystalline structure.
    if matches!(preset, Preset::ErdosLattice) {
        let node_count = crate::unit_lattice::node_count();
        if index < node_count {
            return hsl_to_rgb(audio.harmonic_hue(), 0.25, 0.82 + audio.energy * 0.1);
        }
        let hue = audio.harmonic_hue() + 0.5 + (time * 0.05).sin() * 0.04;
        return hsl_to_rgb(hue, 0.92, 0.5 + audio.treb * 0.18);
    }

    let (hue_off, hue_spread, sat_boost, light_boost) = palette(preset);

    // Base hue: song's harmonic root + per-bin offset modulated by palette spread.
    let bin_offset = (bin as f32 / 12.0) * hue_spread;
    let mut hue = audio.harmonic_hue() + bin_offset + hue_off;

    // K-Hole: rare neon accent on transients only — most points stay dark.
    if matches!(preset, Preset::KHole) {
        let seed = ((index as f32 * 5.17).sin() * 113.9).fract();
        let is_accent = seed > 0.93;
        let lightness = if is_accent {
            0.45 + audio.transient_strength() * 0.35
        } else {
            0.06 + audio.energy * 0.05
        };
        let sat = if is_accent { 0.95 } else { 0.18 };
        // Accents get a neon shift toward cyan/magenta driven by harmonic hue.
        let accent_hue = hue + (time * 0.03).sin() * 0.05;
        return hsl_to_rgb(accent_hue, sat, lightness);
    }

    // Subtle temporal drift to keep colors alive even on stable tonality.
    hue += (time * 0.04 + (bin as f32) * 0.13).sin() * 0.015;

    let saturation = (0.82 + chroma_norm * 0.18 + sat_boost).clamp(0.45, 1.0);
    let conf = audio.harmonic_confidence();
    let lightness = (0.48 + audio.energy * 0.16 + conf * 0.05 + light_boost).clamp(0.22, 0.74);

    hsl_to_rgb(hue, saturation, lightness)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rstest::rstest;

    fn audio_silent() -> AudioState {
        AudioState::new()
    }

    fn audio_energetic() -> AudioState {
        let mut a = AudioState::new();
        a.sub_bass = 0.6;
        a.bass = 0.7;
        a.low_mid = 0.4;
        a.mid = 0.5;
        a.upper_mid = 0.4;
        a.presence = 0.35;
        a.treb = 0.55;
        a.air = 0.3;
        a.energy = 0.62;
        a.chroma = [0.0; 12];
        a.chroma[0] = 0.6; // strong root
        a.chroma[7] = 0.4; // strong fifth
        a
    }

    fn audio_atonal() -> AudioState {
        let mut a = AudioState::new();
        a.energy = 0.4;
        a.chroma = [0.08; 12]; // flat distribution
        a
    }

    // ----- hsl_to_rgb ------------------------------------------------------

    #[rstest]
    #[case::pure_red(0.0, 1.0, 0.5, 1.0, 0.0, 0.0)]
    #[case::pure_green(1.0 / 3.0, 1.0, 0.5, 0.0, 1.0, 0.0)]
    #[case::pure_blue(2.0 / 3.0, 1.0, 0.5, 0.0, 0.0, 1.0)]
    #[case::white(0.0, 0.0, 1.0, 1.0, 1.0, 1.0)]
    #[case::black(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)]
    #[case::mid_grey(0.0, 0.0, 0.5, 0.5, 0.5, 0.5)]
    fn hsl_to_rgb_matches_known_colors(
        #[case] h: f32,
        #[case] s: f32,
        #[case] l: f32,
        #[case] er: f32,
        #[case] eg: f32,
        #[case] eb: f32,
    ) {
        let (r, g, b) = hsl_to_rgb(h, s, l);
        let eps = 1e-3;
        assert!((r - er).abs() < eps, "r mismatch: {} vs {}", r, er);
        assert!((g - eg).abs() < eps, "g mismatch: {} vs {}", g, eg);
        assert!((b - eb).abs() < eps, "b mismatch: {} vs {}", b, eb);
    }

    #[rstest]
    #[case(-2.7, 0.3)]
    #[case(-0.3, 0.7)]
    #[case(0.4, 0.4)]
    #[case(1.7, 0.7)]
    #[case(3.4, 0.4)]
    fn hsl_to_rgb_wraps_hue(#[case] input: f32, #[case] equivalent: f32) {
        let s = 0.8;
        let l = 0.55;
        let (r1, g1, b1) = hsl_to_rgb(input, s, l);
        let (r2, g2, b2) = hsl_to_rgb(equivalent, s, l);
        let eps = 1e-5;
        assert!((r1 - r2).abs() < eps);
        assert!((g1 - g2).abs() < eps);
        assert!((b1 - b2).abs() < eps);
    }

    #[rstest]
    #[case(0.0, 0.0, 0.0)]
    #[case(0.25, 1.0, 0.5)]
    #[case(0.5, 0.5, 0.5)]
    #[case(0.75, 0.8, 0.3)]
    #[case(1.0, 1.0, 1.0)]
    fn hsl_to_rgb_outputs_unit_range(#[case] h: f32, #[case] s: f32, #[case] l: f32) {
        let (r, g, b) = hsl_to_rgb(h, s, l);
        for (label, v) in [("r", r), ("g", g), ("b", b)] {
            assert!(v.is_finite(), "{} not finite for ({}, {}, {})", label, h, s, l);
            assert!((0.0..=1.0).contains(&v), "{} = {} out of [0,1]", label, v);
        }
    }

    // ----- vertex_color ----------------------------------------------------

    #[rstest]
    #[case::silent(audio_silent())]
    #[case::energetic(audio_energetic())]
    #[case::atonal(audio_atonal())]
    fn vertex_color_outputs_unit_range_for_all_presets(#[case] audio: AudioState) {
        let indices = [0_usize, 1, 11, 137, 4096, 11_999];
        let times = [0.0_f32, 1.4, 7.2];

        for preset_idx in 0..crate::presets::PRESET_COUNT {
            let preset = Preset::from_index(preset_idx);
            for &index in &indices {
                for &time in &times {
                    let (r, g, b) = vertex_color(index, preset, &audio, time);
                    assert!(
                        r.is_finite() && g.is_finite() && b.is_finite(),
                        "non-finite color for {:?} at idx={}",
                        preset, index
                    );
                    assert!(
                        (0.0..=1.0).contains(&r)
                            && (0.0..=1.0).contains(&g)
                            && (0.0..=1.0).contains(&b),
                        "color out of [0,1] for {:?}: ({},{},{})",
                        preset, r, g, b
                    );
                }
            }
        }
    }

    #[test]
    fn k_hole_mostly_dark() {
        let audio = audio_energetic();
        let time = 1.2_f32;
        let samples = 1000;

        let mut lightness_sum = 0.0_f64;
        for index in 0..samples {
            let (r, g, b) = vertex_color(index, Preset::KHole, &audio, time);
            // L from RGB ≈ (max + min) / 2 (matches HSL definition).
            let max = r.max(g).max(b);
            let min = r.min(g).min(b);
            lightness_sum += ((max + min) / 2.0) as f64;
        }
        let avg = lightness_sum / samples as f64;
        assert!(
            avg < 0.20,
            "k-hole expected to stay dark, avg lightness = {}",
            avg
        );
    }

    #[test]
    fn peyote_keeps_high_saturation_on_tonal_audio() {
        let mut audio = AudioState::new();
        audio.energy = 0.5;
        audio.chroma = [0.0; 12];
        audio.chroma[0] = 1.0; // pure single-note tonality

        let time = 0.6_f32;
        let mut min_saturation = 1.0_f32;
        for index in 0..2000 {
            let (r, g, b) = vertex_color(index, Preset::Peyote, &audio, time);
            let max = r.max(g).max(b);
            let min = r.min(g).min(b);
            let l = (max + min) / 2.0;
            if max == min {
                continue; // grey patch — skip
            }
            let delta = max - min;
            let s = if l > 0.5 { delta / (2.0 - max - min) } else { delta / (max + min) };
            if s < min_saturation {
                min_saturation = s;
            }
        }
        assert!(
            min_saturation >= 0.85,
            "peyote min saturation too low: {}",
            min_saturation
        );
    }

    #[test]
    fn palette_distinct_per_psychedelic_preset() {
        let p = [
            palette(Preset::Peyote),
            palette(Preset::Hyperspace),
            palette(Preset::Mycelia),
            palette(Preset::Recursion),
            palette(Preset::KHole),
        ];

        for i in 0..p.len() {
            for j in (i + 1)..p.len() {
                assert_ne!(p[i], p[j], "palette {} == palette {} ({:?})", i, j, p[i]);
            }
        }
    }

    #[test]
    fn palette_default_for_legacy_presets() {
        // Non-psychedelic presets share identity palette (hue_off=0, spread=1, no boosts).
        let identity = (0.0_f32, 1.0_f32, 0.0_f32, 0.0_f32);
        for legacy in [
            Preset::VectorSphere,
            Preset::MutantTorus,
            Preset::PlasmaField,
            Preset::HeartPulse,
            Preset::GammaRayPulsar,
        ] {
            assert_eq!(palette(legacy), identity, "{:?} unexpected palette", legacy);
        }
    }
}

