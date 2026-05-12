# `solver` — Shapeshifter puzzle solver, in Rust → WebAssembly

This crate is the in-browser puzzle solver for [vormveranderaar](../../). It's a
port of the TypeScript `Puzzle` / `PuzzlePiece` / `GameBoard` / brute-force code
in `server/utils/shapeshifter/`, exposed to JS via `wasm-bindgen`.

The web worker in `app/utils/shapeshifterWorker.ts` is the only consumer; the
Bun-powered `/api/calculate-solutions` endpoint still uses the TypeScript
implementation, so the two stay parity-testable.

## Public API

```ts
import init, { solve } from './pkg/solver.js';
import wasmUrl from './pkg/solver_bg.wasm?url';

await init({ module_or_path: wasmUrl });

const result = solve(
  // PuzzleOptions JSON (figures, gameBoard, puzzlePieces).
  puzzleOptions,
  // Settings.
  { preparePossibleSolutionStarts: false },
  // Status callback. Called every ~5s with a "Still thinking..." message,
  // and once per solution found.
  (msg: string) => postMessage({ type: 'status-update', payload: msg }),
);
```

`result` is a plain JS object whose shape matches the post-structured-clone
`Puzzle` payload the Vue components were already consuming — `figures`,
`targetFigure`, `gameBoard`, `puzzlePieces` (keyed by piece id), `solutions`,
`possibleSolutionStarts`, and `meta`. Grids look like
`{ data: number[][], rows, cols, cells, isSolution? }`; positions look like
`{ x, y }`; solution parts look like
`{ id, position, grid, before?, after?, partOfPossibleSolutionStart? }`.

## Building

```
bun run build:wasm
```

(From the repo root.) See the top-level README for prerequisites and details.
The build artifacts under `pkg/` are committed so deploys without a Rust
toolchain (e.g. Netlify static) just work.

## Benchmarking

Two scripts compare the wasm solver against the original TypeScript `Puzzle`
on a few sample puzzles (`level10`, `level18`, `level34`). Both run under Bun.

- **`bench.mjs`** loads the wasm module directly from `pkg/`. Useful when you
  want fast iteration on the Rust code — no Vite/Nuxt build step required.
  ```
  bun --bun run wasm/solver/bench.mjs              # both engines, all puzzles
  bun --bun run wasm/solver/bench.mjs level34      # one puzzle
  bun --bun run wasm/solver/bench.mjs level34 7 wasm   # wasm only, 7 runs
  ```
- **`bench-worker.mjs`** runs the wasm path through the *built* worker file
  (Vite output in `dist/_nuxt/`), giving production-realistic numbers
  including `postMessage` round-trips. Run `bun --bun nuxt build` (or
  `NITRO_PRESET=netlify-static bun --bun nuxt build`) first.
  ```
  bun --bun nuxt build
  bun --bun run wasm/solver/bench-worker.mjs level34 7 both
  ```

The JS path in both scripts calls the existing `server/utils/shapeshifter/Puzzle`
directly under Bun (via `js-wrapper.mjs`, which stubs the few Nuxt
auto-imports and the worker-only `postMessage` global the TypeScript code
expects).

## Layout

- `src/lib.rs` — the entire solver. One file, top-to-bottom: JS I/O types
  (serde), internal `Grid` / `PuzzlePiece` / `Puzzle`, the corner-bitmask logic
  for `prepare_possible_solution_starts`, the recursive brute-force iterator,
  and the `#[wasm_bindgen]` `solve` entry point at the bottom.
- `Cargo.toml` — `cdylib + rlib`, `opt-level = 3`, `lto = true`, `panic = abort`,
  `wasm-opt = false` (the wasm-pack download isn't always reachable; rustc is
  enough).

## Algorithm notes

The port follows the TypeScript implementation closely, including the
heuristics that make brute force tractable:

1. **Influence-bound early exit.** For each unused piece, sum `cellsInfluenced`
   (number of `1` cells). At every recursion depth, compute
   `target_sum - current_sum` and skip the subtree if the remaining pieces
   can't possibly close the gap. This is the same `numberOfTransformsNeeded`
   check the README's "Findings" section calls out as the biggest single win.
2. **Order pieces by influence.** Unused pieces are sorted by `cellsInfluenced`
   descending before recursing, so the most impactful pieces are placed first
   and impossible subtrees get pruned earlier.
3. **Unique-situation skipping.** Before brute-forcing a possible solution
   start, hash `(remaining piece ids, current game board)` and skip if we've
   seen the exact same state with the exact same unused pieces.
4. **Prepare possible solution starts (optional).** For each corner, enumerate
   subsets of pieces whose `1`-corners line up using a bitmask, keep only those
   whose subset sizes are valid `% figuresCount` for each corner, check
   pairwise compatibility (shared pieces at matching positions, no
   "this piece must affect that corner but the other corner's combo doesn't
   use it"), and seed the brute force from each surviving 4-corner combo.

## Position-grid precomputation

One small speedup over the TS version: for every `(piece, position)` we
precompute the list of flat game-board indices the piece's `1`-cells occupy
(`indices_by_position_index`). The brute-force inner loop then places a piece
with

```rust
for &idx in indices {
    out.data[idx] = (out.data[idx] + 1) % figures_count;
}
```

which is much tighter than allocating a fresh "piece on an empty board" grid
and adding it element-wise every iteration. The full grid is still
materialized when serializing each `before` / `after` for the UI, so output
stays drop-in compatible.
