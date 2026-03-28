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
        Preset::QuantumString        => vertex_quantum_string(index, audio, time),
        Preset::GalacticWeb          => vertex_galactic_web(index, audio, time),
        Preset::VoxelGrid            => vertex_voxel_grid(index, audio, time),
        Preset::MorphingCube         => vertex_morphing_cube(index, audio, time),
        Preset::HeartPulse           => vertex_heart_pulse(index, audio, time),
        Preset::BlackHoleSingularity => vertex_black_hole_singularity(index, audio, time),
        Preset::TesseractFold        => vertex_tesseract_fold(index, audio, time),
        Preset::HyperspaceJump       => vertex_hyperspace_jump(index, audio, time),
        Preset::WormholeBridge       => vertex_wormhole_bridge(index, audio, time),
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

fn vertex_quantum_string(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let u = (f / n) * std::f32::consts::TAU * 4.0;
    
    // Parametric laser string
    let mut x = u.sin() * (4.0 + audio.treb * 2.5);
    let mut y = u.cos() * (4.0 + audio.treb * 2.5);
    let mut z = (f / n - 0.5) * 20.0;
    
    // Wave distortion
    let wave1 = (z * 1.5 + time * 3.0).sin() * (1.0 + audio.mid * 2.0);
    let wave2 = (z * 0.8 - time * 5.0).cos() * (0.5 + audio.upper_mid * 3.0);
    let pulse = audio.bass * (time * 8.0).sin();
    
    x += wave1 + pulse;
    y += wave2 - pulse;
    
    (x, y, z)
}

fn vertex_galactic_web(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    
    // Pseudo-random deterministic distribution
    let fx = ((f * 13.3).sin() * 423.1).fract() * 2.0 - 1.0;
    let fy = ((f * 17.7).cos() * 512.9).fract() * 2.0 - 1.0;
    let fz = ((f * 23.3).sin() * 118.4).fract() * 2.0 - 1.0;

    let base_radius = 5.0 + audio.energy * 6.0;
    
    let mut x = fx * base_radius;
    let mut y = fy * base_radius * 0.4; // Flatter galaxy
    let mut z = fz * base_radius;
    
    // Gravitational swirl
    let dist = (x*x + z*z).sqrt();
    let angle = dist * (0.1 + audio.sub_bass * 0.2) + time * 0.5;
    
    let nx = x * angle.cos() - z * angle.sin();
    let nz = x * angle.sin() + z * angle.cos();
    
    // Vertical dispersion on treble
    y += fy * audio.treb * 3.0 * (nx * 2.0 + time).sin();
    
    (nx, y, nz)
}

fn vertex_voxel_grid(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let side = (NUM_VERTICES as f32).cbrt().floor() as usize;
    let slice = side * side;
    
    let z_idx = index / slice;
    let y_idx = (index % slice) / side;
    let x_idx = index % side;
    
    let step = 1.0;
    let offset = (side as f32) * step * 0.5;
    
    let mut x = (x_idx as f32) * step - offset;
    let mut y = (y_idx as f32) * step - offset;
    let mut z = (z_idx as f32) * step - offset;
    
    // Deform grid
    let dist = (x*x + y*y + z*z).sqrt();
    let force = (dist * 0.5 - time * 2.0).sin() * audio.bass * 2.0;
    let noise = ((x_idx ^ y_idx ^ z_idx) as f32).sin() * audio.presence * 1.5;
    
    let scale = 1.0 + force + noise;
    (x * scale, y * scale, z * scale)
}

fn vertex_morphing_cube(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    
    // Sphere base (fibonacci)
    let phi = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
    let sy = 1.0 - (f / (n - 1.0)) * 2.0;
    let ry = (1.0 - sy * sy).sqrt();
    let theta = phi * f;
    let sx = theta.cos() * ry;
    let sz = theta.sin() * ry;
    
    // Cube Target mapping (normalized)
    let cx = sx.signum() * sx.abs().powf(0.1);
    let cy = sy.signum() * sy.abs().powf(0.1);
    let cz = sz.signum() * sz.abs().powf(0.1);
    
    // Easing parameter driven by low-end
    let mix = audio.sub_bass * 1.5 + (time * 1.0).sin() * 0.5 + 0.5;
    let clamped_mix = mix.clamp(0.0, 1.0);
    
    let x = sx * (1.0 - clamped_mix) + cx * clamped_mix;
    let y = sy * (1.0 - clamped_mix) + cy * clamped_mix;
    let z = sz * (1.0 - clamped_mix) + cz * clamped_mix;
    
    // Audio breath
    let scale = 4.0 + audio.bass * 2.0 + audio.energy * 1.0;
    
    // Treble jaggedness
    let jagged = audio.treb * 0.5 * (f * 99.9).sin();
    
    (x * scale + jagged, y * scale, z * scale + jagged)
}

fn vertex_heart_pulse(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    
    // Julia/Taubin parametric mapping
    let u = (f / n) * std::f32::consts::TAU * 40.0;
    let v = (f / n) * std::f32::consts::PI;

    // Heart geometry
    let x_base = v.sin() * (15.0 * u.sin() - 4.0 * (3.0 * u).sin());
    let y_base = 8.0 * v.cos();
    let z_base = v.sin() * (15.0 * u.cos() - 5.0 * (2.0 * u).cos() - 2.0 * (3.0 * u).cos() - (4.0 * u).cos());

    // Scale dynamically
    let scale = 0.45 + (audio.sub_bass * 0.4);
    
    let mut x = x_base * scale;
    let mut y = z_base * scale; // Swap to stand up
    let mut z = y_base * scale; 

    // Diastolic/Systolic Pumping
    let pump = 1.0 + audio.bass * 1.5 * (time * 12.0).sin().max(0.0);
    x *= pump; y *= pump; z *= pump;

    // Aortic noise
    let noise = audio.treb * 0.5 * (f * 13.0).sin();

    (x + noise, y + noise, z + noise)
}

fn vertex_black_hole_singularity(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    
    // Spiral distribution towards center
    let radius = 1.0 + (f / n).powf(0.8) * 35.0;
    let angle = f * 137.5 + time * (10.0 / radius); 

    let mut x = angle.cos() * radius;
    let mut y = (f * 99.0).sin() * 0.4; // Disk thickness
    let mut z = angle.sin() * radius;

    // Relativistic Lensing (Einstein Ring effect)
    let r_sq = x*x + y*y + z*z;
    let schwarzschild = 1.8 + audio.sub_bass;
    let lens_factor = schwarzschild / (r_sq.sqrt() + 0.1);

    if radius < 3.0 + audio.bass {
        // Event Horizon Drop
        y -= (3.0 - radius) * 5.0 * audio.energy;
    } else {
        // Space bending warp
        y += lens_factor * 8.0 * angle.sin();
    }

    let jitter = audio.treb * 1.5 * (f * 2.0).cos();

    (x + jitter, y, z + jitter)
}

fn vertex_tesseract_fold(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    
    // 4D Space pseudo random vertices
    let mut x4 = ((f * 1.3).cos() * 2.0).round();
    let mut y4 = ((f * 1.7).sin() * 2.0).round();
    let mut z4 = ((f * 2.3).cos() * 2.0).round();
    let mut w4 = ((f * 3.1).sin() * 2.0).round();

    let t = (f / NUM_VERTICES as f32 * 100.0).fract();
    if f % 4.0 == 0.0 { x4 *= t; }
    else if f % 4.0 == 1.0 { y4 *= t; }
    else if f % 4.0 == 2.0 { z4 *= t; }
    else { w4 *= t; }

    // Hyper-Rotations 
    let theta = time * 0.6 + audio.energy;
    let phi = time * 0.4 + audio.bass;

    // Rotate XW plane
    let nx = x4 * theta.cos() - w4 * theta.sin();
    let nw = x4 * theta.sin() + w4 * theta.cos();
    x4 = nx;
    w4 = nw;

    // Rotate YZ plane
    let ny = y4 * phi.cos() - z4 * phi.sin();
    let nz = y4 * phi.sin() + z4 * phi.cos();
    y4 = ny;
    z4 = nz;

    // Stereographic Projection to 3D
    let distance = 3.5 + audio.sub_bass;
    let w_factor = distance / (distance - w4);

    let mut x3 = x4 * w_factor;
    let mut y3 = y4 * w_factor;
    let mut z3 = z4 * w_factor;

    // Universal Scaling
    let scale = 3.5 + audio.mid * 2.0;

    (x3 * scale, y3 * scale, z3 * scale)
}

fn vertex_hyperspace_jump(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let angle = (f * 13.0).fract() * std::f32::consts::TAU;
    let radius = 1.0 + (f * 7.0).fract() * 15.0;
    
    // Near-infinite speed Z scrolling
    let speed = 40.0 + audio.energy * 250.0;
    let mut z = 50.0 - ((f * 3.0).fract() * 100.0 + time * speed) % 100.0;
    
    let warp = audio.sub_bass * 40.0 / (z.abs() + 1.0);
    
    let mut x = angle.cos() * (radius + warp);
    let mut y = angle.sin() * (radius + warp);

    // Epileptic Strobe behavior
    if audio.presence > 0.75 && (f as usize % 3 == 0) {
        x *= 1.8;
        y *= 1.8;
        z += 15.0;
    }

    (x, y, z)
}

fn vertex_wormhole_bridge(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    
    let u = (f / n) * std::f32::consts::TAU * 12.0;
    let v = (f / n * 17.0).fract() * std::f32::consts::TAU;

    // Tube radius
    let r = 1.5 + u.cos() * 1.5 + audio.bass * 2.5;
    
    let mut x = r * v.cos();
    let mut z = r * v.sin();
    let y = u.sin() * 20.0; 

    // Space bend
    let bend = time.sin() * 0.8 + audio.bass * 0.7;
    x += y * bend;

    // Torsion twist
    let torsion_angle = y * 0.15 + time * 1.5;
    let nx = x * torsion_angle.cos() - z * torsion_angle.sin();
    let nz = x * torsion_angle.sin() + z * torsion_angle.cos();

    (nx, y, nz)
}
