/* tslint:disable */
/* eslint-disable */

export class Domino {
    free(): void;
    [Symbol.dispose](): void;
    constructor(end1: number, end2: number);
    to_index(): number;
    high: number;
    low: number;
}

export class TileSet {
    free(): void;
    [Symbol.dispose](): void;
    add(domino: Domino): void;
    contains(domino: Domino): boolean;
    count(): number;
    static empty(): TileSet;
    constructor();
    remove(domino: Domino): void;
    0: number;
}

export function analyze_board_state(board_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_domino_free: (a: number, b: number) => void;
    readonly __wbg_get_domino_high: (a: number) => number;
    readonly __wbg_get_domino_low: (a: number) => number;
    readonly __wbg_get_tileset_0: (a: number) => number;
    readonly __wbg_set_domino_high: (a: number, b: number) => void;
    readonly __wbg_set_domino_low: (a: number, b: number) => void;
    readonly __wbg_set_tileset_0: (a: number, b: number) => void;
    readonly __wbg_tileset_free: (a: number, b: number) => void;
    readonly domino_new: (a: number, b: number) => number;
    readonly domino_to_index: (a: number) => number;
    readonly tileset_add: (a: number, b: number) => void;
    readonly tileset_contains: (a: number, b: number) => number;
    readonly tileset_count: (a: number) => number;
    readonly tileset_empty: () => number;
    readonly tileset_remove: (a: number, b: number) => void;
    readonly tileset_new: () => number;
    readonly analyze_board_state: (a: number, b: number) => [number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
