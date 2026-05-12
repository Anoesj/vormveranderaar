import init, { solve, solve_slice } from '../../wasm/solver/pkg/solver.js';
import wasmUrl from '../../wasm/solver/pkg/solver_bg.wasm?url';

let wasmReady: Promise<unknown> | null = null;

function ensureWasmReady () {
  if (!wasmReady) {
    wasmReady = init({ module_or_path: wasmUrl });
  }
  return wasmReady;
}

type CalculateMsg = {
  type: 'calculate';
  payload: PuzzleOptions;
  settings: {
    preparePossibleSolutionStarts: boolean;
  };
};

type CalculateSliceMsg = {
  type: 'calculate-slice';
  payload: PuzzleOptions;
  settings: {
    preparePossibleSolutionStarts: boolean;
  };
  numWorkers: number;
  workerIndex: number;
  /**
   * `Int32Array` view over a `SharedArrayBuffer` shared with the orchestrator.
   * Element 0 is the "stop" flag. We poll it from wasm with an `Atomics.load`
   * roughly every 65k brute-force attempts; the orchestrator sets it to `1`
   * when the first worker reports a solution.
   */
  stopBuffer?: Int32Array;
};

onmessage = async (event: MessageEvent<CalculateMsg | CalculateSliceMsg>) => {
  const { data } = event;

  if (data.type === 'calculate') {
    console.log('Web Worker about to calculate the following situation:', data.payload);

    await ensureWasmReady();

    const statusCb = (msg: string) => {
      console.log(msg);
      postMessage({
        type: 'status-update',
        payload: msg,
      });
    };

    const result = solve(
      data.payload,
      data.settings,
      statusCb,
    );

    postMessage({
      type: 'finished',
      payload: result,
    });
    return;
  }

  if (data.type === 'calculate-slice') {
    await ensureWasmReady();

    const { stopBuffer } = data;

    const statusCb = (msg: string) => {
      // When the wasm tells us it found a solution AND we're in
      // `returningMaxOneSolution` mode (shared SAB present means the
      // orchestrator wants early-stop), broadcast "everyone bail" *immediately*
      // by flipping the shared stop byte. Other workers see it on their next
      // ~65k-attempt poll. Without this the orchestrator only learns about the
      // solution after the finder's wasm has fully returned and postMessage'd
      // its result — by which time the others have done a lot of wasted work.
      if (stopBuffer && msg === 'Found solution!') {
        Atomics.store(stopBuffer, 0, 1);
      }

      // Multi-worker mode: every worker would emit identical "Still thinking" text
      // with slightly different counters. Forward only worker 0's messages so the UI
      // sees one stream, not N noisy duplicates.
      if (data.workerIndex === 0) {
        postMessage({
          type: 'status-update',
          payload: msg,
        });
      }
    };

    const stopCb = stopBuffer
      ? () => Atomics.load(stopBuffer, 0) !== 0
      : undefined;

    const result = solve_slice(
      data.payload,
      data.settings,
      statusCb,
      data.numWorkers,
      data.workerIndex,
      stopCb,
    );

    postMessage({
      type: 'slice-finished',
      payload: result,
      workerIndex: data.workerIndex,
    });
    return;
  }

  throw new TypeError(`Unknown message event type: ${(data as { type: string; }).type}`);
};
