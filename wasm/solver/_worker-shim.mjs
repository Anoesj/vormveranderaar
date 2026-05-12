// Bun-side shim that lets us load the production-built shapeshifter worker without a
// browser. The Vite-emitted IIFE assumes `self.location.href` to resolve its sibling
// `solver_bg-*.wasm`; Bun's Worker globals don't include `self.location`, so we fake
// it here, then evaluate the IIFE body in the worker's global scope. Bun's `fetch`
// supports `file://` URLs natively, so the wasm just loads from disk.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const distNuxt = path.resolve(import.meta.dirname, '..', '..', 'dist', '_nuxt');
const workerFile = fs
  .readdirSync(distNuxt)
  .find((f) => /^shapeshifterWorker-.*\.js$/.test(f));

if (!workerFile) {
  throw new Error(`No built worker found in ${distNuxt} — run \`bun --bun nuxt build\` first.`);
}

const fullPath = path.join(distNuxt, workerFile);

// eslint-disable-next-line no-global-assign
self.location = new URL(pathToFileURL(fullPath).href);

// The worker is chatty: silence console output so the bench is readable.
// `BENCH_VERBOSE=1` re-enables the worker logs if you need to debug.
if (!process.env.BENCH_VERBOSE) {
  // eslint-disable-next-line no-empty-function
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.info = noop;
}

const code = fs.readFileSync(fullPath, 'utf8');
new Function(code)();
