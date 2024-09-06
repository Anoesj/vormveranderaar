/* eslint-disable @typescript-eslint/no-unused-vars */

export default defineEventHandler(async (event) => {
  // Get event data, which is in the form of PuzzleOptions.
  const body = await readBody<PuzzleOptions>(event);

  const abortController = new AbortController;

  // const { res, req } = event.node;

  // const oldResEmit = res.emit;
  // res.emit = (function () {
  //   console.log(arguments);
  //   oldResEmit.apply(res, arguments);
  // }) as unknown as typeof oldResEmit;

  // res.once('close', () => {
  //   if (res.writableFinished) {
  //     console.log('!!!!!!!!! Request done !!!!!!!!!!!');
  //   }
  //   else {
  //     console.log('!!!!!!!!! Request aborted (res) !!!!!!!!!!!');

  //     // TODO: Can we get the reason from the event?
  //     abortController.abort('Unknown');
  //     // process.exit(1);
  //   }
  // });

  // const oldReqEmit = req.emit;
  // req.emit = (function () {
  //   console.log(arguments);
  //   oldReqEmit.apply(req, arguments);
  // }) as unknown as typeof oldReqEmit;

  // req.on('close', () => {
  //   console.log('!!!!!!!!! Request aborted (req) !!!!!!!!!', event);

  //   // TODO: Can we get the reason from the event?
  //   abortController.abort('Unknown');
  //   // process.exit(1);
  // });

  const puzzleOptions = body || PuzzleLibrary.level10;

  // // NOTE: Instead of chunked transfers, we can use SSE (https://h3.unjs.io/guide/websocket#server-sent-events-sse), web sockets or JSON streaming.
  // res.writeHead(200, {
  //   'Content-Type': 'text/plain',
  //   // 'Content-Type': 'application/json',
  //   'Transfer-Encoding': 'chunked',
  // });

  const puzzle = new Puzzle(puzzleOptions, abortController);
  await puzzle.preparePossibleSolutionStarts();

  // function writeChunk() {
  //   // res.write(JSON.stringify(puzzle, null, 2));
  //   res.write('___PUZZLE___' + JSON.stringify(puzzle));
  // }

  // writeChunk();

  // const iterator = puzzle.bruteForceSolution();
  // // const iterator = puzzle.bruteForceSolution({ from: 747, to: 748 });
  // // // const iterator = puzzle.bruteForceSolution({ from: 387, to: 388 });

  // // // const t0 = performance.now();
  // for await (const _success of iterator) {
  //   // if (performance.now() - t0 > 2000) {
  //   //   writeChunk();
  //   // }
  // }

  // writeChunk();

  // TODO: Temporary. If not doing this, complex puzzles take way to long to stringify.
  // puzzle.possibleSolutionStarts.length = 0;

  // res.end();

  return puzzle;
});
