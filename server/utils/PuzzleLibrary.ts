// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClassArgs<T> = T extends new (...args: infer U) => any ? U : never;

export type PuzzleOptions = ClassArgs<typeof Puzzle>[0];

export const PuzzleLibrary = {
  // ✅ Works
  p1: {
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
  },

  // ✅ Works
  p2: {
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
  },

  // ✅ Works
  p3: {
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
  },

  // ✅ Works
  p4: {
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
  },

  // ✅ Works
  p5: {
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
  },

  // ✅ Works
  p6: {
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
  },

  // ✅ Works
  p8: {
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
  },

  // ✅ Works
  p9: {
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
  },

  // ✅ Works
  p10: {
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
  },

  // ✅ Works
  p16: {
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
  },

  // ✅ Works
  p17: {
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
  },

  // ❌ Too complex, somewhere around possible solution start #208/388, it just stops calculating.
  p18: {
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
  },

  // ✅ There's definitely no solution to be found here.
  p19: {
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
  },

  level7: {
    figures: [0, 1],
    gameBoard: [
      [0, 0, 0],
      [1, 0, 1],
      [0, 1, 0],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [1, 1],
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1, 1],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1],
        [1, 1],
        [0, 1],
      ],
      [
        [0, 1],
        [1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [1, 1, 1],
        [0, 1, 0],
      ],
    ],
  },

  level8: {
    figures: [0, 1],
    gameBoard: [
      [1, 1, 1],
      [1, 1, 1],
      [0, 0, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1],
        [1],
      ],
      [
        [1, 1],
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [1, 1, 1],
      ],
      [
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1],
        [1, 1],
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
    ],
  },

  level9: {
    figures: [0, 1],
    gameBoard: [
      [0, 1, 1],
      [0, 0, 0],
      [1, 0, 0],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [1],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [1],
      ],
      [
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [0, 1],
        [1, 1],
        [0, 1],
      ],
      [
        [1, 1],
      ],
      [
        [0, 1],
        [1, 1],
      ],
    ],
  },

  level10: {
    figures: [0, 1],
    gameBoard: [
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
    ],
    // prettier-ignore
    puzzlePieces: [
      [
        [1, 1, 0],
        [0, 1, 1],
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
        [1, 1],
        [1, 1],
      ],
      [
        [1],
        [1],
      ],
      [
        [1, 1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
      [
        [0, 1, 1],
        [1, 1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 0],
      ],
    ],
  },
} satisfies Record<string, PuzzleOptions>;