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
            Preset::WormholeBridge      => Preset::VectorSphere,
        }
    }

    pub fn prev(self) -> Preset {
        match self {
            Preset::VectorSphere         => Preset::WormholeBridge,
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
        }
    }

    pub fn from_index(i: u32) -> Preset {
        match i % 17 {
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
            _  => Preset::WormholeBridge,
        }
    }
}
