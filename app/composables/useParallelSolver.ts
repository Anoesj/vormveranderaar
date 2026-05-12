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
 * Recommended worker count for the parallel solver. Defers to
 * `navigator.hardwareConcurrency` with a sanity cap at 32 (just in case some
 * browser reports an absurd value). Returns 1 when threading isn't beneficial.
 *
 * Per-worker overhead is small (depth-0 root-piece duplication is microseconds,
 * wasm instantiate happens in parallel across workers, postMessage round-trips
 * are sub-millisecond) so the limiting factor is just physical/SMT cores —
 * which is exactly what `hardwareConcurrency` reflects.
 */
export function recommendedWorkerCount () {
  const hc = (globalThis.navigator?.hardwareConcurrency ?? 1) | 0;
  return Math.max(1, Math.min(hc, 32));
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

/**
 * Spawn `numWorkers` shapeshifter workers, hand each its depth-1 slice, collect
 * results and merge them into a single payload shaped like a regular `solve`
 * result. Uses a `SharedArrayBuffer` stop flag (if available) so the first
 * worker to find a solution can ask the others to bail mid-iteration when
 * `returningMaxOneSolution` is set on the puzzle.
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
  const workers: InstanceType<typeof ShapeshifterWorker>[] = [];

  const cleanup = () => {
    for (const w of workers) {
      w.terminate();
    }
    workers.length = 0;
  };

  signal?.addEventListener('abort', cleanup, { once: true });

  try {
    const sliceResults: SliceResult[] = new Array(numWorkers);
    let received = 0;
    let firstFoundAt = -1;

    const waitAll = new Promise<void>((resolve, reject) => {
      for (let i = 0; i < numWorkers; i++) {
        const worker = new ShapeshifterWorker();
        workers.push(worker);

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
    cleanup();
  }
}

/**
 * Combine N worker payloads (each shaped like a `solve` result) into one merged
 * payload. Solutions and possibleSolutionStarts are concatenated; numeric `meta`
 * fields are summed (counters) or carried over (totals/booleans).
 */
function mergeSliceResults (results: SliceResult[]): MergedResult {
  // The first non-empty slice is our template for fixed fields (figures,
  // gameBoard, puzzlePieces, targetFigure).
  const head = results.find(Boolean) ?? results[0]!;
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
