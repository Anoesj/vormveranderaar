import ShapeshifterWorker from '@/utils/shapeshifterWorker?worker';

export type SolverSettings = {
  preparePossibleSolutionStarts: boolean;
};

type SliceResult = {
  solutions: unknown[];
  possibleSolutionStarts: unknown[];
  meta: Record<string, number | boolean>;
  // Other fields (figures, gameBoard, puzzlePieces, targetFigure) are the same in
  // every slice's payload — we just take them from worker 0's result.
  [key: string]: unknown;
};

/**
 * `true` when the browser exposes `SharedArrayBuffer`. Requires the COOP/COEP
 * headers in `app/public/_headers` to be honored, which Netlify does. In
 * `nuxt dev` we set the same headers in `nuxt.config.ts`.
 */
export function isCrossOriginIsolated () {
  return typeof SharedArrayBuffer !== 'undefined'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    && (globalThis as any).crossOriginIsolated === true;
}

/**
 * Recommended worker count for the parallel solver.
 *
 * `navigator.hardwareConcurrency` reports *logical* cores, which on most x86
 * machines means physical cores × 2 (SMT/hyperthreading). For our wasm brute
 * force — heavy random memory access — SMT siblings fight for the same L1/L2
 * cache and give close to zero additional throughput; using all logical cores
 * actually loses ground to the per-worker overhead.
 *
 * Heuristic: assume any `hc >= 8` machine has SMT (good guess for almost all
 * consumer x86 and the M-series chips where extra cores are E-cores anyway),
 * and use roughly half. For smaller machines, just use everything. Sanity-cap
 * at 16 against pathological values.
 */
export function recommendedWorkerCount () {
  const hc = (globalThis.navigator?.hardwareConcurrency ?? 1) | 0;
  const target = hc >= 8 ? Math.floor(hc / 2) : hc;
  return Math.max(1, Math.min(target, 16));
}

type MergedResult = {
  // Loose shape — the components only read fields, never call methods.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

type ProgressCallback = (status: string) => void;

export type ParallelSolveOptions = {
  payload: PuzzleOptions;
  settings: SolverSettings;
  numWorkers: number;
  signal?: AbortSignal;
  onStatus?: ProgressCallback;
};

// --- Persistent worker pool --------------------------------------------------
//
// Each worker pays a one-time wasm fetch + compile cost (~30-50 ms) when it
// starts. With N=16 workers and a fresh spawn on every Calculate, that cost
// dominates short puzzles — measurably 3x slower than the single-worker path
// for a 50 ms puzzle. Keeping workers warm across Calculates fixes it.
//
// The pool is reset when the requested size changes (toggle on, change worker
// count) and on abort (terminating workers is the only way to stop in-flight
// wasm — there's no cooperative cancellation handle).

let workerPool: InstanceType<typeof ShapeshifterWorker>[] | null = null;

export function ensureWorkerPool (size: number) {
  if (size <= 0) {
    releaseWorkerPool();
    return [];
  }
  if (!workerPool || workerPool.length !== size) {
    releaseWorkerPool();
    workerPool = Array.from({ length: size }, () => new ShapeshifterWorker());
  }
  return workerPool;
}

export function releaseWorkerPool () {
  if (workerPool) {
    for (const w of workerPool) {
      w.terminate();
    }
    workerPool = null;
  }
}

/**
 * Spawn `numWorkers` shapeshifter workers, hand each its depth-1 slice, collect
 * results and merge them into a single payload shaped like a regular `solve`
 * result. Uses a `SharedArrayBuffer` stop flag (if available) so the first
 * worker to find a solution can ask the others to bail mid-iteration when
 * `returningMaxOneSolution` is set on the puzzle.
 *
 * Workers come from a persistent pool (see `ensureWorkerPool`) so wasm init
 * is paid once per pool, not per Calculate.
 */
export async function parallelSolve ({
  payload,
  settings,
  numWorkers,
  signal,
  onStatus,
}: ParallelSolveOptions): Promise<MergedResult> {
  const isolated = isCrossOriginIsolated();
  const stopBuffer = isolated ? new Int32Array(new SharedArrayBuffer(4)) : undefined;
  const workers = ensureWorkerPool(numWorkers);

  const onAbort = () => {
    // Cancellation = terminate the pool. The next call will spin up a fresh
    // one and re-pay the wasm-init cost, but cancel is a rare event.
    releaseWorkerPool();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const sliceResults: SliceResult[] = new Array(numWorkers);
    let received = 0;
    let firstFoundAt = -1;

    const waitAll = new Promise<void>((resolve, reject) => {
      for (let i = 0; i < numWorkers; i++) {
        const worker = workers[i]!;

        worker.onmessage = (event) => {
          const data = event.data as {
            type: 'status-update';
            payload: string;
          } | {
            type: 'slice-finished';
            payload: SliceResult;
            workerIndex: number;
          };

          if (data.type === 'status-update') {
            onStatus?.(data.payload);
            return;
          }

          if (data.type === 'slice-finished') {
            sliceResults[data.workerIndex] = data.payload;

            // When the first worker reports a solution and we have a SAB to coordinate
            // with, flip the stop flag so the rest bail at the next 65k-attempt
            // checkpoint. Stop is only useful when returningMaxOneSolution is set,
            // because otherwise we still want all the solutions.
            const wantStopAfterFirstSolution = Boolean(data.payload.meta?.returningMaxOneSolution);
            if (
              wantStopAfterFirstSolution
              && firstFoundAt < 0
              && Array.isArray(data.payload.solutions)
              && data.payload.solutions.length > 0
              && stopBuffer
            ) {
              firstFoundAt = data.workerIndex;
              Atomics.store(stopBuffer, 0, 1);
            }

            received++;
            if (received === numWorkers) {
              resolve();
            }
            return;
          }
        };

        worker.onerror = (err) => {
          reject(err.error ?? new Error(String(err.message ?? err)));
        };

        worker.postMessage({
          type: 'calculate-slice',
          payload,
          settings,
          numWorkers,
          workerIndex: i,
          stopBuffer,
        });
      }
    });

    await waitAll;

    if (signal?.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }

    return mergeSliceResults(sliceResults);
  }
  finally {
    signal?.removeEventListener('abort', onAbort);
    // Clear listeners on the pool workers so a stale closure doesn't try to
    // resolve into the next Calculate's `Promise`. The workers themselves stay
    // warm in the pool.
    for (const w of workers) {
      w.onmessage = null;
      w.onerror = null;
    }
  }
}

/**
 * Combine N worker payloads (each shaped like a `solve` result) into one merged
 * payload. Solutions and possibleSolutionStarts are concatenated; numeric `meta`
 * fields are summed (counters) or carried over (totals/booleans).
 *
 * Only worker 0's response contains the puzzle-level fields (figures,
 * gameBoard, puzzlePieces, targetFigure). Workers 1..N return a slim payload
 * with just solutions/possibleSolutionStarts/meta so the orchestrator pays
 * one structured-clone of the big payload instead of N.
 */
function mergeSliceResults (results: SliceResult[]): MergedResult {
  // Worker 0 always carries the full puzzle payload — it's the template.
  // If for some reason worker 0 errored, fall back to any non-empty slice.
  const head = results[0] ?? results.find(Boolean)!;
  const merged: MergedResult = {
    ...head,
    solutions: [],
    possibleSolutionStarts: head.possibleSolutionStarts ?? [],
    meta: { ...head.meta },
  };

  // Counter fields summed across slices.
  const sumFields = new Set([
    'totalNumberOfTriedCombinations',
    'totalNumberOfIteratorPlacementAttempts',
    'skippedDuplicateSituations',
    'skippedImpossibleSituations',
  ]);

  // Reset summed counters; we'll re-accumulate.
  for (const f of sumFields) {
    merged.meta[f] = 0;
  }
  // Wall-clock duration: take the max — that's how long the user actually waited.
  merged.meta.calculationDuration = 0;

  for (const r of results) {
    if (!r) {
      continue;
    }
    if (Array.isArray(r.solutions)) {
      merged.solutions.push(...(r.solutions as unknown[]));
    }
    if (r.meta) {
      for (const f of sumFields) {
        const v = r.meta[f];
        if (typeof v === 'number') {
          merged.meta[f] = ((merged.meta[f] as number) ?? 0) + v;
        }
      }
      const dur = r.meta.calculationDuration;
      if (typeof dur === 'number' && dur > (merged.meta.calculationDuration as number)) {
        merged.meta.calculationDuration = dur;
      }
    }
  }

  // Recompute the derived fields against the merged totals.
  const total = (merged.meta.totalNumberOfPossibleCombinations as number) ?? 0;
  const skipped = (merged.meta.skippedImpossibleSituations as number) ?? 0;
  const duration = (merged.meta.calculationDuration as number) ?? 0;
  merged.meta.percentageOfPossibleCombinationsTried =
    total > 0 ? (skipped / total) * 100 : 0;
  merged.meta.throughput =
    duration > 0 ? Math.round(skipped / (duration / 1000)) : 0;

  return merged;
}
