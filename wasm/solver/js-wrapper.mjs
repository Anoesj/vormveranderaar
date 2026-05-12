// JS solver wrapper for benchmarking. Imports the existing TypeScript Puzzle and
// stubs out the Nuxt auto-imports + worker-only globals so it runs under Bun.

import { MathHelper } from '../../server/utils/shapeshifter/MathHelper.ts';
import { keys, entries, fromEntries } from '../../server/utils/shapeshifter/objectHelpers.ts';

// Nuxt would auto-inject these globally; do it explicitly so the existing files resolve.
globalThis.MathHelper = MathHelper;
globalThis.keys = keys;
globalThis.entries = entries;
globalThis.fromEntries = fromEntries;

// `postMessage` is called from inside Puzzle.ts for status updates. In a worker
// context it's a global; under Bun running as a script it's not. No-op stub.
if (typeof globalThis.postMessage !== 'function') {
  globalThis.postMessage = () => {};
}

// `import.meta.client` is a Nuxt-injected boolean. Force `false` so memory tracking
// uses `process.memoryUsage` instead of the (worker-only) browser API.
// (We rely on the existing code path: `import.meta.client` is undefined here, which is falsy.)

const { Puzzle } = await import('../../server/utils/shapeshifter/Puzzle.ts');

export async function solveJs (puzzleOptions, settings = { preparePossibleSolutionStarts: false }) {
  const puzzle = new Puzzle(puzzleOptions);
  if (settings.preparePossibleSolutionStarts) {
    await puzzle.preparePossibleSolutionStarts();
  }
  await puzzle.bruteForceSolution();
  return puzzle;
}
