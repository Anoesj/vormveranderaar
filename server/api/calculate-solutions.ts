export default defineEventHandler(async (event) => {
  const t0 = performance.now();

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

  // Do not log anything for better speed.
  // console.log = () => {};

  const puzzle = new Puzzle(p18);

  await puzzle.bruteForceSolution();

  // TODO: Temporary. If not doing this, complex puzzles take way to long to stringify.
  // puzzle.possibleSolutionStarts.length = 0;

  return {
    puzzle,
    calculationDuration: performance.now() - t0,
  };
});
