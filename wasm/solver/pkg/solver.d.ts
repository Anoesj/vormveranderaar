/* tslint:disable */
/* eslint-disable */

export function on_start(): void;

export function solve(options_js: any, settings_js: any, status_cb: Function): any;

/**
 * Like `solve`, but processes only the tasks assigned to this worker out of `num_workers`.
 *
 * Slicing happens at "task depth": for puzzles with ≥ 2 unused puzzle pieces (the common
 * case) that's depth 1 of the recursion — task index = `root_pos_i * num_depth1_positions
 * + depth1_pos_i`, and worker `w` processes indices where `task_idx % num_workers == w`.
 * For puzzles with exactly one unused piece, slicing falls back to depth 0.
 *
 * `stop_cb` is polled every ~65k attempts (same throttle as the time check). Typically
 * backed by an `Atomics.load` on a `SharedArrayBuffer` so the orchestrator can broadcast
 * "first worker found a solution, everyone bail" cheaply.
 */
export function solve_slice(options_js: any, settings_js: any, status_cb: Function, num_workers: number, worker_index: number, stop_cb?: Function | null): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly solve: (a: any, b: any, c: any) => [number, number, number];
    readonly solve_slice: (a: any, b: any, c: any, d: number, e: number, f: number) => [number, number, number];
    readonly on_start: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
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
