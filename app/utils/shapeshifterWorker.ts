import init, { solve } from '../../wasm/solver/pkg/solver.js';
import wasmUrl from '../../wasm/solver/pkg/solver_bg.wasm?url';

let wasmReady: Promise<unknown> | null = null;

function ensureWasmReady () {
  if (!wasmReady) {
    wasmReady = init({ module_or_path: wasmUrl });
  }
  return wasmReady;
}

onmessage = async (event: MessageEvent<{
  type: 'calculate';
  payload: PuzzleOptions;
  settings: {
    preparePossibleSolutionStarts: boolean;
  };
}>) => {
  if (event.data.type === 'calculate') {
    console.log('Web Worker about to calculate the following situation:', event.data.payload);

    await ensureWasmReady();

    const statusCb = (msg: string) => {
      console.log(msg);
      postMessage({
        type: 'status-update',
        payload: msg,
      });
    };

    const result = solve(
      event.data.payload,
      event.data.settings,
      statusCb,
    );

    postMessage({
      type: 'finished',
      payload: result,
    });
  }
  else {
    throw new TypeError('Unknown message event type');
  }
};
