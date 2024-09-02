export default defineEventHandler(async (event) => {
  const t0 = performance.now();

  type ClassArgs<T> = T extends new (...args: infer U) => any ? U : never;

  type PuzzleOptions = ClassArgs<typeof Puzzle>[0];

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

  const p2: PuzzleOptions = {
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

  const p3: PuzzleOptions = {
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

  const p4: PuzzleOptions = {
    figures: [0, 1],
    gameBoard: [
      [1, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 1, 1],
      [0, 0, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 0, 1],
      [2, 0, 0, 1, 0, 1],
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
        [0, 1, 0, 1],
        [0, 1, 1, 1],
      ],
      [
        [1, 1, 1, 1, 1, 1],
        [1, 1, 0, 0, 0, 1],
      ],
      [
        [1, 1],
        [1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
    ],
  };

  const p5: PuzzleOptions = {
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

  const p6: PuzzleOptions = {
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

  const puzzle = new Puzzle(p5);

  await puzzle.bruteForceSolution();
  console.log(puzzle.solutions.length, puzzle.solutions);
  puzzle.possibleSolutionStarts.length = 0;

  return {
    puzzle,
    calculationDuration: performance.now() - t0,
  };
});
