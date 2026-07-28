use crate::audio::AudioState;
use crate::geometry::NUM_VERTICES;
use crate::presets::Preset;

pub const COLOR_BUFFER_SIZE: usize = NUM_VERTICES * 3;

/// Per-preset color direction.
///
/// `bands` and `radial_mix` control how the hue gradient is laid over the *shape*
/// rather than over the vertex index: low band counts give broad legible regions,
/// `radial_mix` trades azimuthal banding for onion-ring banding by distance.
#[derive(Clone, Copy, PartialEq, Debug)]
pub(crate) struct Palette {
    hue_off:     f32,
    hue_spread:  f32,
    sat_boost:   f32,
    light_boost: f32,
    bands:       f32,
    radial_mix:  f32,
}

const fn pal(
    hue_off: f32,
    hue_spread: f32,
    sat_boost: f32,
    light_boost: f32,
    bands: f32,
    radial_mix: f32,
) -> Palette {
    Palette { hue_off, hue_spread, sat_boost, light_boost, bands, radial_mix }
}

pub(crate) fn palette(preset: Preset) -> Palette {
    match preset {
        // Geometric / structural presets: few wide bands, colors read as facets.
        Preset::VectorSphere    => pal(0.00, 0.62, 0.00,  0.00, 1.0, 0.15),
        Preset::MutantTorus     => pal(0.07, 0.70, 0.04,  0.02, 2.0, 0.20),
        Preset::LissajousKnot   => pal(0.52, 0.75, 0.08,  0.02, 1.5, 0.10),
        Preset::MorphingCube    => pal(0.14, 0.45, -0.05, -0.02, 1.0, 0.55),
        Preset::VoxelGrid       => pal(0.48, 0.40, -0.02, -0.01, 1.0, 0.70),
        Preset::TesseractFold   => pal(0.72, 0.85, 0.10,  0.03, 3.0, 0.25),
        Preset::HyperbolicParaboloid => pal(0.30, 0.68, 0.02, 0.00, 2.0, 0.30),

        // Field / flow presets: radial gradients, softer spread.
        Preset::PlasmaField     => pal(0.88, 0.80, 0.12,  0.04, 1.0, 0.45),
        Preset::FractalSpiral   => pal(0.60, 0.72, 0.05,  0.01, 2.0, 0.55),
        Preset::ChaosRibbon     => pal(0.04, 0.90, 0.14,  0.03, 3.0, 0.10),
        Preset::QuantumString   => pal(0.44, 0.55, 0.08,  0.02, 4.0, 0.15),
        Preset::HeartPulse      => pal(0.97, 0.30, 0.16,  0.05, 1.0, 0.35),

        // Deep-space presets: cold cores, warm rims — radial mix carries most of it.
        Preset::NebulaVortex    => pal(0.78, 0.65, 0.06,  0.00, 1.0, 0.60),
        Preset::GalacticWeb     => pal(0.58, 0.50, -0.04, -0.03, 1.0, 0.50),
        Preset::BlackHoleSingularity => pal(0.66, 0.42, -0.10, -0.10, 1.0, 0.80),
        Preset::HyperspaceJump  => pal(0.50, 0.88, 0.14,  0.04, 2.0, 0.72),
        Preset::WormholeBridge  => pal(0.42, 0.70, 0.06,  0.00, 1.0, 0.78),
        Preset::SupernovaRemnant => pal(0.02, 0.58, 0.14, 0.06, 1.0, 0.68),
        Preset::AndromedaSpiral => pal(0.10, 0.52, 0.02,  0.01, 2.0, 0.62),
        Preset::GammaRayPulsar  => pal(0.54, 0.36, 0.18,  0.05, 1.0, 0.40),

        // Psychedelic set.
        Preset::Peyote     => pal(0.95, 1.00,  0.18,  0.05, 6.0, 0.20), // hot magenta→yellow kaleidoscope
        Preset::Hyperspace => pal(0.36, 0.85,  0.22,  0.08, 2.0, 0.75), // emerald/magenta tunnel rings
        Preset::Mycelia    => pal(0.08, 0.45, -0.08, -0.02, 1.0, 0.40), // warm ochre→violet
        Preset::Recursion  => pal(0.55, 0.95,  0.20,  0.04, 4.0, 0.50), // cyan→magenta recursion
        Preset::KHole      => pal(0.62, 0.30, -0.30, -0.12, 1.0, 0.20), // void + rare neon
        Preset::ErdosLattice => pal(0.62, 0.35, 0.00,  0.00, 1.0, 0.30), // handled specially below
    }
}

const INV_TAU: f32 = 1.0 / (2.0 * std::f32::consts::PI);

/// Continuous 0..1 band coordinate derived from the vertex's position in space.
///
/// Using position instead of vertex index is what keeps color as legible regions:
/// neighbouring points in space land on neighbouring hues, so bloom smears within
/// a region instead of averaging twelve unrelated hues into grey.
fn band_coord(pos: (f32, f32, f32), palette: Palette) -> f32 {
    let (x, y, z) = pos;
    if !(x.is_finite() && y.is_finite() && z.is_finite()) {
        return 0.0;
    }

    let r = (x * x + y * y + z * z).sqrt();
    let azimuth = z.atan2(x) * INV_TAU; // -0.5..0.5, wraps seamlessly
    let elevation = if r > 1e-4 { y / r } else { 0.0 }; // -1..1
    let radial = r * 0.11; // roughly one ring per 9 world units

    let angular = azimuth + elevation * 0.18;
    let mixed = angular * (1.0 - palette.radial_mix) + radial * palette.radial_mix;

    (mixed * palette.bands).rem_euclid(1.0)
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
    pos: (f32, f32, f32),
    preset: Preset,
    audio: &AudioState,
    time: f32,
) -> (f32, f32, f32) {
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

    let palette = palette(preset);

    // Band coordinate comes from the vertex's place in space, so hue varies
    // slowly across the form. The quantized bin only picks which chroma bin
    // drives saturation in that region.
    let band = band_coord(pos, palette);
    let bin = ((band * 12.0) as usize).min(11);
    let chroma_norm = (audio.chroma[bin] * 6.0).clamp(0.0, 1.0);

    let mut hue = audio.harmonic_hue() + band * palette.hue_spread + palette.hue_off;

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
    hue += (time * 0.04 + band * 1.6).sin() * 0.015;

    let saturation = (0.82 + chroma_norm * 0.18 + palette.sat_boost).clamp(0.45, 1.0);
    let conf = audio.harmonic_confidence();

    // Lightness sits low and swings wide on purpose: the points render with
    // additive blending, so dense regions sum toward the highlights instead of
    // clipping to white the moment two sprites overlap.
    let lightness =
        (0.30 + audio.energy * 0.26 + conf * 0.06 + palette.light_boost).clamp(0.07, 0.78);

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

    // ----- band_coord ------------------------------------------------------

    #[test]
    fn band_coord_stays_in_unit_range_including_degenerate_positions() {
        let p = palette(Preset::PlasmaField);
        let positions = [
            (0.0, 0.0, 0.0),
            (1e-6, -1e-6, 0.0),
            (12.0, -4.0, 7.5),
            (-820.0, 640.0, -910.0),
            (f32::NAN, 1.0, 2.0),
            (1.0, f32::INFINITY, 2.0),
        ];
        for pos in positions {
            let b = band_coord(pos, p);
            assert!(b.is_finite(), "band_coord not finite for {:?}", pos);
            assert!((0.0..1.0).contains(&b), "band_coord {} out of [0,1) for {:?}", b, pos);
        }
    }

    #[test]
    fn band_coord_is_continuous_for_neighbouring_points() {
        // The whole point of position-based banding: points close in space must be
        // close in hue, otherwise the cloud dithers into grey under bloom.
        let p = palette(Preset::VectorSphere);
        let base = (4.0_f32, 1.2_f32, -3.0_f32);
        let near = (4.01_f32, 1.21_f32, -2.99_f32);

        let a = band_coord(base, p);
        let b = band_coord(near, p);
        let delta = (a - b).abs().min(1.0 - (a - b).abs()); // wrap-aware
        assert!(delta < 0.02, "neighbouring points diverged in hue: {} vs {}", a, b);
    }

    #[test]
    fn band_coord_separates_distant_points() {
        let p = palette(Preset::VectorSphere);
        let a = band_coord((5.0, 0.0, 0.0), p);
        let b = band_coord((-5.0, 0.0, 0.0), p);
        let delta = (a - b).abs().min(1.0 - (a - b).abs());
        assert!(delta > 0.1, "opposite sides of the form share a hue: {} vs {}", a, b);
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
                    // Feed the real geometry position so color and shape stay coupled.
                    let pos = crate::geometry::vertex(index, preset, &audio, time);
                    let (r, g, b) = vertex_color(index, pos, preset, &audio, time);
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
            let pos = crate::geometry::vertex(index, Preset::KHole, &audio, time);
            let (r, g, b) = vertex_color(index, pos, Preset::KHole, &audio, time);
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
            let pos = crate::geometry::vertex(index, Preset::Peyote, &audio, time);
            let (r, g, b) = vertex_color(index, pos, Preset::Peyote, &audio, time);
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
    fn every_preset_has_its_own_palette() {
        let palettes: Vec<Palette> = (0..crate::presets::PRESET_COUNT)
            .map(|i| palette(Preset::from_index(i)))
            .collect();

        for i in 0..palettes.len() {
            for j in (i + 1)..palettes.len() {
                assert_ne!(
                    palettes[i],
                    palettes[j],
                    "{:?} and {:?} share a palette",
                    Preset::from_index(i as u32),
                    Preset::from_index(j as u32)
                );
            }
        }
    }

    #[test]
    fn palette_parameters_stay_in_sane_ranges() {
        for i in 0..crate::presets::PRESET_COUNT {
            let preset = Preset::from_index(i);
            let p = palette(preset);
            assert!(p.bands >= 1.0 && p.bands <= 8.0, "{:?} bands out of range: {}", preset, p.bands);
            assert!(
                (0.0..=1.0).contains(&p.radial_mix),
                "{:?} radial_mix out of range: {}",
                preset,
                p.radial_mix
            );
            assert!(
                (0.0..=1.0).contains(&p.hue_spread),
                "{:?} hue_spread out of range: {}",
                preset,
                p.hue_spread
            );
        }
    }

    #[test]
    fn lightness_leaves_headroom_for_additive_blending() {
        // Points render additively; if a single point already sits near white,
        // any overlap clips and the palette work is invisible in dense regions.
        let mut audio = audio_energetic();
        audio.energy = 1.0;
        let time = 3.3_f32;

        for i in 0..crate::presets::PRESET_COUNT {
            let preset = Preset::from_index(i);
            if matches!(preset, Preset::ErdosLattice) {
                continue; // lattice nodes are deliberately white-hot beacons
            }
            for index in (0..NUM_VERTICES).step_by(499) {
                let pos = crate::geometry::vertex(index, preset, &audio, time);
                let (r, g, b) = vertex_color(index, pos, preset, &audio, time);
                let l = (r.max(g).max(b) + r.min(g).min(b)) / 2.0;
                assert!(l <= 0.80, "{:?} vertex {} too bright for additive: {}", preset, index, l);
            }
        }
    }
}

