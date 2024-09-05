/* eslint-disable @typescript-eslint/no-unused-vars */

export default defineEventHandler(async (event) => {
  // Get event data, which is in the form of PuzzleOptions.
  const body = await readBody<PuzzleOptions>(event);

  const puzzleOptions = body || PuzzleLibrary.level10;

  // const { res } = event.node;

  // res.writeHead(200, {
  //   'Content-Type': 'text/plain',
  //   // 'Content-Type': 'application/json',
  //   'Transfer-Encoding': 'chunked',
  // });

  // let puzzle: InstanceType<typeof Puzzle> | undefined;

  const puzzle = new Puzzle(puzzleOptions);

  // function writeChunk() {
  //   // res.write(JSON.stringify(puzzle, null, 2));
  //   res.write('___PUZZLE___' + JSON.stringify(puzzle));
  // }

  // writeChunk();

  const iterator = puzzle.bruteForceSolution();
  // const iterator = puzzle.bruteForceSolution({ from: 747, to: 748 });
  // // const iterator = puzzle.bruteForceSolution({ from: 387, to: 388 });

  // // const t0 = performance.now();
  for await (const _success of iterator) {
    // if (performance.now() - t0 > 2000) {
    //   writeChunk();
    // }
  }

  // writeChunk();

  // TODO: Temporary. If not doing this, complex puzzles take way to long to stringify.
  // puzzle.possibleSolutionStarts.length = 0;

  // res.end();

  return puzzle;
});
