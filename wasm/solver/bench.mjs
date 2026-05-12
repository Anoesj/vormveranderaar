// Local benchmark harness. Not bundled. Run with:
//   bun --bun run wasm/solver/bench.mjs              # both engines, all puzzles
//   bun --bun run wasm/solver/bench.mjs level34      # both engines, one puzzle
//   bun --bun run wasm/solver/bench.mjs level34 5 js # only JS
//   bun --bun run wasm/solver/bench.mjs level34 5 wasm
import fs from 'node:fs';
import init, { solve } from './pkg/solver.js';
import { solveJs } from './js-wrapper.mjs';

const wasmBytes = fs.readFileSync(new URL('./pkg/solver_bg.wasm', import.meta.url));
await init({ module_or_path: wasmBytes });

// Silence the chatty TypeScript Puzzle.ts logging so the bench output stays readable.
const origLog = console.log;
console.log = () => {};

// A mix of puzzles with different characteristics. level10 = lots of solutions, fast.
// level32/35 = larger boards, the brute force does real work.
const cases = {
  level10: {
    figures: [0, 1],
    gameBoard: [
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
    ],
    puzzlePieces: [
      [[1, 1, 0], [0, 1, 1]],
      [[1, 0], [1, 1], [1, 0]],
      [[1, 0], [1, 1], [1, 0]],
      [[1, 1], [1, 1], [1, 1]],
      [[1], [1]],
      [[1, 1, 1]],
      [[1, 0], [1, 1], [1, 0]],
      [[0, 1, 1], [1, 1, 1]],
      [[1, 0], [1, 1], [1, 0]],
      [[0, 1, 1], [1, 1, 1]],
      [[1, 0], [1, 1], [1, 0]],
    ],
  },
  level18: {
    figures: [0, 1],
    gameBoard: [[1,0,0],[0,0,0],[1,0,0],[1,1,1]],
    puzzlePieces: [
      [[0,1,1],[1,1,1]],
      [[1,1],[1,0]],
      [[0,1],[1,1],[0,1]],
      [[0,1,1],[1,1,1]],
      [[1,1],[1,1],[1,1]],
      [[1,0,0],[1,1,0],[0,1,1]],
      [[1,1,1],[0,1,0],[1,1,1]],
      [[1,1]],
      [[1,0,0],[1,1,0],[0,1,1]],
      [[1,0],[1,1],[0,1]],
      [[1,1,1],[0,1,0],[1,1,1]],
      [[1],[1]],
      [[0,1],[1,1],[0,1]],
      [[1],[1]],
    ],
  },
  level34: {
    figures: [0, 1],
    gameBoard: [
      [0,1,1,1,1,0],
      [1,1,0,0,1,1],
      [1,0,1,0,0,1],
      [1,1,1,1,1,1],
      [1,1,1,1,0,0],
      [0,0,0,1,1,0],
    ],
    puzzlePieces: [
      [[1,1,1],[0,1,0],[1,1,1]],
      [[1,1,1],[1,0,1]],
      [[1,1,0,0],[1,0,0,0],[1,0,1,0],[1,1,1,1]],
      [[0,1,1,1],[0,0,1,0],[1,1,1,0]],
      [[0,1,0,1],[1,1,0,1],[0,1,1,1],[1,1,0,0]],
      [[1,0,0],[1,1,1],[0,0,1]],
      [[0,0,1],[0,0,1],[1,1,1]],
      [[0,0,1],[0,1,1],[1,1,1]],
      [[1,1,1]],
      [[1,1],[0,1],[1,1]],
      [[1,0,0],[1,1,0],[0,1,1]],
      [[1,0],[1,1],[0,1]],
    ],
  },
};

async function benchEngine(engineLabel, runFn, opts, runs) {
  const times = [];
  let meta;
  let solutionsLen = 0;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const result = await runFn(opts);
    const t1 = performance.now();
    times.push(t1 - t0);
    meta = result.meta;
    solutionsLen = result.solutions.length;
  }
  times.sort((a, b) => a - b);
  const best = times[0];
  const median = times[Math.floor(times.length / 2)];
  origLog(`  ${engineLabel.padEnd(12)} best=${best.toFixed(1).padStart(8)}ms  median=${median.toFixed(1).padStart(8)}ms  solutions=${solutionsLen}  attempts=${meta.totalNumberOfIteratorPlacementAttempts}  skippedImpossible=${meta.skippedImpossibleSituations}  skippedDup=${meta.skippedDuplicateSituations}`);
  return { best, median, meta, solutionsLen };
}

const target = process.argv[2] || 'all';
const runs = Number(process.argv[3] || 3);
const engines = (process.argv[4] || 'both').toLowerCase();
const prepareFlag = (process.argv[5] || '').toLowerCase() === 'prepare';
const runWasm = engines === 'both' || engines === 'wasm';
const runJs   = engines === 'both' || engines === 'js';
const settings = { preparePossibleSolutionStarts: prepareFlag };

origLog(`# Benchmark (target=${target}, runs=${runs}, engines=${engines}, prepare=${prepareFlag})`);
origLog('# Warming up...');
if (runWasm) solve(cases.level10, settings, () => {});
if (runJs)   await solveJs(cases.level10, settings);

for (const [name, opts] of Object.entries(cases)) {
  if (target !== 'all' && target !== name) continue;
  origLog(`\n## ${name}`);
  if (runJs)   await benchEngine('js',   (o) => solveJs(o, settings),                            opts, runs);
  if (runWasm) await benchEngine('wasm', (o) => Promise.resolve(solve(o, settings, () => {})),    opts, runs);
}
