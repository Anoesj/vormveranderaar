/* eslint-disable @typescript-eslint/no-unused-vars */

export default defineEventHandler(async (event) => {
  // const { res } = event.node;

  // res.writeHead(200, {
  //   'Content-Type': 'text/plain',
  //   // 'Content-Type': 'application/json',
  //   'Transfer-Encoding': 'chunked',
  // });

  // let puzzle: InstanceType<typeof Puzzle> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ClassArgs<T> = T extends new (...args: infer U) => any ? U : never;

  type PuzzleOptions = ClassArgs<typeof Puzzle>[0];

  // ✅ Works
  const p1: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [1, 1, 1, 1],
      [1, 1, 0, 0],
      [1, 0, 1, 1],
      [1, 1, 1, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
      [
        [1, 1],
      ],
    ],
  };

  // ✅ Works
  const p2: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [1, 1, 1, 1],
      [1, 1, 1, 0],
      [1, 0, 0, 1],
      [1, 0, 1, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
      [
        [1, 1],
      ],
      [
        [1],
      ],
      [
        [1, 1],
      ],
    ],
  };

  // ✅ Works
  const p3: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [2, 2],
      [2, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p4: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [2, 2, 2],
      [2, 1, 2],
      [2, 2, 2],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p5: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [2, 2, 1],
      [2, 1, 2],
      [2, 2, 2],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p6: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [2, 2, 2],
      [2, 0, 2],
      [2, 2, 2],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p8: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [2, 2, 2, 2],
      [2, 2, 2, 0],
      [2, 2, 2, 2],
      [1, 2, 2, 2],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
      [
        [1],
      ],
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p9: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [2, 2, 2, 2],
      [1, 1, 1, 0],
      [2, 2, 2, 2],
      [1, 2, 2, 2],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1, 1, 1],
      ],
      [
        [1],
      ],
      [
        [1],
      ],
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p10: PuzzleOptions = {
    figures: [0, 1, 2],
    gameBoard: [
      [1, 1, 1, 1],
      [2, 2, 2, 0],
      [2, 2, 2, 2],
      [1, 2, 2, 2],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1, 1, 1, 1],
      ],
      // [
      //   [1, 1, 1],
      // ],
      [
        [1],
      ],
      [
        [1],
      ],
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p16: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [0, 0, 0],
      [0, 1, 1],
      [0, 1, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
        [1],
      ],
      [
        [1, 1]
      ],
      [
        [1],
      ],
    ],
  };

  // ✅ Works
  const p17: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [1, 1, 1],
      [0, 0, 1],
      [1, 0, 0],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
      ],
      [
        [1],
      ],
      [
        [1],
        [1],
        [1],
      ],
      [
        [1, 1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ],
  };

  // ❌ Too complex, somewhere around possible solution start #208/388, it just stops calculating.
  const p18: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [1, 0, 0, 1, 0, 1],
      [0, 1, 0, 0, 1, 1],
      [0, 0, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 0, 1],
      [1, 0, 0, 1, 0, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [0, 1, 1, 1],
        [1, 1, 0, 1],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
      ],
      [
        [0, 1, 0, 0, 0],
        [0, 1, 1, 1, 1],
        [1, 1, 0, 1, 0],
        [0, 1, 0, 1, 1],
      ],
      [
        [1, 1, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
        [0, 0, 1, 0],
      ],
      [
        [1, 1, 0, 1],
        [0, 1, 1, 1],
        [1, 1, 1, 0],
        [1, 0, 1, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [1, 1, 0],
      ],
      [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 1],
        [0, 0, 1, 0, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 1],
        [1, 0, 1],
      ],
      [
        [0, 0, 1],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
        [0, 0, 1, 0],
      ],
      [
        [0, 1, 0, 1],
        [1, 1, 0, 1],
        [0, 1, 1, 1],
        [1, 1, 0, 0],
      ],
      [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 1],
        [0, 0, 1, 0, 0],
      ],
    ],
  };

  // ✅ There's definitely no solution to be found here.
  const p19: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [1, 1, 1],
      ],
      [
        [1],
        [1],
        [1],
      ],
    ],
  };

  const puzzle = new Puzzle({
    figures: [0, 1],
    gameBoard: [
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 0],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [0, 1],
        [1, 1],
        [0, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [1, 1],
        [1, 0],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [1],
        [1],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
    ],
  });

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
