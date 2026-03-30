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
        Preset::SupernovaRemnant     => vertex_supernova_remnant(index, audio, time),
        Preset::AndromedaSpiral      => vertex_andromeda_spiral(index, audio, time),
        Preset::GammaRayPulsar       => vertex_gamma_ray_pulsar(index, audio, time),
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
    let t = (f / n) * std::f32::consts::TAU * 12.0;
    let stripe = (index % 240) as f32 / 239.0 * 2.0 - 1.0;

    let fold = (t * 0.5 + time * (0.4 + audio.mid * 1.1)).sin();
    let radius = 3.0 + audio.bass * 2.2 + fold * 1.1;
    let angle = t + fold * 0.35;

    let mut x = angle.cos() * radius + stripe * (0.8 + audio.presence * 1.2);
    let mut y = stripe * (2.2 + audio.mid * 1.7)
        + (t * 0.7 - time * 1.6).sin() * (0.9 + audio.upper_mid * 1.4);
    let mut z = angle.sin() * radius + stripe * (0.5 + audio.treb * 0.9);

    let tear_band = ((t * 3.4 + time * 4.8).sin() * 0.5 + 0.5).powf(2.0);
    let tear = (stripe * 13.0 + time * 9.0).sin().signum() * tear_band * audio.treb * 1.4;
    let shear = (t * 9.0 - time * 6.0 + stripe * 5.0).cos() * audio.air * 0.9;

    x += tear + shear;
    y -= tear * 0.4 + shear * 0.25;
    z += tear * 0.85 - shear * 0.5;

    (x, y, z)
}

fn vertex_quantum_string(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let ratio = f / n;
    let z = (ratio - 0.5) * 28.0;
    let strand = if index % 2 == 0 { 1.0 } else { -1.0 };

    let base_radius = 1.2 + audio.treb * 1.8 + audio.presence * 0.6;
    let twist = z * (0.42 + audio.mid * 0.5) + time * (1.8 + audio.energy * 2.6);

    let mut x = twist.cos() * base_radius * strand;
    let mut y = twist.sin() * base_radius * strand;

    let knot = (z * 1.6 - time * (3.8 + audio.upper_mid * 2.4)).sin();
    let node_gate = (knot * (2.2 + audio.presence)).sin().abs().powf(1.4);
    let node_push = node_gate * (0.4 + audio.bass * 1.3);

    x += twist.sin() * node_push;
    y -= twist.cos() * node_push * 0.8;

    let tremor = (z * 3.6 + time * 7.2 + f * 0.004).sin() * audio.air * 0.7;
    x += tremor;
    y -= tremor * 0.6;

    let z_wobble = (z * 0.7 + time * 1.4).sin() * audio.sub_bass * 2.2;
    (x, y, z + z_wobble)
}

fn vertex_galactic_web(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    
    // Pseudo-random deterministic distribution
    let fx = ((f * 13.3).sin() * 423.1).fract() * 2.0 - 1.0;
    let fy = ((f * 17.7).cos() * 512.9).fract() * 2.0 - 1.0;
    let fz = ((f * 23.3).sin() * 118.4).fract() * 2.0 - 1.0;

    let base_radius = 5.0 + audio.energy * 6.0;
    
    let x = fx * base_radius;
    let mut y = fy * base_radius * 0.4; // Flatter galaxy
    let z = fz * base_radius;
    
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
    
    let x = (x_idx as f32) * step - offset;
    let y = (y_idx as f32) * step - offset;
    let z = (z_idx as f32) * step - offset;
    
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
    
    // Cube target and quantized scaffold to create a mechanical fold identity.
    let cx = sx.signum() * sx.abs().powf(0.07);
    let cy = sy.signum() * sy.abs().powf(0.07);
    let cz = sz.signum() * sz.abs().powf(0.07);

    let quant = 0.38 + audio.mid * 0.52;
    let qx = (cx / quant).round() * quant;
    let qy = (cy / quant).round() * quant;
    let qz = (cz / quant).round() * quant;

    let morph_lfo = ((time * (0.55 + audio.sub_bass * 1.3)).sin() * 0.5 + 0.5).powf(1.35);
    let edge_gate = ((sx.abs().max(sy.abs()).max(sz.abs()) - 0.55) / 0.45).clamp(0.0, 1.0);
    let morph = (morph_lfo * 0.8 + edge_gate * 0.2).clamp(0.0, 1.0);

    let x = sx * (1.0 - morph) + qx * morph;
    let y = sy * (1.0 - morph) + qy * morph;
    let z = sz * (1.0 - morph) + qz * morph;

    let scaffold = (f * 0.017 + time * 2.1).sin().abs().powf(4.0) * audio.treb * 0.6;
    let scale = 3.4 + audio.bass * 1.8 + audio.energy * 0.9;

    (
        (x + x.signum() * scaffold) * scale,
        (y - y.signum() * scaffold * 0.5) * scale,
        (z + z.signum() * scaffold) * scale,
    )
}

fn vertex_heart_pulse(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;

    // Cardioid shell with layered thickness and asymmetric beat expansion.
    let t = (f / n) * std::f32::consts::TAU;
    let layer = (index % 180) as f32 / 180.0;
    let lobe = 1.0 - 0.48 * layer;

    let cardioid = 2.2 - 1.6 * t.sin();
    let radial = cardioid * lobe;
    let angle = t + time * 0.35;

    let mut x = radial * angle.cos();
    let mut z = radial * angle.sin();
    let mut y = (layer - 0.5) * (1.6 + cardioid * 0.9);

    let beat_env = (time * (1.2 + audio.bass * 2.6)).sin().max(0.0).powf(1.8);
    let pump = 1.0 + beat_env * (0.45 + audio.sub_bass * 0.85);

    x *= pump * 3.2;
    y *= pump * 3.4;
    z *= pump * 2.8;

    let vessel = (t * 6.0 + time * 6.8).sin() * audio.presence * 0.35;
    x += vessel;
    y += vessel * 0.7;
    z += (layer * 18.0 + time * 4.2).cos() * audio.treb * 0.28;

    (x.clamp(-10.0, 10.0), y.clamp(-10.0, 10.0), z.clamp(-10.0, 10.0))
}

fn vertex_black_hole_singularity(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    
    // Spiral distribution towards center
    let radius = 1.0 + (f / n).powf(0.8) * 35.0;
    let angle = f * 137.5 + time * (10.0 / radius); 

    let x = angle.cos() * radius;
    let mut y = (f * 99.0).sin() * 0.4; // Disk thickness
    let z = angle.sin() * radius;

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

    let x3 = x4 * w_factor;
    let y3 = y4 * w_factor;
    let z3 = z4 * w_factor;

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
    let z = r * v.sin();
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

fn vertex_supernova_remnant(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;

    // Core distribution (golden spiral sphere base)
    let phi = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
    let y = 1.0 - (f / (n - 1.0)) * 2.0;
    let ry = (1.0 - y * y).sqrt();
    let theta = phi * f;

    // Particle shell placement keeps a dense core with a controllable outer shockwave.
    let shell_seed = (f * 137.5).fract();
    let shell_t = shell_seed.powf(1.35);
    let shell_bell = (shell_t * (2.0 - shell_t)).clamp(0.0, 1.0);

    let core_radius = 1.2 + audio.bass * 1.6;
    let shock_radius = 4.8 + audio.energy * 8.4 + audio.sub_bass * 6.0;
    let mut radius = core_radius + (shock_radius - core_radius) * shell_t;

    let ripple = (theta * 2.6 + time * (1.3 + audio.mid * 1.1)).sin() * (0.12 + audio.presence * 0.55);
    let filament = (theta * 5.1 + y * 8.0 - time * (2.2 + audio.treb * 2.8)).cos() * (0.08 + audio.air * 0.45);
    radius += (ripple + filament) * (0.25 + shell_bell * 0.9);

    let mut x = theta.cos() * ry * radius;
    let mut y_final = y * radius * (0.92 + shell_bell * 0.24);
    let mut z = theta.sin() * ry * radius;

    let swirl = (time * 0.9 + radius * 0.45 + y * 6.0).sin() * audio.upper_mid * (0.2 + shell_bell) * 1.15;
    let shear = (theta * 3.4 + time * 1.6).cos() * audio.treb * (0.12 + shell_bell * 0.7);

    x += swirl - shear * 0.35;
    y_final += shear * 0.55;
    z += swirl * 0.72 + shear * 0.42;

    (
        x.clamp(-24.0, 24.0),
        y_final.clamp(-18.0, 18.0),
        z.clamp(-24.0, 24.0),
    )
}

fn vertex_andromeda_spiral(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;

    let num_arms = 4.0;
    let arm_idx = (index % num_arms as usize) as f32;
    let arm_phase = arm_idx * (std::f32::consts::TAU / num_arms);

    let dist_t = (f / n).powf(1.3);
    let theta = dist_t * std::f32::consts::TAU * (2.5 + audio.mid * 1.2);

    let r_base = 0.55 * (0.13 * theta).exp();
    let density_wave = (theta * 2.1 - time * (1.2 + audio.presence * 1.4)).sin();
    let arm_mod = 1.0 + density_wave * (0.06 + audio.presence * 0.22);
    let radius = (r_base * (0.95 + audio.mid * 1.35) * arm_mod + audio.bass * 0.95).clamp(0.15, 18.0);

    let diff_rot = time * (0.45 + audio.energy * 0.35) / (1.0 + radius * 0.22);
    let arm_twist = density_wave * (0.08 + audio.upper_mid * 0.18);
    let total_angle = theta + arm_phase + diff_rot + arm_twist;

    let mut x = total_angle.cos() * radius;
    let mut z = total_angle.sin() * radius;

    let jitter = ((f * 12.9898).sin() * 43_758.547).fract() * 2.0 - 1.0;
    let thickness = 0.14 + 0.92 / (1.0 + radius * 0.7);
    let bulge = (1.0 - radius / 7.5).max(0.0);
    let mut y = jitter * thickness * (1.3 + audio.sub_bass * 1.8);
    y += bulge * (audio.bass * 1.6) * (time * 1.7 + f * 0.002).sin();

    let warp = (time * 0.8 + theta * 1.3).sin() * audio.air * 0.6;
    x += warp * z.signum() * 0.3;
    z -= warp * x.signum() * 0.3;

    (x.clamp(-20.0, 20.0), y.clamp(-8.0, 8.0), z.clamp(-20.0, 20.0))
}

fn vertex_gamma_ray_pulsar(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let f = index as f32;
    let n = NUM_VERTICES as f32;
    let ratio = f / n;

    // Dense rotating core (oblate spheroid).
    if ratio < 0.36 {
        let core_f = f;
        let core_n = n * 0.36;
        let phi = std::f32::consts::PI * (3.0 - (5.0_f32).sqrt());
        let y_norm = 1.0 - (core_f / (core_n - 1.0)) * 2.0;
        let ry = (1.0 - y_norm * y_norm).sqrt();
        let spin = time * (6.0 + audio.energy * 8.0) + core_f * 0.004;
        let theta = phi * core_f + spin;

        let core_radius = 1.8 + audio.bass * 1.6 + audio.sub_bass * 0.9;
        let oblate = 0.55 + audio.mid * 0.18;
        let precession = (time * 1.4).sin() * (0.12 + audio.presence * 0.22);

        let mut x = (theta + precession).cos() * ry * core_radius;
        let mut z = (theta + precession).sin() * ry * core_radius;
        let mut y = y_norm * core_radius * oblate;

        let pump = 1.0 + audio.bass * 0.85 + (time * 7.0).sin() * audio.sub_bass * 0.22;
        x *= pump;
        y *= pump;
        z *= pump;

        return (x.clamp(-8.0, 8.0), y.clamp(-5.0, 5.0), z.clamp(-8.0, 8.0));
    }

    // Polar gamma jets with controlled helical motion.
    let is_top_jet = (index % 2) == 0;
    let jet_t = ((ratio - 0.36) / 0.64).powf(1.45);

    let mut y = 1.2 + jet_t * 28.0;
    if !is_top_jet {
        y = -y;
    }

    let helical_speed = 2.1 + audio.presence * 4.6;
    let helical_phase = time * helical_speed + jet_t * 18.0 + f * 0.02;
    let base_radius = 0.12 + jet_t * (0.35 + audio.energy * 0.7);
    let pulse_envelope =
        0.82 + (time * (5.0 + audio.bass * 4.0) + jet_t * 10.0).sin().abs() * (0.18 + audio.sub_bass * 0.3);
    let radius = base_radius * pulse_envelope;

    let mut x = helical_phase.cos() * radius;
    let mut z = helical_phase.sin() * radius;

    let burst = (time * 18.0 + f * 0.03).sin() * audio.treb * (0.18 + jet_t * 0.7);
    x += burst * helical_phase.cos();
    z += burst * helical_phase.sin();

    let jet_wave = (time * 8.5 + jet_t * 14.0 + f * 0.006).sin() * audio.presence * (0.35 + jet_t * 1.7);
    y += jet_wave;

    (x.clamp(-9.0, 9.0), y.clamp(-32.0, 32.0), z.clamp(-9.0, 9.0))
}

#[cfg(test)]
mod tests {
    use super::{vertex, NUM_VERTICES};
    use crate::audio::AudioState;
    use crate::presets::Preset;

    fn sample_audio_state() -> AudioState {
        let mut state = AudioState::new();
        state.sub_bass = 0.52;
        state.bass = 0.61;
        state.low_mid = 0.33;
        state.mid = 0.47;
        state.upper_mid = 0.38;
        state.presence = 0.29;
        state.treb = 0.42;
        state.air = 0.2;
        state.energy = 0.58;
        state.chroma = [0.0; 12];
        state
    }

    #[test]
    fn vertex_outputs_are_finite_for_all_presets() {
        let audio = sample_audio_state();
        let sample_indices = [0, NUM_VERTICES / 11, NUM_VERTICES / 3, NUM_VERTICES / 2, NUM_VERTICES - 1];
        let sample_times = [0.0_f32, 0.8, 2.6, 7.9];

        for preset_idx in 0..20_u32 {
            let preset = Preset::from_index(preset_idx);

            for &index in &sample_indices {
                for &time in &sample_times {
                    let (x, y, z) = vertex(index, preset, &audio, time);

                    assert!(x.is_finite() && y.is_finite() && z.is_finite());
                    assert!(x.abs() <= 160.0, "x out of expected bounds for preset {:?}", preset);
                    assert!(y.abs() <= 160.0, "y out of expected bounds for preset {:?}", preset);
                    assert!(z.abs() <= 160.0, "z out of expected bounds for preset {:?}", preset);
                }
            }
        }
    }
}
