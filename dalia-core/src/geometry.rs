use crate::presets::Preset;
use crate::audio::AudioState;

pub const NUM_VERTICES: usize = 12_000;
pub const BUFFER_SIZE: usize = NUM_VERTICES * 3;

pub fn vertex(index: usize, preset: Preset, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    match preset {
        Preset::VectorSphere         => vertex_sphere(index, audio, time),
        Preset::MutantTorus          => vertex_torus(index, audio, time),
        Preset::LissajousKnot        => vertex_lissajous(index, audio, time),
        Preset::PlasmaField          => vertex_plasma(index, audio, time),
        Preset::FractalSpiral        => vertex_fractal_spiral(index, audio, time),
        Preset::HyperbolicParaboloid => vertex_hyperbolic(index, audio, time),
        Preset::NebulaVortex         => vertex_nebula_vortex(index, audio, time),
        Preset::ChaosRibbon          => vertex_chaos_ribbon(index, audio, time),
    }
}

fn vertex_sphere(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let phi = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
    let y = 1.0 - (f / (n - 1.0)) * 2.0;
    let ry = (1.0 - y * y).sqrt();
    let theta = phi * f;
    let x = theta.cos() * ry;
    let z = theta.sin() * ry;
    
    let r = 2.2
        + audio.bass * 2.5
        + audio.sub_bass * (time * 3.0 + y * 8.0).sin() * 0.6
        + audio.treb   * (time * 7.0 + f * 0.003).cos() * 0.25;
    (x * r, y * r, z * r)
}

fn vertex_torus(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let u = (f / n) * std::f32::consts::PI * 2.0;
    let v = (f / n) * std::f32::consts::PI * 20.0;
    let r_main = 2.2 + audio.mid * 1.8 + (time * 1.2).sin() * 0.3;
    let r_tube = 0.5 + audio.treb * 1.2 + audio.presence * 0.4;
    let twist  = time * 0.6 + audio.mid * std::f32::consts::PI;
    let x = (r_main + r_tube * v.cos()) * (u + twist).cos();
    let y = (r_main + r_tube * v.cos()) * (u + twist).sin();
    let z = r_tube * v.sin()
          + (time * 4.0 + u * 6.0).sin() * audio.bass * 0.8
          + audio.sub_bass * (time * 2.0).sin() * 0.5;
    (x, y, z)
}

fn vertex_lissajous(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let t = (f / n) * std::f32::consts::TAU;

    let ax = 3.0 + audio.bass * 2.0;
    let ay = 2.0 + audio.mid  * 1.5;
    let az = 5.0 + audio.treb * 3.0;

    let dx = time * 0.7 + audio.sub_bass * std::f32::consts::PI;
    let dy = time * 0.5 + audio.presence * std::f32::consts::PI * 0.5;
    let dz = time * 0.3 + audio.air      * std::f32::consts::PI * 2.0;

    let scale = 2.8 + audio.energy * 1.5;
    let x = (ax * t + dx).sin() * scale;
    let y = (ay * t + dy).sin() * scale;
    let z = (az * t + dz).cos() * scale
          + (time * 5.0 + t * 3.0).sin() * audio.bass * 0.6;
    (x, y, z)
}

fn vertex_plasma(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;

    let phi_g = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
    let r_norm = (f / n).sqrt();
    let angle  = phi_g * f;
    let px = angle.cos() * r_norm;
    let py = angle.sin() * r_norm;

    let freq1 = 4.0  + audio.treb    * 8.0;
    let freq2 = 7.0  + audio.presence * 5.0;
    let freq3 = 11.0 + audio.upper_mid * 6.0;

    let d1 = (px * freq1 + time * 1.5).sin();
    let d2 = (py * freq2 + time * 2.1).sin();
    let d3 = ((px * px + py * py).sqrt() * freq3 - time * 3.0).sin();
    let d4 = ((px - 0.5) * freq2 + (py + 0.3) * freq1 + time).sin();

    let plasma = (d1 + d2 + d3 + d4) * 0.25;
    let z = plasma * (1.8 + audio.bass * 2.5 + audio.sub_bass * 1.5);

    let spread = 4.5 + audio.energy * 2.0;
    (px * spread, py * spread, z)
}

fn vertex_fractal_spiral(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let t = f / n;

    let num_arms = 3.0 + (audio.mid * 4.0).floor();
    let arm_idx  = (f % num_arms) as f32;
    let arm_t    = t * num_arms; 

    let theta      = arm_t * std::f32::consts::PI * 5.0 + arm_idx * (std::f32::consts::TAU / num_arms);
    let b          = 0.2 + audio.upper_mid * 0.15;
    let r          = (0.15 * (b * theta).exp()).min(5.0);

    let warp_r = r
        + audio.bass    * (theta * 3.0 + time * 2.0).sin() * 0.6
        + audio.treb    * (theta * 7.0 + time * 5.0).cos() * 0.2;
    let twist  = time * 0.4 + audio.mid * 2.0;

    let x = (theta + twist).cos() * warp_r;
    let y = (theta + twist).sin() * warp_r;
    let z = (time * 3.0 + theta * 2.0).sin() * audio.presence * 0.8
          + (time * 1.5 + r * 4.0).cos() * audio.sub_bass * 1.2;
    (x, y, z)
}

fn vertex_hyperbolic(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let n = NUM_VERTICES as f32;

    let side = (n.sqrt()) as usize;
    let ix = (index % side) as f32 / side as f32; 
    let iy = (index / side) as f32 / side as f32; 

    let px = (ix - 0.5) * 8.0; 
    let py = (iy - 0.5) * 8.0;

    let saddle_z = (px * px - py * py) / (4.0 + audio.bass * 4.0);

    let wave1 = (px * (2.0 + audio.treb * 4.0) + time * 1.0).sin() * audio.treb * 0.8;
    let wave2 = (py * (3.0 + audio.presence * 3.0) - time * 0.75).cos() * audio.presence * 0.6;
    let wave3 = ((px * px + py * py).sqrt() * (1.5 + audio.mid * 3.0) - time * 2.0).sin() * audio.mid * 1.0;
    let wave4 = (px * 1.2 + py * 0.8 + time * 1.75).sin() * audio.sub_bass * 1.5;

    let z = saddle_z + wave1 + wave2 + wave3 + wave4;
    (px, py, z.clamp(-5.0, 5.0))
}

fn vertex_nebula_vortex(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let t = (f / n) * std::f32::consts::TAU * 24.0;
    let layer = f / n;

    let radial = layer.powf(0.62) * (3.2 + audio.energy * 4.0 + audio.sub_bass * 1.8);
    let swirl = t
        + time * (0.7 + audio.mid * 1.8)
        + (radial * 2.6 + time * 2.0).sin() * (audio.treb * 2.0 + audio.presence * 0.6);

    let mut x = swirl.cos() * radial;
    let mut y = (layer - 0.5) * 11.0;
    let mut z = swirl.sin() * radial;

    let jet = (t * 2.0 + time * 3.5).sin() * (0.8 + audio.upper_mid * 2.4);
    let chaos = (t * 11.0 + time * 7.0).sin() * (0.2 + audio.air * 1.3);

    x += jet * 0.65 + chaos;
    y += (t * 3.0 + time * 4.0).cos() * (audio.air * 2.2 + audio.treb * 1.1);
    z += jet * 0.45 - chaos * 0.7 + audio.sub_bass * (time * 2.4 + radial * 4.0).cos() * 1.5;

    (x, y * 0.56, z)
}

fn vertex_chaos_ribbon(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let u = (f / n) * std::f32::consts::TAU * 10.0;
    let stripe = ((index % 280) as f32 / 280.0) * std::f32::consts::TAU;

    let base = 2.0 + audio.bass * 2.9 + audio.sub_bass * 1.4;
    let ripple = (u * 5.0 + time * 4.5).sin() * (0.7 + audio.upper_mid * 2.1);
    let thickness = 0.32 + audio.treb * 1.8 + audio.air * 0.9;

    let angle = u + time * (0.5 + audio.mid * 0.6);
    let mut x = angle.cos() * (base + ripple) + (stripe * 3.0).sin() * thickness;
    let mut y = (u * 0.5 + time * 1.3).sin() * (1.9 + audio.mid * 2.2)
        + (stripe + time * 2.4).cos() * thickness * 1.2;
    let mut z = angle.sin() * (base + ripple) + (stripe * 2.0 + time * 3.3).sin() * thickness;

    let tear_gate = (u * 7.0 + time * 2.0).sin().abs();
    let tear = (u * 13.0 + time * 8.0).sin().signum() * audio.presence * 1.1 * tear_gate;
    let crackle = (u * 19.0 + time * 11.0).cos() * audio.treb * 0.5;

    x += tear + crackle;
    y -= tear * 0.5;
    z += tear * 0.8 - crackle * 0.4;

    (x, y, z)
}
