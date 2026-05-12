// Production-realistic benchmark: runs the WASM solver via the *built* worker (Vite
// output in dist/_nuxt/), and the JS solver directly under Bun. Run after `bun --bun
// run build` (or `bun --bun nuxt build`) — exits with a hint otherwise.
//
//   bun --bun run wasm/solver/bench-worker.mjs              # both engines, all puzzles
//   bun --bun run wasm/solver/bench-worker.mjs level34      # both engines, one puzzle
//   bun --bun run wasm/solver/bench-worker.mjs level34 5 js
//   bun --bun run wasm/solver/bench-worker.mjs level34 5 wasm

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { solveJs } from './js-wrapper.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const distNuxt = path.join(repoRoot, 'dist', '_nuxt');

function findWorker () {
  if (!fs.existsSync(distNuxt)) return null;
  const file = fs.readdirSync(distNuxt).find((f) => /^shapeshifterWorker-.*\.js$/.test(f));
  return file ? path.join(distNuxt, file) : null;
}

const workerPath = findWorker();
if (!workerPath) {
  console.error('No built worker found under dist/_nuxt/. Run `bun --bun nuxt build` (or `NITRO_PRESET=netlify-static bun --bun nuxt build`) first.');
  process.exit(1);
}

// We spawn the *built* worker file (Vite output) via a tiny Bun shim that fakes
// `self.location` — that mirrors how the worker runs in a browser, just without
// the browser. Bun's `fetch` resolves the worker's sibling `file://` URL for the
// wasm, so the load path is identical to production.
const shimPath = path.join(repoRoot, 'wasm', 'solver', '_worker-shim.mjs');

function makeWasmRunner () {
  const worker = new Worker(pathToFileURL(shimPath).href);
  // The built worker logs lots of status text via console.log — suppress.
  const pending = [];
  worker.onmessage = (event) => {
    const data = event.data;
    if (data?.type === 'finished') {
      const cb = pending.shift();
      cb?.(data.payload);
    }
    // status-update messages are ignored for benchmarking.
  };
  worker.onerror = (err) => {
    console.error('worker error', err);
  };
  return {
    run (payload, settings) {
      return new Promise((resolve) => {
        pending.push(resolve);
        worker.postMessage({ type: 'calculate', payload, settings });
      });
    },
    terminate () {
      worker.terminate();
    },
  };
}

const cases = {
  level10: {
    figures: [0, 1],
    gameBoard: [[1,0,1],[1,0,1],[1,0,1]],
    puzzlePieces: [
      [[1,1,0],[0,1,1]],
      [[1,0],[1,1],[1,0]],
      [[1,0],[1,1],[1,0]],
      [[1,1],[1,1],[1,1]],
      [[1],[1]],
      [[1,1,1]],
      [[1,0],[1,1],[1,0]],
      [[0,1,1],[1,1,1]],
      [[1,0],[1,1],[1,0]],
      [[0,1,1],[1,1,1]],
      [[1,0],[1,1],[1,0]],
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

// Silence the JS solver's noisy logging.
const origLog = console.log;
console.log = () => {};

async function benchEngine (label, runFn, opts, runs) {
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
  origLog(
    `  ${label.padEnd(12)} best=${best.toFixed(1).padStart(8)}ms  ` +
    `median=${median.toFixed(1).padStart(8)}ms  ` +
    `solutions=${solutionsLen}  attempts=${meta.totalNumberOfIteratorPlacementAttempts}  ` +
    `skippedImpossible=${meta.skippedImpossibleSituations}`,
  );
  return { best, median, meta, solutionsLen };
}

const target = process.argv[2] || 'all';
const runs = Number(process.argv[3] || 3);
const engines = (process.argv[4] || 'both').toLowerCase();
const runWasm = engines === 'both' || engines === 'wasm';
const runJs   = engines === 'both' || engines === 'js';

origLog(`# Benchmark (target=${target}, runs=${runs}, engines=${engines})`);
origLog(`# Worker: ${path.relative(repoRoot, workerPath)}`);

let wasmRunner = null;
if (runWasm) {
  wasmRunner = makeWasmRunner();
  // Warm-up: discard the first round-trip, which includes wasm instantiate.
  origLog('# Warming up worker (wasm instantiate)...');
  await wasmRunner.run(cases.level10, { preparePossibleSolutionStarts: false });
}
if (runJs) {
  await solveJs(cases.level10, { preparePossibleSolutionStarts: false });
}

for (const [name, opts] of Object.entries(cases)) {
  if (target !== 'all' && target !== name) continue;
  origLog(`\n## ${name}`);
  const settings = { preparePossibleSolutionStarts: false };
  if (runJs)   await benchEngine('js',          (o) => solveJs(o, settings), opts, runs);
  if (runWasm) await benchEngine('wasm-worker', (o) => wasmRunner.run(o, settings), opts, runs);
}

wasmRunner?.terminate();
