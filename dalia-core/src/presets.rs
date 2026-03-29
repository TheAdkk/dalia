#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Preset {
    VectorSphere,
    MutantTorus,
    LissajousKnot,
    PlasmaField,
    FractalSpiral,
    HyperbolicParaboloid,
    NebulaVortex,
    ChaosRibbon,
    QuantumString,
    GalacticWeb,
    VoxelGrid,
    MorphingCube,
    HeartPulse,
    BlackHoleSingularity,
    TesseractFold,
    HyperspaceJump,
    WormholeBridge,
    SupernovaRemnant,
    AndromedaSpiral,
    GammaRayPulsar,
}

impl Preset {
    pub fn next(self) -> Preset {
        match self {
            Preset::VectorSphere        => Preset::MutantTorus,
            Preset::MutantTorus         => Preset::LissajousKnot,
            Preset::LissajousKnot       => Preset::PlasmaField,
            Preset::PlasmaField         => Preset::FractalSpiral,
            Preset::FractalSpiral       => Preset::HyperbolicParaboloid,
            Preset::HyperbolicParaboloid => Preset::NebulaVortex,
            Preset::NebulaVortex        => Preset::ChaosRibbon,
            Preset::ChaosRibbon         => Preset::QuantumString,
            Preset::QuantumString       => Preset::GalacticWeb,
            Preset::GalacticWeb         => Preset::VoxelGrid,
            Preset::VoxelGrid           => Preset::MorphingCube,
            Preset::MorphingCube        => Preset::HeartPulse,
            Preset::HeartPulse          => Preset::BlackHoleSingularity,
            Preset::BlackHoleSingularity=> Preset::TesseractFold,
            Preset::TesseractFold       => Preset::HyperspaceJump,
            Preset::HyperspaceJump      => Preset::WormholeBridge,
            Preset::WormholeBridge      => Preset::SupernovaRemnant,
            Preset::SupernovaRemnant    => Preset::AndromedaSpiral,
            Preset::AndromedaSpiral     => Preset::GammaRayPulsar,
            Preset::GammaRayPulsar      => Preset::VectorSphere,
        }
    }

    pub fn prev(self) -> Preset {
        match self {
            Preset::VectorSphere         => Preset::GammaRayPulsar,
            Preset::MutantTorus          => Preset::VectorSphere,
            Preset::LissajousKnot        => Preset::MutantTorus,
            Preset::PlasmaField          => Preset::LissajousKnot,
            Preset::FractalSpiral        => Preset::PlasmaField,
            Preset::HyperbolicParaboloid => Preset::FractalSpiral,
            Preset::NebulaVortex         => Preset::HyperbolicParaboloid,
            Preset::ChaosRibbon          => Preset::NebulaVortex,
            Preset::QuantumString        => Preset::ChaosRibbon,
            Preset::GalacticWeb          => Preset::QuantumString,
            Preset::VoxelGrid            => Preset::GalacticWeb,
            Preset::MorphingCube         => Preset::VoxelGrid,
            Preset::HeartPulse           => Preset::MorphingCube,
            Preset::BlackHoleSingularity => Preset::HeartPulse,
            Preset::TesseractFold        => Preset::BlackHoleSingularity,
            Preset::HyperspaceJump       => Preset::TesseractFold,
            Preset::WormholeBridge       => Preset::HyperspaceJump,
            Preset::SupernovaRemnant     => Preset::WormholeBridge,
            Preset::AndromedaSpiral      => Preset::SupernovaRemnant,
            Preset::GammaRayPulsar       => Preset::AndromedaSpiral,
        }
    }

    pub fn index(self) -> u32 {
        match self {
            Preset::VectorSphere         => 0,
            Preset::MutantTorus          => 1,
            Preset::LissajousKnot        => 2,
            Preset::PlasmaField          => 3,
            Preset::FractalSpiral        => 4,
            Preset::HyperbolicParaboloid => 5,
            Preset::NebulaVortex         => 6,
            Preset::ChaosRibbon          => 7,
            Preset::QuantumString        => 8,
            Preset::GalacticWeb          => 9,
            Preset::VoxelGrid            => 10,
            Preset::MorphingCube         => 11,
            Preset::HeartPulse           => 12,
            Preset::BlackHoleSingularity => 13,
            Preset::TesseractFold        => 14,
            Preset::HyperspaceJump       => 15,
            Preset::WormholeBridge       => 16,
            Preset::SupernovaRemnant     => 17,
            Preset::AndromedaSpiral      => 18,
            Preset::GammaRayPulsar       => 19,
        }
    }

    pub fn from_index(i: u32) -> Preset {
        match i % 20 {
            0  => Preset::VectorSphere,
            1  => Preset::MutantTorus,
            2  => Preset::LissajousKnot,
            3  => Preset::PlasmaField,
            4  => Preset::FractalSpiral,
            5  => Preset::HyperbolicParaboloid,
            6  => Preset::NebulaVortex,
            7  => Preset::ChaosRibbon,
            8  => Preset::QuantumString,
            9  => Preset::GalacticWeb,
            10 => Preset::VoxelGrid,
            11 => Preset::MorphingCube,
            12 => Preset::HeartPulse,
            13 => Preset::BlackHoleSingularity,
            14 => Preset::TesseractFold,
            15 => Preset::HyperspaceJump,
            16 => Preset::WormholeBridge,
            17 => Preset::SupernovaRemnant,
            18 => Preset::AndromedaSpiral,
            _  => Preset::GammaRayPulsar,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Preset;

    #[test]
    fn index_roundtrip_matches_all_variants() {
        for i in 0..20_u32 {
            let preset = Preset::from_index(i);
            assert_eq!(preset.index(), i);
        }

        assert_eq!(Preset::from_index(20), Preset::VectorSphere);
        assert_eq!(Preset::from_index(39), Preset::GammaRayPulsar);
    }

    #[test]
    fn next_prev_are_inverse_for_all_presets() {
        for i in 0..20_u32 {
            let preset = Preset::from_index(i);
            assert_eq!(preset.next().prev(), preset);
            assert_eq!(preset.prev().next(), preset);
        }
    }

    #[test]
    fn full_next_cycle_visits_all_presets_once() {
        let mut seen = [false; 20];
        let mut current = Preset::VectorSphere;

        for _ in 0..20 {
            let idx = current.index() as usize;
            assert!(!seen[idx], "preset repeated before cycle completion at index {idx}");
            seen[idx] = true;
            current = current.next();
        }

        assert_eq!(current, Preset::VectorSphere);
        assert!(seen.into_iter().all(|v| v));
    }
}
