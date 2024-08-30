import { Figure } from './Figure';
import { GameBoard } from './GameBoard';
import { PuzzlePiece } from './PuzzlePiece';
import { type GridLike, Grid } from './Grid';

export type CornerType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export type Position = [number, number];

type PossiblePuzzlePieceCombinationPart = {
  id: PuzzlePiece['id'];
  position: Position;
  affects: CornerType[];
};

type PossiblePuzzlePieceCombination = PossiblePuzzlePieceCombinationPart[];

type PuzzlePiecePlacementOptions = {
  puzzlePiece: PuzzlePiece;
  possiblePositions: Position[];
};

type PossibleSolutionPart = {
  id: PuzzlePiece['id'];
  position: Position;
  grid: Grid<number>;
  before?: Grid<number>;
  after?: Grid<number>;
  partOfPossibleSolution?: number;
};

type PossibleSolution = PossibleSolutionPart[];

type CornerInfo = {
  originalValue: number;
  targetValue: number;
  minimumTransformsNeeded: number;
  possibleTransforms?: number[];
  puzzlePiecesThatCanAffectState?: PuzzlePiece['id'][];
  possiblePuzzlePieceCombinations?: PossiblePuzzlePieceCombination[];
};

export class Puzzle {
  figures: Figure[];

  figuresCount: number;

  targetFigure: Figure;

  gameBoard: GameBoard;

  puzzlePieces: Record<string, PuzzlePiece> = {};

  puzzlePiecesCount: number;

  puzzlePiecesThatCannotAvoidCorners: PuzzlePiece['id'][];

  cornersInfo: Record<CornerType, CornerInfo> | undefined;

  possibleSolutionStarts: PossibleSolution[] = [];
  solutions: PossibleSolution[] = [];
  nonSolutions: PossibleSolution[] = [];

  constructor(options: {
    figures: Array<string | number>;
    gameBoard: GridLike<number>;
    puzzlePieces: GridLike<number>[];
  }) {
    this.figures = options.figures.map(
      (name, index) => new Figure(name, index)
    );

    this.figuresCount = this.figures.length;

    this.targetFigure = this.figures.at(-1)!;

    this.gameBoard = new GameBoard(options.gameBoard);

    for (const [i, puzzlePiece] of options.puzzlePieces.entries()) {
      const id = String.fromCharCode(97 + i).toUpperCase();
      this.puzzlePieces[id] = new PuzzlePiece(puzzlePiece, id, this.gameBoard);
    }

    this.puzzlePiecesCount = Object.values(this.puzzlePieces).length;

    this.puzzlePiecesThatCannotAvoidCorners = Object.values(this.puzzlePieces)
      .filter((p) => !p.canAvoidCorners)
      .map((p) => p.id);

    this.getMinimumTransformsNeededForCorners();
    this.getPossibleTransformsForCorners();
    this.getPuzzlePiecesWithActiveCorners();
    this.combineCornerOptions();
  }

  getMinimumTransformsNeededForCorners() {
    const { topLeft, topRight, bottomLeft, bottomRight } = this.gameBoard.grid;

    const createCornerInfo = (corner: number) => {
      const originalValue = corner;
      const targetValue = this.targetFigure.value;

      const cornerInfo: CornerInfo = {
        originalValue,
        targetValue,
        minimumTransformsNeeded: targetValue - originalValue,
      };

      if (cornerInfo.minimumTransformsNeeded < 0) {
        cornerInfo.minimumTransformsNeeded += this.figuresCount;
      }

      return cornerInfo;
    };

    this.cornersInfo = {
      topLeft: createCornerInfo(topLeft),
      topRight: createCornerInfo(topRight),
      bottomLeft: createCornerInfo(bottomLeft),
      bottomRight: createCornerInfo(bottomRight),
    };
  }

  getPossibleTransformsForCorners() {
    const { puzzlePiecesCount, figuresCount } = this;

    for (const cornerInfo of Object.values(this.cornersInfo!)) {
      cornerInfo.possibleTransforms = [];

      for (let i = 0; i <= puzzlePiecesCount; i++) {
        if (i % figuresCount === cornerInfo.minimumTransformsNeeded) {
          cornerInfo.possibleTransforms.push(i);
        }
      }
    }
  }

  getPuzzlePiecesWithActiveCorners() {
    const toBinary = (num: number) => num.toString(2);

    const get1CountRe = /1/g;
    const get1Count = (bin: string) => (bin.match(get1CountRe) || []).length;

    for (const [cornerType, cornerInfo] of Object.entries(this.cornersInfo!)) {
      cornerInfo.puzzlePiecesThatCanAffectState = Object.values(
        this.puzzlePieces
      )
        .filter(
          (puzzlePiece) => puzzlePiece.activeCorners[cornerType as CornerType]
        )
        .map((puzzlePiece) => puzzlePiece.id);

      cornerInfo.possiblePuzzlePieceCombinations = [];

      const optionsCount = cornerInfo.puzzlePiecesThatCanAffectState.length;

      let i = 0;
      while (i < 2 ** optionsCount) {
        const iBinary = toBinary(i);
        const i1Count = get1Count(iBinary);

        if (cornerInfo.possibleTransforms!.includes(i1Count)) {
          const combination: PossiblePuzzlePieceCombination = [];

          for (const [nthBit, bitValue] of iBinary
            .split('')
            .reverse()
            .entries()) {
            if (bitValue === '1') {
              const puzzlePieceId =
                cornerInfo.puzzlePiecesThatCanAffectState[nthBit];

              const puzzlePiece = this.puzzlePieces[puzzlePieceId];

              let position: Position;

              const affectedCorners: CornerType[] = [cornerType as CornerType];

              switch (cornerType as CornerType) {
                case 'topLeft':
                  position = [0, 0];

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.topRight) {
                    affectedCorners.push('topRight');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.bottomLeft) {
                    affectedCorners.push('bottomLeft');
                  }
                  break;
                case 'topRight':
                  position = [this.gameBoard.cols - puzzlePiece.grid.cols, 0];

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.topLeft) {
                    affectedCorners.push('topLeft');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.bottomRight) {
                    affectedCorners.push('bottomRight');
                  }
                  break;
                case 'bottomLeft':
                  position = [0, this.gameBoard.rows - puzzlePiece.grid.rows];

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.bottomRight) {
                    affectedCorners.push('bottomRight');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.topLeft) {
                    affectedCorners.push('topLeft');
                  }
                  break;
                case 'bottomRight':
                  position = [
                    this.gameBoard.cols - puzzlePiece.grid.cols,
                    this.gameBoard.rows - puzzlePiece.grid.rows,
                  ];

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.bottomLeft) {
                    affectedCorners.push('bottomLeft');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.topRight) {
                    affectedCorners.push('topRight');
                  }
                  break;
              }

              combination.push({
                id: puzzlePieceId,
                position,
                affects: affectedCorners,
              });
            }
          }

          combination.sort((a, b) => a.id.localeCompare(b.id, 'en'));

          cornerInfo.possiblePuzzlePieceCombinations!.push(combination);
        }

        i++;
      }
    }
  }

  combineCornerOptions() {
    /*
      Some notes:
      - We also include the possibility of a corner piece not being placed in a corner at all with this logic.
      - We take into account that some puzzle pieces will always hit one or more corners.
    */

    function getPartById(
      c: PossiblePuzzlePieceCombination,
      id: PuzzlePiece['id']
    ) {
      return c.find((part) => part.id === id);
    }

    function useSamePuzzlePieceOnDifferentPosition(
      c1: PossiblePuzzlePieceCombination,
      c2: PossiblePuzzlePieceCombination
    ): boolean {
      const intersection = intersect(c1, c2);

      if (!intersection.length) {
        return false;
      }

      for (const samePuzzlePieceId of intersection) {
        const part1 = getPartById(c1, samePuzzlePieceId)!;
        const part2 = getPartById(c2, samePuzzlePieceId)!;

        if (!hasEqualPosition(part1, part2)) {
          return true;
        }
      }

      return false;
    }

    function intersect<
      T1 extends PossiblePuzzlePieceCombination,
      T2 extends PossiblePuzzlePieceCombination
    >(arr1: T1, arr2: T2): (T1 | T2)[number]['id'][] {
      return arr1
        .filter((item1) => arr2.find((item2) => item2.id === item1.id))
        .map((item) => item.id);
    }

    function positionsEqual(p1: Position, p2: Position) {
      return p1[0] === p2[0] && p1[1] === p2[1];
    }

    function hasEqualPosition(
      part1: PossiblePuzzlePieceCombinationPart | PossibleSolutionPart,
      part2: PossiblePuzzlePieceCombinationPart | PossibleSolutionPart
    ) {
      return positionsEqual(part1.position, part2.position);
    }

    function possibleSolutionStartsEqual(
      s1: PossibleSolution,
      s2: PossibleSolution
    ) {
      for (const [i, p1] of s1.entries()) {
        const p2 = s2[i];

        if (!p2 || p1.id !== p2.id || !hasEqualPosition(p1, p2)) {
          return false;
        }
      }

      return true;
    }

    for (const topLeft of this.cornersInfo!.topLeft
      .possiblePuzzlePieceCombinations!) {
      for (const topRight of this.cornersInfo!.topRight
        .possiblePuzzlePieceCombinations!) {
        if (useSamePuzzlePieceOnDifferentPosition(topLeft, topRight)) {
          continue;
        }

        for (const bottomLeft of this.cornersInfo!.bottomLeft
          .possiblePuzzlePieceCombinations!) {
          if (
            useSamePuzzlePieceOnDifferentPosition(topLeft, bottomLeft) ||
            useSamePuzzlePieceOnDifferentPosition(topRight, bottomLeft)
          ) {
            continue;
          }

          for (const bottomRight of this.cornersInfo!.bottomRight
            .possiblePuzzlePieceCombinations!) {
            if (
              useSamePuzzlePieceOnDifferentPosition(topLeft, bottomRight) ||
              useSamePuzzlePieceOnDifferentPosition(topRight, bottomRight) ||
              useSamePuzzlePieceOnDifferentPosition(bottomLeft, bottomRight)
            ) {
              continue;
            }

            const combination = {
              topLeft,
              topRight,
              bottomLeft,
              bottomRight,
            };

            const corners = Object.values(combination);

            const allAffected = corners
              .flat()
              .flatMap((corner) => corner.affects);

            const affectedCounts: Record<CornerType, number> = {
              topLeft: 0,
              topRight: 0,
              bottomLeft: 0,
              bottomRight: 0,
            };

            for (const affected of allAffected) {
              affectedCounts[affected]++;
            }

            let isCompatible = Object.entries(affectedCounts).every(
              ([cornerType, affectedCount]) => {
                return this.cornersInfo![
                  cornerType as CornerType
                ].possibleTransforms!.includes(affectedCount);
              }
            );

            if (!isCompatible) {
              continue;
            }

            const possibleSolutionStart: PossibleSolution = [];

            let missingRequiredPuzzlePieces = structuredClone(
              this.puzzlePiecesThatCannotAvoidCorners
            );

            console.log(
              'We need at least these puzzle pieces:',
              structuredClone(missingRequiredPuzzlePieces)
            );

            for (const [
              cornerType,
              possiblePuzzlePieceCombination,
            ] of Object.entries(combination)) {
              for (const part of possiblePuzzlePieceCombination) {
                const puzzlePiece = this.puzzlePieces[part.id];

                missingRequiredPuzzlePieces =
                  missingRequiredPuzzlePieces.filter((p) => p !== part.id);

                possibleSolutionStart.push({
                  id: part.id,
                  position: part.position,
                  grid: puzzlePiece.at(part.position),
                  partOfPossibleSolution: this.possibleSolutionStarts.length,
                });
              }
            }

            if (missingRequiredPuzzlePieces.length) {
              console.log(
                'Discarded possible solution start (not all puzzle pieces that influence corners are used in the corners)',
                missingRequiredPuzzlePieces
              );
              continue;
            }

            possibleSolutionStart.sort((a, b) =>
              a.id.localeCompare(b.id, 'en')
            );

            if (
              this.possibleSolutionStarts.find((p) =>
                possibleSolutionStartsEqual(possibleSolutionStart, p)
              )
            ) {
              console.log('Discarded possible solution start (duplicate)');
              continue;
            }

            let previousGrid = this.gameBoard.grid;

            for (const part of possibleSolutionStart) {
              part.before = previousGrid.clone();

              part.after = previousGrid.stack(this.figuresCount, part.grid);

              previousGrid = part.after;
            }

            console.log('Added new possible solution start');

            this.possibleSolutionStarts.push(possibleSolutionStart);
          }
        }
      }
    }
  }

  async bruteForceSolution() {
    // Brute force solutions for every "possible solution start"
    for (const [
      i,
      possibleSolutionStart,
    ] of this.possibleSolutionStarts.entries()) {
      console.log(`\nBrute forcing from possible solution start #${i + 1}`);

      // If possible solution consist of no possible solution parts,
      // the solution is: do nothing. In that case, the grid after all changes
      // is the original game board.
      const gridSoFar =
        possibleSolutionStart.at(-1)?.after ?? this.gameBoard.grid;

      gridSoFar.checkIsSolution(this.targetFigure.value);

      console.log('Grid so far:', gridSoFar.toString());

      const unusedPuzzlePieces = Object.values(this.puzzlePieces).filter(
        (p1) => !possibleSolutionStart.find((p2) => p1.id === p2.id)
      );

      if (!unusedPuzzlePieces.length) {
        console.log(
          'No unused puzzle pieces, checking if we reached a solution already'
        );

        if (gridSoFar.isSolution) {
          console.log('Found solution!');

          this.solutions.push(possibleSolutionStart);

          continue;
        }

        console.log('No solutions found for this possible solution start');

        continue;
      }

      const puzzlePiecesPlacementOptions: PuzzlePiecePlacementOptions[] =
        unusedPuzzlePieces.map((puzzlePiece) => ({
          puzzlePiece,
          possiblePositions: puzzlePiece.getPossiblePositions(),
        }));

      console.log(
        'Puzzle pieces placement options:',
        puzzlePiecesPlacementOptions.map((p) => ({
          id: p.puzzlePiece.id,
          options: p.possiblePositions,
        }))
      );

      const currentPuzzlePiecePlacementOptions =
        puzzlePiecesPlacementOptions.shift()!;

      for (const possibleSolution of this.puzzlePiecePlacementOptionsIterator({
        gameBoardGrid: gridSoFar.clone(),
        baseSolution: possibleSolutionStart,
        current: currentPuzzlePiecePlacementOptions,
        next: puzzlePiecesPlacementOptions,
      })) {
        // Use last entry of solution '.after' grid to check if solution passes.
        const resultGrid = possibleSolution.at(-1)!.after!;

        resultGrid.checkIsSolution(this.targetFigure.value);

        if (resultGrid.isSolution) {
          console.log('Found solution!', possibleSolution.at(-1)!.after);

          this.solutions.push(possibleSolution);

          continue;
        }

        this.nonSolutions.push(possibleSolution);

        console.log('Calculated result is not the completed puzzle.');
      }
    }
  }

  *puzzlePiecePlacementOptionsIterator({
    gameBoardGrid,
    baseSolution,
    current,
    next,
  }: {
    gameBoardGrid: Grid<number>;
    baseSolution: PossibleSolution;
    current: PuzzlePiecePlacementOptions;
    next: PuzzlePiecePlacementOptions[];
  }): Generator<PossibleSolution> {
    const { puzzlePiece, possiblePositions } = current;

    for (const position of possiblePositions) {
      const grid = puzzlePiece.at(position);

      const after = gameBoardGrid.stack(this.figuresCount, grid);

      const result: PossibleSolution = [
        ...baseSolution,
        {
          id: puzzlePiece.id,
          position,
          grid,
          before: gameBoardGrid.clone(),
          after,
        },
      ];

      if (next.length) {
        const [newCurrent, ...newNext] = next;

        for (const nestedResult of this.puzzlePiecePlacementOptionsIterator({
          gameBoardGrid: after,
          baseSolution: result,
          current: newCurrent,
          next: newNext,
        })) {
          // It's possible we need to use "yield *" here, because we use nested generators.
          yield nestedResult;
        }

        continue;
      }

      yield result;
    }
  }
}
