// ---------------------------------------------------------------------------
// Erdős Lattice — the unit-distance graph as an audio-reactive preset.
//
// Background: in 1946 Paul Erdős posed the planar unit-distance problem — among
// n points in the plane, how many pairs can sit at *exactly* distance 1? The
// square grid gives ~n^(1+c/log log n) such pairs. In 2026 an OpenAI model found
// a family of configurations that beats the grid. This preset dramatizes that:
// a square grid (each node has 4 unit-neighbours) morphs into a triangular
// lattice (6 unit-neighbours) — literally "beating the grid" — while a resonance
// field sweeps the graph, igniting the unit-distance edges in rings, and a live
// counter reports the number of unit-distance pairs.
//
// This visualizes the *idea* with a representative max-unit-distance lattice; it
// does not reproduce the paper's record construction.
// ---------------------------------------------------------------------------

use crate::audio::AudioState;
use crate::color::hsl_to_rgb;

/// Side length of the planar lattice (LATTICE_K × LATTICE_K nodes).
pub const LATTICE_K: usize = 40;
/// World units per lattice unit — the rendered length of the Erdős "unit distance".
const SPACING: f32 = 0.46;
/// sqrt(3)/2 — triangular-lattice row height that keeps nearest-neighbour distance 1.
const SQRT3_2: f32 = 0.866_025_4;
/// Half-window for counting a pair as "unit distance" (in lattice units).
const UNIT_EPS: f32 = 0.06;
/// Max edges emitted to the LineSegments buffer per frame.
pub const MAX_EDGES: usize = 6_000;
/// Floats per edge in the WASM buffer: 2 endpoints × 3 coords.
pub const EDGE_STRIDE: usize = 6;
/// Resonance intensity below which an edge is dark (not drawn / faded).
const LIT_THRESHOLD: f32 = 0.18;

#[inline]
pub fn node_count() -> usize {
    LATTICE_K * LATTICE_K
}

/// 0.0 = square grid (4 unit-neighbours), 1.0 = triangular lattice (6 unit-neighbours).
/// Energy and low-end drive the morph so drops densify the graph ("beating the grid").
pub fn morph_factor(audio: &AudioState) -> f32 {
    (audio.energy * 0.6 + audio.low_band_energy() * 0.4 + audio.transient_strength() * 0.3)
        .clamp(0.0, 1.0)
}

/// Row height under morph `m`: 1.0 (square) → sqrt(3)/2 (triangular).
#[inline]
fn y_step(m: f32) -> f32 {
    1.0 - m * (1.0 - SQRT3_2)
}

/// Standing-wave field over the lattice. The effective unit length L(r,t) breathes
/// around 1.0; intensity peaks where the lattice spacing matches L, so rings of high
/// intensity sweep outward — the "ondas de resonancia". `transient` adds a global flash.
pub fn resonance(r: f32, time: f32, audio: &AudioState) -> f32 {
    let amp = 0.12 + audio.bass * 0.55; // wave amplitude of L around 1
    let omega = 0.8 + audio.energy * 2.6; // sweep speed
    let k = 1.05; // spatial frequency (ring density)
    let dev = amp * (k * r - time * omega).sin(); // |L - 1| proxy
    let sigma = 0.22;
    let g = (-(dev * dev) / (2.0 * sigma * sigma)).exp();
    let flash = audio.transient_strength() * 0.35;
    (g * 0.85 + flash).clamp(0.0, 1.0)
}

/// World-space position of lattice node `node_idx` under the current morph, with a
/// small resonance lift on Z so the graph breathes without leaving the plane.
fn node_world(node_idx: usize, m: f32, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let i = (node_idx % LATTICE_K) as f32;
    let j = (node_idx / LATTICE_K) as f32;
    let ys = y_step(m);
    let odd = ((node_idx / LATTICE_K) & 1) as f32;

    let raw_x = i + m * 0.5 * odd; // odd rows shift right → triangular offset
    let raw_y = j * ys;

    let half = (LATTICE_K as f32 - 1.0) * 0.5;
    let px = (raw_x - half) * SPACING;
    let py = (raw_y - half * ys) * SPACING;

    let r = (px * px + py * py).sqrt();
    let lift = resonance(r, time, audio) * (0.25 + audio.bass * 1.4) * SPACING;
    (px, py, lift)
}

/// Forward neighbour of node (i,j): dir 0 = East, 1 = North, 2 = Diagonal.
/// East and North stay unit-distance in both square and triangular lattices; the
/// diagonal only reaches unit distance as the morph approaches triangular.
fn forward_neighbor(i: usize, j: usize, dir: u8) -> Option<usize> {
    let k = LATTICE_K;
    match dir {
        0 => (i + 1 < k).then(|| j * k + (i + 1)),
        1 => (j + 1 < k).then(|| (j + 1) * k + i),
        2 => {
            if j + 1 >= k {
                return None;
            }
            if j & 1 == 0 {
                (i >= 1).then(|| (j + 1) * k + (i - 1))
            } else {
                (i + 1 < k).then(|| (j + 1) * k + (i + 1))
            }
        }
        _ => None,
    }
}

/// Lattice-unit length of an edge in direction `dir` under morph `m`.
fn edge_lattice_distance(dir: u8, m: f32) -> f32 {
    let ys = y_step(m);
    match dir {
        0 => 1.0,                                        // East — always unit
        1 => ((0.5 * m).powi(2) + ys * ys).sqrt(),       // North
        2 => ((1.0 - 0.5 * m).powi(2) + ys * ys).sqrt(), // Diagonal
        _ => f32::INFINITY,
    }
}

#[inline]
fn is_unit(d: f32) -> bool {
    (d - 1.0).abs() < UNIT_EPS
}

/// Number of node pairs at (lattice) unit distance this frame. Rises as the square
/// grid morphs to triangular — the live "Erdős number" shown in the HUD.
pub fn unit_distance_count(audio: &AudioState, _time: f32) -> u32 {
    let m = morph_factor(audio);
    let de = edge_lattice_distance(0, m);
    let dn = edge_lattice_distance(1, m);
    let dd = edge_lattice_distance(2, m);

    let mut count: u32 = 0;
    for j in 0..LATTICE_K {
        for i in 0..LATTICE_K {
            if is_unit(de) && forward_neighbor(i, j, 0).is_some() {
                count += 1;
            }
            if is_unit(dn) && forward_neighbor(i, j, 1).is_some() {
                count += 1;
            }
            if is_unit(dd) && forward_neighbor(i, j, 2).is_some() {
                count += 1;
            }
        }
    }
    count
}

/// Fills `positions`/`colors` (each ≥ MAX_EDGES*EDGE_STRIDE) with the lit
/// unit-distance edges as line-segment endpoint pairs. Returns the edge count.
pub fn build_edges(
    audio: &AudioState,
    time: f32,
    positions: &mut [f32],
    colors: &mut [f32],
) -> usize {
    let m = morph_factor(audio);
    let hue = audio.harmonic_hue();
    let mut edges = 0usize;

    'outer: for j in 0..LATTICE_K {
        for i in 0..LATTICE_K {
            let node = j * LATTICE_K + i;
            for dir in 0u8..3 {
                if !is_unit(edge_lattice_distance(dir, m)) {
                    continue;
                }
                let Some(nb) = forward_neighbor(i, j, dir) else {
                    continue;
                };

                let a = node_world(node, m, audio, time);
                let b = node_world(nb, m, audio, time);
                let mx = (a.0 + b.0) * 0.5;
                let my = (a.1 + b.1) * 0.5;
                let inten = resonance((mx * mx + my * my).sqrt(), time, audio);
                if inten < LIT_THRESHOLD {
                    continue;
                }

                let off = edges * EDGE_STRIDE;
                positions[off] = a.0;
                positions[off + 1] = a.1;
                positions[off + 2] = a.2;
                positions[off + 3] = b.0;
                positions[off + 4] = b.1;
                positions[off + 5] = b.2;

                let (cr, cg, cb) = hsl_to_rgb(hue + 0.04 * dir as f32, 0.9, 0.2 + inten * 0.5);
                colors[off] = cr;
                colors[off + 1] = cg;
                colors[off + 2] = cb;
                colors[off + 3] = cr;
                colors[off + 4] = cg;
                colors[off + 5] = cb;

                edges += 1;
                if edges >= MAX_EDGES {
                    break 'outer;
                }
            }
        }
    }
    edges
}

/// Point-cloud vertex: the first `node_count()` indices are lattice nodes; the rest
/// are glow sparks spread along lit unit-distance edges. When a spark's edge is dark
/// (geometrically non-unit, or below the resonance threshold) it collapses onto its
/// source node — merging invisibly — so the point layer matches the lit line segments.
pub fn vertex(index: usize, audio: &AudioState, time: f32) -> (f32, f32, f32) {
    let m = morph_factor(audio);
    let nc = node_count();
    if index < nc {
        return node_world(index, m, audio, time);
    }

    let s = index - nc;
    let node = s % nc;
    let dir = ((s / nc) % 3) as u8;
    let i = node % LATTICE_K;
    let j = node / LATTICE_K;

    let a = node_world(node, m, audio, time);

    if let (Some(nb), true) = (forward_neighbor(i, j, dir), is_unit(edge_lattice_distance(dir, m)))
    {
        let b = node_world(nb, m, audio, time);
        let mx = (a.0 + b.0) * 0.5;
        let my = (a.1 + b.1) * 0.5;
        if resonance((mx * mx + my * my).sqrt(), time, audio) >= LIT_THRESHOLD {
            let t = hash01(s);
            let x = a.0 + (b.0 - a.0) * t + (s as f32 * 12.9898).sin() * 0.02;
            let y = a.1 + (b.1 - a.1) * t + (s as f32 * 78.233).cos() * 0.02;
            let z = a.2 + (b.2 - a.2) * t;
            return (x, y, z);
        }
    }
    a // collapse onto the source node when there is no lit edge to ride
}

/// Deterministic pseudo-random parameter in [0,1) for spark placement along an edge.
#[inline]
fn hash01(s: usize) -> f32 {
    ((s as f32 * 0.754_877_7).sin() * 43_758.547).fract().abs()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::audio::AudioState;

    fn silent() -> AudioState {
        AudioState::new()
    }

    fn loud() -> AudioState {
        let mut a = AudioState::new();
        a.energy = 1.0;
        a.sub_bass = 1.0;
        a.bass = 1.0;
        a
    }

    #[test]
    fn node_count_is_k_squared() {
        assert_eq!(node_count(), LATTICE_K * LATTICE_K);
    }

    #[test]
    fn square_grid_counts_east_and_north_edges() {
        let a = silent();
        assert_eq!(morph_factor(&a), 0.0);
        let expect = 2 * (LATTICE_K * (LATTICE_K - 1)) as u32;
        assert_eq!(unit_distance_count(&a, 0.0), expect);
    }

    #[test]
    fn morph_raises_unit_distance_count() {
        let sq = unit_distance_count(&silent(), 0.0);
        let tri = unit_distance_count(&loud(), 0.0);
        assert!(tri > sq, "triangular {} should exceed square {}", tri, sq);
        // Triangular adds the diagonal family ~ (K-1)^2.
        let diag = (LATTICE_K as u32 - 1).pow(2);
        assert!(tri >= sq + diag - 1, "tri={} sq={} diag={}", tri, sq, diag);
    }

    #[test]
    fn vertices_finite_and_bounded() {
        let a = loud();
        for &idx in &[0usize, 1, 1599, 1600, 6000, 11_999] {
            for &t in &[0.0f32, 1.3, 9.7] {
                let (x, y, z) = vertex(idx, &a, t);
                assert!(x.is_finite() && y.is_finite() && z.is_finite());
                assert!(x.abs() <= 160.0 && y.abs() <= 160.0 && z.abs() <= 160.0);
            }
        }
    }

    #[test]
    fn build_edges_respects_cap_and_writes_finite() {
        let a = loud();
        let mut pos = vec![0.0f32; MAX_EDGES * EDGE_STRIDE];
        let mut col = vec![0.0f32; MAX_EDGES * EDGE_STRIDE];
        let n = build_edges(&a, 0.5, &mut pos, &mut col);
        assert!(n <= MAX_EDGES);
        for v in &pos[..n * EDGE_STRIDE] {
            assert!(v.is_finite());
        }
        for c in &col[..n * EDGE_STRIDE] {
            assert!((0.0..=1.0).contains(c));
        }
    }

    #[test]
    fn resonance_stays_in_unit_range() {
        let a = loud();
        for r in [0.0f32, 1.0, 5.0, 9.0] {
            for t in [0.0f32, 2.0, 6.0] {
                let v = resonance(r, t, &a);
                assert!((0.0..=1.0).contains(&v), "resonance {} out of range", v);
            }
        }
    }
}
