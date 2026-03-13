/* tslint:disable */
/* eslint-disable */

/**
 * The core audio processing engine for Dalia.
 * Receives raw frequency data from JavaScript and processes it
 * into normalized float data accessible via shared WASM memory.
 */
export class DaliaEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Returns the length of the processed data buffer.
     */
    get_processed_data_len(): number;
    /**
     * Returns a raw pointer to the processed data buffer.
     * JavaScript reads this pointer to create a Float32Array view
     * directly into WASM linear memory (zero-copy read).
     */
    get_processed_data_ptr(): number;
    /**
     * Returns a raw pointer to the calculated uniforms buffer.
     * JS will read a Float32Array of length 6.
     */
    get_shader_uniforms_ptr(): number;
    /**
     * Creates a new DaliaEngine instance.
     */
    constructor();
    /**
     * Receives raw byte frequency data from the Web Audio API's AnalyserNode
     * (values 0–255) and normalizes each sample to a f32 in the range [0.0, 1.0].
     *
     * This is the zero-copy entry point: JS passes a &[u8] view directly
     * into WASM linear memory — no JSON, no serde.
     */
    process_audio(frequency_data: Uint8Array): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_daliaengine_free: (a: number, b: number) => void;
    readonly daliaengine_get_processed_data_len: (a: number) => number;
    readonly daliaengine_get_processed_data_ptr: (a: number) => number;
    readonly daliaengine_get_shader_uniforms_ptr: (a: number) => number;
    readonly daliaengine_new: () => number;
    readonly daliaengine_process_audio: (a: number, b: number, c: number) => void;
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
