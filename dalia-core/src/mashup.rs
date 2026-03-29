use crate::presets::Preset;

pub struct MashupController {
    pub current_preset:      Preset,
    pub next_preset:         Option<Preset>,
    pub transition_progress: f32,
    pub transition_speed:    f32,
}

impl MashupController {
    pub fn new() -> Self {
        Self {
            current_preset:      Preset::VectorSphere,
            next_preset:         None,
            transition_progress: 0.0,
            transition_speed:    0.006,
        }
    }

    pub fn start_transition(&mut self, target: Preset) {
        if self.next_preset.is_none() {
            self.next_preset         = Some(target);
            self.transition_progress = 0.0;
        }
    }

    pub fn update(&mut self) {
        if self.next_preset.is_some() {
            self.transition_progress += self.transition_speed;
            if self.transition_progress >= 1.0 {
                self.current_preset      = self.next_preset.take().unwrap();
                self.transition_progress = 0.0;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::MashupController;
    use crate::presets::Preset;

    #[test]
    fn transition_reaches_target_and_resets_state() {
        let mut controller = MashupController::new();
        controller.start_transition(Preset::LissajousKnot);

        for _ in 0..220 {
            controller.update();
        }

        assert_eq!(controller.current_preset, Preset::LissajousKnot);
        assert!(controller.next_preset.is_none());
        assert_eq!(controller.transition_progress, 0.0);
    }

    #[test]
    fn transition_target_cannot_be_overwritten_midflight() {
        let mut controller = MashupController::new();
        controller.start_transition(Preset::MutantTorus);
        controller.start_transition(Preset::GammaRayPulsar);

        assert_eq!(controller.next_preset, Some(Preset::MutantTorus));

        for _ in 0..8 {
            controller.update();
        }

        controller.start_transition(Preset::GammaRayPulsar);
        assert_eq!(controller.next_preset, Some(Preset::MutantTorus));
    }
}
