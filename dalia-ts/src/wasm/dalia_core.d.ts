/* tslint:disable */
/* eslint-disable */

export class DaliaEngine {
    free(): void;
    [Symbol.dispose](): void;
    clear_lookahead_timeline(): void;
    current_preset_index(): number;
    get_active_edge_count(): number;
    get_air(): number;
    get_analysis_readiness(): number;
    get_bass(): number;
    get_beat_phase(): number;
    get_bpm_confidence(): number;
    get_buffered_energy_mean(): number;
    get_chroma_base(): number;
    get_color_len(): number;
    get_color_ptr(): number;
    get_detected_bpm(): number;
    get_edge_capacity(): number;
    get_edge_color_ptr(): number;
    get_edge_ptr(): number;
    get_energy(): number;
    get_future_bass_sustain_ratio(horizon_seconds: number, threshold: number): number;
    get_future_bass_sustain_ratio_at(current_time_seconds: number, horizon_seconds: number, threshold: number): number;
    get_future_energy_mean(horizon_seconds: number): number;
    get_future_energy_mean_at(current_time_seconds: number, horizon_seconds: number): number;
    get_future_transient_peak(horizon_seconds: number): number;
    get_future_transient_peak_at(current_time_seconds: number, horizon_seconds: number): number;
    get_geometry_len(): number;
    get_geometry_ptr(): number;
    get_harmonic_confidence(): number;
    get_harmonic_hue(): number;
    get_low_band_energy(): number;
    get_low_mid(): number;
    get_mid(): number;
    get_predicted_energy(horizon_seconds: number): number;
    get_predicted_low_band(horizon_seconds: number): number;
    get_presence(): number;
    get_processed_data_len(): number;
    get_processed_data_ptr(): number;
    get_spectral_flux_gate(): number;
    get_sub_bass(): number;
    get_transient_strength(): number;
    get_treb(): number;
    get_unit_distance_count(): number;
    get_upper_mid(): number;
    has_lookahead_timeline(): boolean;
    constructor();
    next_preset(): void;
    prev_preset(): void;
    process_audio(frequency_data: Uint8Array, hz_per_bin: number, delta_time: number): void;
    random_preset(target_idx: number): void;
    set_lookahead_timeline(energy_timeline: Float32Array, transient_timeline: Float32Array, low_band_timeline: Float32Array, fps: number): boolean;
    should_hold_for_sustained_bass(horizon_seconds: number, threshold: number, min_ratio: number): boolean;
    should_hold_for_sustained_bass_at(current_time_seconds: number, horizon_seconds: number, threshold: number, min_ratio: number): boolean;
    toggle_mashup(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_daliaengine_free: (a: number, b: number) => void;
    readonly daliaengine_clear_lookahead_timeline: (a: number) => void;
    readonly daliaengine_current_preset_index: (a: number) => number;
    readonly daliaengine_get_active_edge_count: (a: number) => number;
    readonly daliaengine_get_air: (a: number) => number;
    readonly daliaengine_get_analysis_readiness: (a: number) => number;
    readonly daliaengine_get_bass: (a: number) => number;
    readonly daliaengine_get_beat_phase: (a: number) => number;
    readonly daliaengine_get_bpm_confidence: (a: number) => number;
    readonly daliaengine_get_buffered_energy_mean: (a: number) => number;
    readonly daliaengine_get_chroma_base: (a: number) => number;
    readonly daliaengine_get_color_len: (a: number) => number;
    readonly daliaengine_get_color_ptr: (a: number) => number;
    readonly daliaengine_get_detected_bpm: (a: number) => number;
    readonly daliaengine_get_edge_capacity: (a: number) => number;
    readonly daliaengine_get_edge_color_ptr: (a: number) => number;
    readonly daliaengine_get_edge_ptr: (a: number) => number;
    readonly daliaengine_get_energy: (a: number) => number;
    readonly daliaengine_get_future_bass_sustain_ratio: (a: number, b: number, c: number) => number;
    readonly daliaengine_get_future_bass_sustain_ratio_at: (a: number, b: number, c: number, d: number) => number;
    readonly daliaengine_get_future_energy_mean: (a: number, b: number) => number;
    readonly daliaengine_get_future_energy_mean_at: (a: number, b: number, c: number) => number;
    readonly daliaengine_get_future_transient_peak: (a: number, b: number) => number;
    readonly daliaengine_get_future_transient_peak_at: (a: number, b: number, c: number) => number;
    readonly daliaengine_get_geometry_len: (a: number) => number;
    readonly daliaengine_get_geometry_ptr: (a: number) => number;
    readonly daliaengine_get_harmonic_confidence: (a: number) => number;
    readonly daliaengine_get_harmonic_hue: (a: number) => number;
    readonly daliaengine_get_low_band_energy: (a: number) => number;
    readonly daliaengine_get_low_mid: (a: number) => number;
    readonly daliaengine_get_mid: (a: number) => number;
    readonly daliaengine_get_predicted_energy: (a: number, b: number) => number;
    readonly daliaengine_get_predicted_low_band: (a: number, b: number) => number;
    readonly daliaengine_get_presence: (a: number) => number;
    readonly daliaengine_get_processed_data_len: (a: number) => number;
    readonly daliaengine_get_processed_data_ptr: (a: number) => number;
    readonly daliaengine_get_spectral_flux_gate: (a: number) => number;
    readonly daliaengine_get_sub_bass: (a: number) => number;
    readonly daliaengine_get_transient_strength: (a: number) => number;
    readonly daliaengine_get_treb: (a: number) => number;
    readonly daliaengine_get_unit_distance_count: (a: number) => number;
    readonly daliaengine_get_upper_mid: (a: number) => number;
    readonly daliaengine_has_lookahead_timeline: (a: number) => number;
    readonly daliaengine_new: () => number;
    readonly daliaengine_next_preset: (a: number) => void;
    readonly daliaengine_prev_preset: (a: number) => void;
    readonly daliaengine_process_audio: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly daliaengine_random_preset: (a: number, b: number) => void;
    readonly daliaengine_set_lookahead_timeline: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly daliaengine_should_hold_for_sustained_bass: (a: number, b: number, c: number, d: number) => number;
    readonly daliaengine_should_hold_for_sustained_bass_at: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly daliaengine_toggle_mashup: (a: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
