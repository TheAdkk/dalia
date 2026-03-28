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
            Preset::ChaosRibbon         => Preset::VectorSphere,
        }
    }

    pub fn prev(self) -> Preset {
        match self {
            Preset::VectorSphere         => Preset::ChaosRibbon,
            Preset::MutantTorus          => Preset::VectorSphere,
            Preset::LissajousKnot        => Preset::MutantTorus,
            Preset::PlasmaField          => Preset::LissajousKnot,
            Preset::FractalSpiral        => Preset::PlasmaField,
            Preset::HyperbolicParaboloid => Preset::FractalSpiral,
            Preset::NebulaVortex         => Preset::HyperbolicParaboloid,
            Preset::ChaosRibbon          => Preset::NebulaVortex,
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
        }
    }

    pub fn from_index(i: u32) -> Preset {
        match i % 8 {
            0 => Preset::VectorSphere,
            1 => Preset::MutantTorus,
            2 => Preset::LissajousKnot,
            3 => Preset::PlasmaField,
            4 => Preset::FractalSpiral,
            5 => Preset::HyperbolicParaboloid,
            6 => Preset::NebulaVortex,
            _ => Preset::ChaosRibbon,
        }
    }
}
