## Getting started
- Use `bun`, because brute forcing puzzles takes time and `bun` is just a lot faster than `node`.
- `bun i`
- `bun --bun run dev` to start Nuxt. The `--bun` flag will force Nuxt to use `bun` instead of `node`.

The pre-built WebAssembly solver lives under `wasm/solver/pkg/` and is checked into the repo, so nothing extra is needed for day-to-day work. If you change the Rust source, see ["Rebuilding the wasm solver"](#rebuilding-the-wasm-solver).

## Building the app
- `bun --bun run build` to build the app.

In order to test the Netlify build locally and preview it, run: `NETLIFY=true bun --bun nuxt build && bunx serve dist`.

## Technical info
### Solving the puzzle
The puzzle solver runs in two places:

- **In the browser** (default, and the only path on the Netlify deploy) — a single web worker (`app/utils/shapeshifterWorker.ts`) loads a WebAssembly module compiled from the Rust crate at `wasm/solver/` and calls its `solve(options, settings, statusCb)` entry point. The Rust code re-implements the brute-force pipeline and the optional "prepare possible solution starts" phase, and streams `Still thinking…` updates back through a JS callback. Parallelization across multiple workers is on the roadmap; today the worker runs single-threaded.
- **In the Bun-powered server** (local dev only, toggle the "Calculate in-browser" switch off) — `server/api/calculate-solutions.post.ts` still uses the original TypeScript `Puzzle` class under `server/utils/shapeshifter/`. This path is kept around for parity testing and so the existing TS implementation stays runnable.

Both paths produce the same JSON shape, so the Vue components (`app/components/Solution.vue`, `PossibleSolutionStart.vue`, `Grid.vue`, …) don't care which solver ran.

#### Rebuilding the wasm solver
Prerequisites (one-time):

```
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Then:

```
bun run build:wasm
```

That runs `wasm-pack build wasm/solver --target web --release --out-dir pkg` and strips wasm-pack's auto-generated `pkg/.gitignore` so the artifacts stay committed. The output (`solver.js`, `solver_bg.wasm`, `solver.d.ts`) is imported directly by the web worker via Vite's `?url` asset handling. We deliberately commit `wasm/solver/pkg/` so Netlify (which doesn't have Rust) can build the static site without invoking `wasm-pack`.

Notes:
- `wasm-opt` is disabled in `Cargo.toml` (it downloads a binary at build time that isn't always reachable). The rustc release profile (`opt-level = 3`, `lto = true`, `codegen-units = 1`) already produces a small wasm (~200 kB, ~77 kB gzipped).
- The Rust crate has no special workspace setup — it's a plain `cdylib` + `rlib` crate. Tests can be added as standard `#[cfg(test)]` Rust tests and run with `cargo test --target x86_64-unknown-linux-gnu` (i.e. natively, not under wasm).

### Findings
- In `Puzzle`, when turning `*puzzlePiecePlacementOptionsIterator` into an `AsyncGenerator`, it gets about 8% slower.
- In `Puzzle`, when using `setImmediate` in an async version of `*puzzlePiecePlacementOptionsIterator`, it gets about 26% slower than when keeping it sync and leaving out `setImmediate`.
- `structuredClone` is VERY, VERY SLOW in most cases.
- Using classic `for` loops with cached array sizes instead of `for..of` loops in critical places affected performance a lot, sometimes 7x speed improvements. Prevent `.reduce`, `.flat`, `.map`, etc. in critical places.
- Using `arr1.concat(arr2)` is a bit faster than `[...arr1, ...arr2]`.
- Using `const item1 = arr[0]; const rest = arr.slice(1);` is a bit faster than `const [item1, ...rest] = arr;`.
- Memory heap kept going up after every "possible solution start", because we saved every unique situation we encountered, so we can skip iterations where we run into the same situation with the same unused puzzle pieces. It doesn't matter how small we could serialize this situation + unused puzzle pieces, it would always cause memory issues at this scale.
- Using `bun` instead of `node` is 3-4x faster.
- Promises make everything slower.
- Calculating the possible solution starts based on getting the corners right only is a lot slower than just brute forcing the puzzle. Can be 3x faster without it and in some cases, where there are a lot of solutions for the corners only, 10+ times speed improvements. Focus on the brute force!
- Sorting the unused puzzle pieces from large to small seems to make quite a difference (untested). With size I mean the number of influenced cells by the puzzle piece.
- Don't create new functions, always reuse them.
- Early returns for the win. Stop executing code as soon as possible in the brute force iterator.
- What made the most difference is counting how many cells the following puzzle pieces can influence at max and checking if the number of incorrect cells is more than that. This way, we can skip a lot of unnecessary iterations.
- Nested generators are awesome but complicated. I want to try using regular function recursion and see if there's any perf gains there.
- The Rust port uses plain function recursion (no generators — Rust doesn't have JS-style generators) and pre-computes, for every `(piece, position)` pair, the list of flat game-board indices the piece's `1`-cells occupy. Placing a piece during brute force is then just a tight `for &idx in indices: board[idx] = (board[idx] + 1) % figuresCount` loop, which avoids the per-iteration grid allocation/copy the JS version pays for.