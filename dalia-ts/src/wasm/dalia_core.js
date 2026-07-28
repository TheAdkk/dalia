/* @ts-self-types="./dalia_core.d.ts" */

export class DaliaEngine {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DaliaEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_daliaengine_free(ptr, 0);
    }
    clear_lookahead_timeline() {
        wasm.daliaengine_clear_lookahead_timeline(this.__wbg_ptr);
    }
    /**
     * @returns {number}
     */
    current_preset_index() {
        const ret = wasm.daliaengine_current_preset_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_active_edge_count() {
        const ret = wasm.daliaengine_get_active_edge_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_air() {
        const ret = wasm.daliaengine_get_air(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_analysis_readiness() {
        const ret = wasm.daliaengine_get_analysis_readiness(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_bass() {
        const ret = wasm.daliaengine_get_bass(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_beat_phase() {
        const ret = wasm.daliaengine_get_beat_phase(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_bpm_confidence() {
        const ret = wasm.daliaengine_get_bpm_confidence(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_buffered_energy_mean() {
        const ret = wasm.daliaengine_get_buffered_energy_mean(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_chroma_base() {
        const ret = wasm.daliaengine_get_chroma_base(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_color_len() {
        const ret = wasm.daliaengine_get_color_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_color_ptr() {
        const ret = wasm.daliaengine_get_color_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_detected_bpm() {
        const ret = wasm.daliaengine_get_detected_bpm(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_edge_capacity() {
        const ret = wasm.daliaengine_get_edge_capacity(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_edge_color_ptr() {
        const ret = wasm.daliaengine_get_edge_color_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_edge_ptr() {
        const ret = wasm.daliaengine_get_edge_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_energy() {
        const ret = wasm.daliaengine_get_energy(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} horizon_seconds
     * @param {number} threshold
     * @returns {number}
     */
    get_future_bass_sustain_ratio(horizon_seconds, threshold) {
        const ret = wasm.daliaengine_get_future_bass_sustain_ratio(this.__wbg_ptr, horizon_seconds, threshold);
        return ret;
    }
    /**
     * @param {number} current_time_seconds
     * @param {number} horizon_seconds
     * @param {number} threshold
     * @returns {number}
     */
    get_future_bass_sustain_ratio_at(current_time_seconds, horizon_seconds, threshold) {
        const ret = wasm.daliaengine_get_future_bass_sustain_ratio_at(this.__wbg_ptr, current_time_seconds, horizon_seconds, threshold);
        return ret;
    }
    /**
     * @param {number} horizon_seconds
     * @returns {number}
     */
    get_future_energy_mean(horizon_seconds) {
        const ret = wasm.daliaengine_get_future_energy_mean(this.__wbg_ptr, horizon_seconds);
        return ret;
    }
    /**
     * @param {number} current_time_seconds
     * @param {number} horizon_seconds
     * @returns {number}
     */
    get_future_energy_mean_at(current_time_seconds, horizon_seconds) {
        const ret = wasm.daliaengine_get_future_energy_mean_at(this.__wbg_ptr, current_time_seconds, horizon_seconds);
        return ret;
    }
    /**
     * @param {number} horizon_seconds
     * @returns {number}
     */
    get_future_transient_peak(horizon_seconds) {
        const ret = wasm.daliaengine_get_future_transient_peak(this.__wbg_ptr, horizon_seconds);
        return ret;
    }
    /**
     * @param {number} current_time_seconds
     * @param {number} horizon_seconds
     * @returns {number}
     */
    get_future_transient_peak_at(current_time_seconds, horizon_seconds) {
        const ret = wasm.daliaengine_get_future_transient_peak_at(this.__wbg_ptr, current_time_seconds, horizon_seconds);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_geometry_len() {
        const ret = wasm.daliaengine_get_geometry_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_geometry_ptr() {
        const ret = wasm.daliaengine_get_geometry_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_harmonic_confidence() {
        const ret = wasm.daliaengine_get_harmonic_confidence(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_harmonic_hue() {
        const ret = wasm.daliaengine_get_harmonic_hue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_low_band_energy() {
        const ret = wasm.daliaengine_get_low_band_energy(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_low_mid() {
        const ret = wasm.daliaengine_get_low_mid(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_mid() {
        const ret = wasm.daliaengine_get_mid(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} horizon_seconds
     * @returns {number}
     */
    get_predicted_energy(horizon_seconds) {
        const ret = wasm.daliaengine_get_predicted_energy(this.__wbg_ptr, horizon_seconds);
        return ret;
    }
    /**
     * @param {number} horizon_seconds
     * @returns {number}
     */
    get_predicted_low_band(horizon_seconds) {
        const ret = wasm.daliaengine_get_predicted_low_band(this.__wbg_ptr, horizon_seconds);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_presence() {
        const ret = wasm.daliaengine_get_presence(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_processed_data_len() {
        const ret = wasm.daliaengine_get_processed_data_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_processed_data_ptr() {
        const ret = wasm.daliaengine_get_processed_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_spectral_flux_gate() {
        const ret = wasm.daliaengine_get_spectral_flux_gate(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_sub_bass() {
        const ret = wasm.daliaengine_get_sub_bass(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_transient_strength() {
        const ret = wasm.daliaengine_get_transient_strength(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_treb() {
        const ret = wasm.daliaengine_get_treb(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_unit_distance_count() {
        const ret = wasm.daliaengine_get_unit_distance_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_upper_mid() {
        const ret = wasm.daliaengine_get_upper_mid(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    has_lookahead_timeline() {
        const ret = wasm.daliaengine_has_lookahead_timeline(this.__wbg_ptr);
        return ret !== 0;
    }
    constructor() {
        const ret = wasm.daliaengine_new();
        this.__wbg_ptr = ret >>> 0;
        DaliaEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    next_preset() {
        wasm.daliaengine_next_preset(this.__wbg_ptr);
    }
    prev_preset() {
        wasm.daliaengine_prev_preset(this.__wbg_ptr);
    }
    /**
     * @param {Uint8Array} frequency_data
     * @param {number} hz_per_bin
     * @param {number} delta_time
     */
    process_audio(frequency_data, hz_per_bin, delta_time) {
        const ptr0 = passArray8ToWasm0(frequency_data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.daliaengine_process_audio(this.__wbg_ptr, ptr0, len0, hz_per_bin, delta_time);
    }
    /**
     * @param {number} target_idx
     */
    random_preset(target_idx) {
        wasm.daliaengine_random_preset(this.__wbg_ptr, target_idx);
    }
    /**
     * @param {Float32Array} energy_timeline
     * @param {Float32Array} transient_timeline
     * @param {Float32Array} low_band_timeline
     * @param {number} fps
     * @returns {boolean}
     */
    set_lookahead_timeline(energy_timeline, transient_timeline, low_band_timeline, fps) {
        const ptr0 = passArrayF32ToWasm0(energy_timeline, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(transient_timeline, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF32ToWasm0(low_band_timeline, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.daliaengine_set_lookahead_timeline(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, fps);
        return ret !== 0;
    }
    /**
     * @param {number} horizon_seconds
     * @param {number} threshold
     * @param {number} min_ratio
     * @returns {boolean}
     */
    should_hold_for_sustained_bass(horizon_seconds, threshold, min_ratio) {
        const ret = wasm.daliaengine_should_hold_for_sustained_bass(this.__wbg_ptr, horizon_seconds, threshold, min_ratio);
        return ret !== 0;
    }
    /**
     * @param {number} current_time_seconds
     * @param {number} horizon_seconds
     * @param {number} threshold
     * @param {number} min_ratio
     * @returns {boolean}
     */
    should_hold_for_sustained_bass_at(current_time_seconds, horizon_seconds, threshold, min_ratio) {
        const ret = wasm.daliaengine_should_hold_for_sustained_bass_at(this.__wbg_ptr, current_time_seconds, horizon_seconds, threshold, min_ratio);
        return ret !== 0;
    }
    toggle_mashup() {
        wasm.daliaengine_toggle_mashup(this.__wbg_ptr);
    }
}
if (Symbol.dispose) DaliaEngine.prototype[Symbol.dispose] = DaliaEngine.prototype.free;

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./dalia_core_bg.js": import0,
    };
}

const DaliaEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_daliaengine_free(ptr >>> 0, 1));

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('dalia_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
