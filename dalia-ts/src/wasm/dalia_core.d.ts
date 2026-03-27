/* tslint:disable */
/* eslint-disable */

export class DaliaEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Returns current preset index (0-7)
     */
    current_preset_index(): number;
    get_air(): number;
    get_bass(): number;
    get_energy(): number;
    get_geometry_len(): number;
    get_geometry_ptr(): number;
    get_low_mid(): number;
    get_mid(): number;
    get_presence(): number;
    get_processed_data_len(): number;
    get_processed_data_ptr(): number;
    get_sub_bass(): number;
    get_treb(): number;
    get_upper_mid(): number;
    constructor();
    next_preset(): void;
    prev_preset(): void;
    process_audio(frequency_data: Uint8Array): void;
    /**
     * Legacy toggle for Mashup button – cycles forward
     */
    toggle_mashup(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_daliaengine_free: (a: number, b: number) => void;
    readonly daliaengine_current_preset_index: (a: number) => number;
    readonly daliaengine_get_air: (a: number) => number;
    readonly daliaengine_get_bass: (a: number) => number;
    readonly daliaengine_get_energy: (a: number) => number;
    readonly daliaengine_get_geometry_len: (a: number) => number;
    readonly daliaengine_get_geometry_ptr: (a: number) => number;
    readonly daliaengine_get_low_mid: (a: number) => number;
    readonly daliaengine_get_mid: (a: number) => number;
    readonly daliaengine_get_presence: (a: number) => number;
    readonly daliaengine_get_processed_data_len: (a: number) => number;
    readonly daliaengine_get_processed_data_ptr: (a: number) => number;
    readonly daliaengine_get_sub_bass: (a: number) => number;
    readonly daliaengine_get_treb: (a: number) => number;
    readonly daliaengine_get_upper_mid: (a: number) => number;
    readonly daliaengine_new: () => number;
    readonly daliaengine_next_preset: (a: number) => void;
    readonly daliaengine_prev_preset: (a: number) => void;
    readonly daliaengine_process_audio: (a: number, b: number, c: number) => void;
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
