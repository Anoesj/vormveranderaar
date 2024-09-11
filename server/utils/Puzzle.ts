import { z } from 'zod';

// import { heapStats } from 'bun:jsc';
// import { generateHeapSnapshot } from 'bun';
// import { setFlagsFromString } from 'v8';
// import { runInNewContext } from 'vm';

import { Figure } from './Figure';
import { GameBoard } from './GameBoard';
import { PuzzlePiece } from './PuzzlePiece';
import { Position } from './Position';
import type { GridLike } from './Grid';
import { PossibleSolution, type PuzzlePiecePlacementOptions } from './PossibleSolution';

export type CornerType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

type PossiblePuzzlePieceCombinationPart = {
  id: PuzzlePiece['id'];
  position: Position;
  affects: CornerType[];
};

type PossiblePuzzlePieceCombination = PossiblePuzzlePieceCombinationPart[];

type CornerInfo = {
  originalValue: number;
  targetValue: number;
  minimumTransformsNeeded: number;
  possibleTransforms?: number[];
  puzzlePiecesThatCanAffectState?: PuzzlePiece['id'][];
  possiblePuzzlePieceCombinations?: PossiblePuzzlePieceCombination[];
};

const numberFormatter = new Intl.NumberFormat('nl-NL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export class Puzzle {
  figures: Figure[];
  figuresCount: number;
  targetFigure: Figure;

  gameBoard: GameBoard;

  puzzlePieces: Record<string, PuzzlePiece> = {};
  puzzlePiecesCount: number;
  puzzlePiecesThatCannotAvoidAnyCorners: PuzzlePiece['id'][];

  cornersInfo: Record<CornerType, CornerInfo> | undefined;

  possibleSolutionStarts: PossibleSolution[] = [];
  solutions: PossibleSolution[] = [];

  #uniqueSituations = new Set<string>();
  // #maxMemoryUsageInGB = 2;
  // #lastSkippedDuplicateSituations = 0;
  #hasPreparedSolutionStarts = false;

  /**
   * The number of cells that can be influenced from every number of puzzle pieces left.
   */
  #maxCellsInfluencedPerPuzzlePiecesLeft: Map<number, number> = new Map;

  meta: {
    totalNumberOfPossibleCombinations: number;
    totalNumberOfTriedCombinations: number;
    totalNumberOfIteratorPlacementAttempts: number;
    returningMaxOneSolution?: boolean;
    skippedDuplicateSituations: number;
    skippedImpossibleSituations: number;
    maxMemoryUsed: number;
    reachedMaxMemory?: boolean;
    calculationDuration: number;
  } = {
    totalNumberOfPossibleCombinations: 0,
    totalNumberOfTriedCombinations: 0,
    totalNumberOfIteratorPlacementAttempts: 0,
    returningMaxOneSolution: false,
    skippedDuplicateSituations: 0,
    skippedImpossibleSituations: 0,
    maxMemoryUsed: 0,
    reachedMaxMemory: false,
    calculationDuration: 0,
  };

  #timings: {
    tStart: number;
    tPrepareSolutionStartsStart: number | null;
    tPrepareSolutionStartsEnd: number | null;
    tBruteForceStart: number | null;
    tBruteForceEnd: number | null;
    tEnd: number | null;
  } = {
    tStart: performance.now(),
    tPrepareSolutionStartsStart: null,
    tPrepareSolutionStartsEnd: null,
    tBruteForceStart: null,
    tBruteForceEnd: null,
    tEnd: null,
  };

  #perf: {
    toEmptyGameBoardWithPuzzlePieceAt: number[];
    gameBoardClone: number[];
    gameBoardStack: number[];
    calculatedSameSituationBefore: number[];
    possibleSolutionClone: number[];
    countIncorrectCells: number[];
    getNextPuzzlePiecesMaxInfluencedCells: number[];
  } = {
    toEmptyGameBoardWithPuzzlePieceAt: [],
    gameBoardClone: [],
    gameBoardStack: [],
    calculatedSameSituationBefore: [],
    possibleSolutionClone: [],
    countIncorrectCells: [],
    getNextPuzzlePiecesMaxInfluencedCells: [],
  };

  #loggingDisabled = false;

  constructor (options: {
    figures: Array<string | number>;
    gameBoard: GridLike<number>;
    puzzlePieces: GridLike<number>[];
  }) {
    console.log('\nYum, a puzzle to chew on!');

    this.#validate(options);

    this.figures = options.figures.map((name, index) => new Figure(name, index));

    this.figuresCount = this.figures.length;

    this.targetFigure = this.figures.at(-1)!;

    this.gameBoard = new GameBoard(options.gameBoard);

    for (const [i, puzzlePieceGrid] of options.puzzlePieces.entries()) {
      const id = String.fromCharCode(97 + i).toUpperCase();
      this.puzzlePieces[id] = new PuzzlePiece(
        puzzlePieceGrid,
        id,
        this.gameBoard,
      );
    }

    const puzzlePieces = Object.values(this.puzzlePieces);

    console.log('\nFigures:', this.figures.map(f => f.toString()).join(', '));
    console.log('\nGame board:', this.gameBoard.toString());
    console.log('\nPuzzle pieces:');
    for (const puzzlePiece of puzzlePieces) {
      console.log(`\n${puzzlePiece.id}`);
      console.log(puzzlePiece.grid.toString());
    }

    this.puzzlePiecesCount = puzzlePieces.length;

    this.puzzlePiecesThatCannotAvoidAnyCorners = puzzlePieces
      .filter((p) => !p.canAvoidAffectingSomeCorners)
      .map((p) => p.id);

    this.meta.totalNumberOfPossibleCombinations = MathHelper.product(puzzlePieces.map(p => p.possiblePositions.length));

    this.meta.returningMaxOneSolution = this.meta.totalNumberOfPossibleCombinations > 1_000_000;

    console.log('\nTotal number of possible combinations:', numberFormatter.format(this.meta.totalNumberOfPossibleCombinations));

    this.#getMinimumTransformsNeededForCorners();
    this.#getPossibleTransformsForCorners();
    this.#getPuzzlePiecesWithActiveCorners();
  }

  #validate (options: ConstructorParameters<typeof Puzzle>[0]) {
    z.object({
      figures: z.array(z.union([z.string(), z.number()])),
      gameBoard: z.array(z.array(z.number().nonnegative())),
      puzzlePieces: z.array(z.array(z.array(z.union([z.literal(0), z.literal(1)])))),
    }).parse(options);
  }

  // NOTE: Async so we can hopefully interrupt this function with the this.#abortController later on.
  async preparePossibleSolutionStarts () {
    this.#timings.tPrepareSolutionStartsStart = performance.now();

    /*
      Some notes:
      - We also include the possibility of a corner piece not being placed in a corner at all with this logic.
      - We take into account that some puzzle pieces will always hit one or more corners.
    */

    function getPartById(
      c: PossiblePuzzlePieceCombination,
      id: PuzzlePiece['id'],
    ) {
      return c.find((part) => part.id === id);
    }

    function compatible(data: Partial<Record<CornerType, PossiblePuzzlePieceCombination>>): boolean {
      const keys = Object.keys(data) as CornerType[];
      const keyCorner1 = keys[0]!;
      const keyCorner2 = keys[1]!;
      const combinationCorner1 = data[keyCorner1]!;
      const combinationCorner2 = data[keyCorner2]!;

      // Check if the combination for corner 1 contains any puzzle pieces that would affect
      // corner 2 too, while the combination for corner 2 doesn't use those puzzle pieces.
      for (const part of combinationCorner1) {
        if (part.affects.includes(keyCorner2) && !combinationCorner2.find((p) => p.id === part.id)) {
          return false;
        }
      }

      // Check if the combination for corner 2 contains any puzzle pieces that would affect
      // corner 1 too, while the combination for corner 1 doesn't use those puzzle pieces.
      for (const part of combinationCorner2) {
        if (part.affects.includes(keyCorner1) && !combinationCorner1.find((p) => p.id === part.id)) {
          return false;
        }
      }

      // Checks if a and b use the same puzzle piece(s), but with different positions.
      // If so, return false.
      const intersection = intersect(combinationCorner1, combinationCorner2);

      if (!intersection.length) {
        return true;
      }

      for (const samePuzzlePieceId of intersection) {
        const part1 = getPartById(combinationCorner1, samePuzzlePieceId)!;
        const part2 = getPartById(combinationCorner2, samePuzzlePieceId)!;

        if (part1.position !== part2.position) {
          return false;
        }
      }

      return true;
    }

    function intersect<
      T1 extends PossiblePuzzlePieceCombination,
      T2 extends PossiblePuzzlePieceCombination,
    >(arr1: T1, arr2: T2): (T1 | T2)[number]['id'][] {
      return arr1
        .filter((item1) => arr2.find((item2) => item2.id === item1.id))
        .map((item) => item.id);
    }

    for (const topLeft of this.cornersInfo!.topLeft.possiblePuzzlePieceCombinations!) {
      // if (await this.#checkRequestIsCanceled()) return;

      for (const topRight of this.cornersInfo!.topRight.possiblePuzzlePieceCombinations!) {
        // if (await this.#checkRequestIsCanceled()) return;

        if (!compatible({ topLeft, topRight })) {
          continue;
        }

        for (const bottomLeft of this.cornersInfo!.bottomLeft.possiblePuzzlePieceCombinations!) {
          // if (await this.#checkRequestIsCanceled()) return;

          if (
            !compatible({ topLeft, bottomLeft })
            || !compatible({ topRight, bottomLeft })
          ) {
            continue;
          }

          for (const bottomRight of this.cornersInfo!.bottomRight.possiblePuzzlePieceCombinations!) {
            // if (await this.#checkRequestIsCanceled()) return;

            if (
              !compatible({ topLeft, bottomRight })
              || !compatible({ topRight, bottomRight })
              || !compatible({ bottomLeft, bottomRight })
            ) {
              continue;
            }

            if (this.possibleSolutionStarts.length === 500) {
              console.log('Disabling logging possible solution starts, because there are too many of them.');
              this.#loggingDisabled = true;
            }

            const combination = {
              topLeft,
              topRight,
              bottomLeft,
              bottomRight,
            };

            const allPuzzlePiecesAffectingCorners = Object.values(combination)
              // Throw all puzzle pieces in one array.
              .flat()
              // Dedupe by puzzle piece ID. This prevents their 'affects' to be counted multiple times.
              .filter((item, pos, self) => {
                return self.findIndex((i) => i.id === item.id) === pos;
              });

            const allAffected = allPuzzlePiecesAffectingCorners
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

            const affectedCountsCompatible = Object.entries(affectedCounts)
              .every(([cornerType, affectedCount]) => {
                return this.cornersInfo![cornerType as CornerType].possibleTransforms!.includes(affectedCount);
              });

            if (!affectedCountsCompatible) {
              this.#maybeLog(() => console.log(
                'Discarded possible solution start, because not all corners are affected by the puzzle pieces the right number of times:',
                affectedCounts,
              ));

              continue;
            }

            const possibleSolutionStart = new PossibleSolution(this.targetFigure.value);

            let missingRequiredPuzzlePieces = [...this.puzzlePiecesThatCannotAvoidAnyCorners];

            for (const part of allPuzzlePiecesAffectingCorners) {
              const puzzlePiece = this.puzzlePieces[part.id]!;

              missingRequiredPuzzlePieces = missingRequiredPuzzlePieces
                .filter((p) => p !== part.id);

              possibleSolutionStart.add({
                id: part.id,
                position: part.position,
                grid: puzzlePiece.toEmptyGameBoardWithPuzzlePieceAt(part.position),
              });
            }

            if (missingRequiredPuzzlePieces.length) {
              // this.#maybeLog(
              //   () => console.log(
              //     'Discarded possible solution start, because not all puzzle pieces that affect corners are used in the corners:',
              //     missingRequiredPuzzlePieces,
              //   ),
              //   // () => console.log('Discarded possible solution start, because not all puzzle pieces that affect corners are used in the corners'),
              // );

              continue;
            }

            possibleSolutionStart.sortAlphabetically();

            if (this.possibleSolutionStarts.find((other) => possibleSolutionStart.equals(other))) {
              console.log('Discarded possible solution start (duplicate)');
              continue;
            }

            let previousGameBoard = this.gameBoard;

            for (const part of possibleSolutionStart.parts) {
              part.before = previousGameBoard.clone();
              part.after = previousGameBoard.stack(this.figuresCount, part.grid);
              previousGameBoard = part.after;
            }

            this.possibleSolutionStarts.push(possibleSolutionStart);

            // Fallback log so we do see something, but it doesn't really affect performance.
            console.log(`\nAdded new possible solution start (#${this.possibleSolutionStarts.length})`);
            // this.#maybeLog(
            //   () => console.log(`\nAdded new possible solution start (#${this.possibleSolutionStarts.length})`),
            //   () => console.log('Added new possible solution start'),
            // );

            // this.#maybeLog(() => console.log(possibleSolutionStart.toString()));
          }
        }
      }
    }

    const puzzlePieces = Object.values(this.puzzlePieces);
    for (const possibleSolutionStart of this.possibleSolutionStarts) {
      possibleSolutionStart.getContinuationInfo(puzzlePieces, true);
    }

    // Sort possible solution starts by length of the array.
    // We want to brute force the possible solution starts that
    // have the least amount of possible combinations first.
    this.possibleSolutionStarts.sort((a, b) => a.continuationInfo!.unusedPuzzlePiecesPossibleCombinations
      - b.continuationInfo!.unusedPuzzlePiecesPossibleCombinations);

    // We need to add the index after the sorting.
    for (const [index, possibleSolutionStart] of this.possibleSolutionStarts.entries()) {
      possibleSolutionStart.solutionStartIndex = index;

      for (const part of possibleSolutionStart.parts) {
        part.partOfPossibleSolutionStart = index;
      }
    }

    if (this.possibleSolutionStarts.length > 500) {
      this.meta.returningMaxOneSolution = true;
    }

    this.#hasPreparedSolutionStarts = true;
    this.#timings.tPrepareSolutionStartsEnd = performance.now();

    console.log(`\nPrepared ${this.possibleSolutionStarts.length} possible solution starts.`);
    this.#logTimeToPrepareSolutionStarts();
  }

  async bruteForceSolution ({
    possibleSolutionStarts = this.possibleSolutionStarts,
    from = 0,
    to,
  } : {
    possibleSolutionStarts?: PossibleSolution[];
    from?: number;
    to?: number;
  } = {}): Promise<void> {
    this.#timings.tBruteForceStart = performance.now();

    // This allows us to skip preparing the possible solution starts
    // if that's more feasible performance-wise.
    if (!this.#hasPreparedSolutionStarts) {
      const blankSolutionStart = new PossibleSolution(this.targetFigure.value)
      blankSolutionStart.solutionStartIndex = 0;
      this.possibleSolutionStarts.push(blankSolutionStart);
    }

    // Brute force solutions for every "possible solution start"
    const possibleSolutionStartsCount = possibleSolutionStarts.length;
    const puzzlePieces = Object.values(this.puzzlePieces);

    const iEnd = Math.min(to ?? possibleSolutionStartsCount, possibleSolutionStartsCount);

    for (let i = from; i < iEnd; i++) {
      console.log('\nNumber of tried combinations so far:', numberFormatter.format(this.meta.totalNumberOfTriedCombinations));
      this.#logSkippedSituations();
      await this.#checkMemoryUsage();

      const possibleSolutionStart = possibleSolutionStarts[i]!;

      const {
        unusedPuzzlePiecesPlacementOptions,
        unusedPuzzlePiecesCount,
        unusedPuzzlePiecesPossibleCombinations,
      } = possibleSolutionStart.getContinuationInfo(puzzlePieces, this.#hasPreparedSolutionStarts);

      console.log(`\nBrute forcing from possible solution start #${i + 1}/${possibleSolutionStartsCount} (${numberFormatter.format(unusedPuzzlePiecesPossibleCombinations)} possible combinations)`);
      this.#maybeLog(() => console.log('Unused puzzle pieces:', unusedPuzzlePiecesCount === 0 ? '-' : `${unusedPuzzlePiecesCount} (${unusedPuzzlePiecesPlacementOptions.map(p => p.puzzlePiece.id).join(', ')})`));

      // If possible solution consist of no possible solution parts,
      // the solution is: do nothing. In that case, the grid after all changes
      // is the original game board.
      const gameBoardSoFar = possibleSolutionStart.finalGameBoard ?? this.gameBoard;
      gameBoardSoFar.checkIsSolution(this.targetFigure.value);

      this.#maybeLog(() => console.log('Game board so far:', gameBoardSoFar.toString()));

      if (!unusedPuzzlePiecesCount) {
        this.#maybeLog(() => console.log('No unused puzzle pieces, checking if we reached a solution already'));

        if (gameBoardSoFar.isSolution) {
          console.log('Found solution!');
          console.log(possibleSolutionStart.toString());
          this.meta.totalNumberOfTriedCombinations++;
          this.solutions.push(possibleSolutionStart);

          if (this.meta.returningMaxOneSolution) {
            console.log('Returning max one solution, stopping the brute force');
            return;
          }

          continue;
        }

        this.#maybeLog(() => console.log('No solutions found for this possible solution start'));
        continue;
      }

      const gameBoard = gameBoardSoFar.clone();

      const shouldAbort = this.#calculatedSameSituationBefore(unusedPuzzlePiecesPlacementOptions.map(p => p.puzzlePiece), gameBoard);

      if (shouldAbort) {
        this.#maybeLog(() => console.log(`Had the same grid with the same unused puzzle pieces before, skipping this entire possible solution start.`));
        this.meta.skippedDuplicateSituations += unusedPuzzlePiecesPossibleCombinations;
        continue;
      }

      let maxCellsInfluencedSoFar = 0;
      for (const [index, puzzlePiecePlacementOptions] of unusedPuzzlePiecesPlacementOptions.toReversed().entries()) {
        this.#maxCellsInfluencedPerPuzzlePiecesLeft.set(index, maxCellsInfluencedSoFar);
        maxCellsInfluencedSoFar += puzzlePiecePlacementOptions.puzzlePiece.cellsInfluenced;
      }

      this.#maxCellsInfluencedPerPuzzlePiecesLeft.set(unusedPuzzlePiecesPlacementOptions.length, maxCellsInfluencedSoFar);

      const currentPuzzlePiecePlacementOptions = unusedPuzzlePiecesPlacementOptions.shift()!;

      for (const possibleSolution of this.#puzzlePiecePlacementOptionsIterator({
        gameBoard,
        baseSolution: possibleSolutionStart,
        current: currentPuzzlePiecePlacementOptions,
        next: unusedPuzzlePiecesPlacementOptions,
      })) {
        this.meta.totalNumberOfTriedCombinations++;

        if (possibleSolution.isSolution()) {
          console.log('Found solution!');
          console.log(possibleSolution.toString());
          this.solutions.push(possibleSolution);

          if (this.meta.returningMaxOneSolution) {
            console.log('Returning max one solution, stopping.');
            this.#finalize();
            return;
          }

          continue;
        }
      }
    }

    this.#finalize();
  }

  *#puzzlePiecePlacementOptionsIterator({
    gameBoard,
    baseSolution,
    current,
    next,
  }: {
    gameBoard: GameBoard;
    baseSolution: PossibleSolution;
    current: PuzzlePiecePlacementOptions;
    next: PuzzlePiecePlacementOptions[];
  }): Generator<PossibleSolution> {
    const { puzzlePiece, possiblePositions } = current;
    const possiblePositionCount = possiblePositions.length;

    for (let i = 0; i < possiblePositionCount; i++) {
      this.meta.totalNumberOfIteratorPlacementAttempts++;

      // const p0 = performance.now();
      const position = possiblePositions[i]!;
      const grid = puzzlePiece.toEmptyGameBoardWithPuzzlePieceAt(position);
      // const p1 = performance.now();
      const before = gameBoard.clone();

      // const p2 = performance.now();
      const after = gameBoard.stack(this.figuresCount, grid);

      // NOTE: We used to check if we had this exact situation before, but this takes up too much memory.
      // const p3 = performance.now();
      // const shouldAbort = this.#calculatedSameSituationBefore(next.map(p => p.puzzlePiece), after);
      // const p4 = performance.now();

      // this.#perf.toEmptyGameBoardWithPuzzlePieceAt.push(p1 - p0);
      // this.#perf.gameBoardClone.push(p2 - p1);
      // this.#perf.gameBoardStack.push(p3 - p2);
      // this.#perf.calculatedSameSituationBefore.push(p4 - p3);

      // if (shouldAbort) {
      //   this.meta.skippedDuplicateSituations += MathHelper.product(next.map(p => p.possiblePositions.length));
      //   continue;
      // }

      const puzzlePiecesLeft = next.length;

      // const p5 = performance.now();
      const afterCorrectCellsCount = after.countValue(this.targetFigure.value);
      const afterIncorrectCellsCount = after.cells - afterCorrectCellsCount;

      // const p6 = performance.now();

      const nextPuzzlePiecesMaxInfluencedCells = this.#maxCellsInfluencedPerPuzzlePiecesLeft.get(puzzlePiecesLeft)!;

      // const p7 = performance.now();
      const canBeSolvedFromHere = afterIncorrectCellsCount <= nextPuzzlePiecesMaxInfluencedCells;

      // this.#perf.countIncorrectCells.push(p6 - p5);
      // this.#perf.getNextPuzzlePiecesMaxInfluencedCells.push(p7 - p6);

      if (!canBeSolvedFromHere) {
        // If at the final level, we skip 1 impossible situation.
        // If at any level before that, we skip all impossible situations.
        let skipped = 1;
        for (let i = 0; i < puzzlePiecesLeft; i++) {
          skipped *= next[i]!.puzzlePiece.getPossiblePositions(this.#hasPreparedSolutionStarts).length;
        }

        this.meta.skippedImpossibleSituations += skipped;

        continue;
      }

      // const p8 = performance.now();
      const result = baseSolution.cloneWith([
        {
          id: puzzlePiece.id,
          position,
          grid,
          before,
          after,
        },
      ]);

      // const p9 = performance.now();
      // this.#perf.possibleSolutionClone.push(p9 - p8);

      // If there are more levels, proceed to the next level, yield that
      // level's result and continue with the next possible position of
      // the current puzzle piece.
      if (puzzlePiecesLeft) {
        const newCurrent = next[0];
        const newNext = next.slice(1);

        // Let another iterator yield for us. This "iterator recursion"
        // will be repeated until we reach the final level.
        yield* this.#puzzlePiecePlacementOptionsIterator({
          gameBoard: after,
          baseSolution: result,
          current: newCurrent!,
          next: newNext,
        });

        // Prevent yielding the result of the current level, while we
        // still have deeper levels to go through.
        continue;
      }

      // Only on the final level, yield the result up all the way to the top.
      yield result;
    }
  }

  /**
   * Indicates whether we ran into this exact situation before, so
   * with the same game board grid and the same puzzle pieces left.
   *
   * NOTE: Don't use this during the brute force, as saving every
   * situation takes up so much memory, that the script will just
   * crash at some point.
   */
  #calculatedSameSituationBefore (puzzlePieces: PuzzlePiece[], gameBoard: GameBoard): boolean {
    // IDEA: Represent every puzzle piece using a binary code. The number of bits should be equal to the number of puzzle pieces.
    // Then we can create a bitmask that represents which puzzle pieces have been used and which ones haven't.

    const key = `${puzzlePieces.map(p => p.id).join('')}${gameBoard.toShortString()}`;

    if (this.#uniqueSituations.has(key)) {
      return true;
    }

    this.#uniqueSituations.add(key);
    return false;
  }

  #finalize () {
    this.#timings.tBruteForceEnd = performance.now();

    this.#saveCalculationDuration();
    console.log('\n-----------------------------------');
    console.log('Total number of tried combinations:', numberFormatter.format(this.meta.totalNumberOfTriedCombinations));
    console.log('Total number of iterator placement attempts:', numberFormatter.format(this.meta.totalNumberOfIteratorPlacementAttempts));
    this.#logSkippedSituations(true);
    this.#logTimeToPrepareSolutionStarts();
    this.#logTimeToBruteForce();
    console.log('Total time to calculate solution:', this.#milliSecondsToString(this.meta.calculationDuration));
    console.log('Max memory used:', this.#memoryToString(this.meta.maxMemoryUsed));

    const perfStats = this.#perf;

    for (const [k, v] of Object.entries(perfStats)) {
      if (!v.length) continue;

      const total = MathHelper.sum(v);
      console.log(`\nAverage time spent in ${k}: ${total / v.length} ms`);
      console.log(`Total time spent in ${k}: ${total} ms`);
    }
  }

  #logTimeToPrepareSolutionStarts () {
    console.log('Time to prepare possible solution starts:', this.#hasPreparedSolutionStarts
      ? this.#milliSecondsToString(this.#timings.tPrepareSolutionStartsEnd! - this.#timings.tPrepareSolutionStartsStart!)
      : 'n/a');
  }

  #logTimeToBruteForce () {
    console.log('Time to brute force the puzzle:', this.#milliSecondsToString(this.#timings.tBruteForceEnd! - this.#timings.tBruteForceStart!));
  }

  #createCornerInfo (corner: number) {
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
  }

  #getMinimumTransformsNeededForCorners () {
    const { topLeft, topRight, bottomLeft, bottomRight } = this.gameBoard;

    this.cornersInfo = {
      topLeft: this.#createCornerInfo(topLeft),
      topRight: this.#createCornerInfo(topRight),
      bottomLeft: this.#createCornerInfo(bottomLeft),
      bottomRight: this.#createCornerInfo(bottomRight),
    };
  }

  #getPossibleTransformsForCorners () {
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

  #getPuzzlePiecesWithActiveCorners () {
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

          for (const [nthBit, bitValue] of iBinary.split('').reverse().entries()) {
            if (bitValue === '1') {
              const puzzlePieceId = cornerInfo.puzzlePiecesThatCanAffectState[nthBit]!;

              const puzzlePiece = this.puzzlePieces[puzzlePieceId]!;

              let position: Position;

              const affectedCorners: CornerType[] = [cornerType as CornerType];

              switch (cornerType as CornerType) {
                case 'topLeft':
                  position = Position.get(
                    0,
                    0,
                  );

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.topRight) {
                    affectedCorners.push('topRight');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.bottomLeft) {
                    affectedCorners.push('bottomLeft');
                  }
                  break;
                case 'topRight':
                  position = Position.get(
                    this.gameBoard.cols - puzzlePiece.grid.cols,
                    0,
                  );

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.topLeft) {
                    affectedCorners.push('topLeft');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.bottomRight) {
                    affectedCorners.push('bottomRight');
                  }
                  break;
                case 'bottomLeft':
                  position = Position.get(
                    0,
                    this.gameBoard.rows - puzzlePiece.grid.rows,
                  );

                  if (puzzlePiece.spansXAxis && puzzlePiece.grid.bottomRight) {
                    affectedCorners.push('bottomRight');
                  }
                  if (puzzlePiece.spansYAxis && puzzlePiece.grid.topLeft) {
                    affectedCorners.push('topLeft');
                  }
                  break;
                case 'bottomRight':
                  position = Position.get(
                    this.gameBoard.cols - puzzlePiece.grid.cols,
                    this.gameBoard.rows - puzzlePiece.grid.rows,
                  );

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

          combination.sort((a, b) => a.id.localeCompare(b.id, 'nl-NL'));

          cornerInfo.possiblePuzzlePieceCombinations!.push(combination);
        }

        i++;
      }
    }
  }

  #logSkippedSituations (final = false) {
    const {
      skippedDuplicateSituations: totalSkippedDuplicateSituations,
      skippedImpossibleSituations: totalSkippedImpossibleSituations,
    } = this.meta;

    if (final) {
      console.log('Total skipped duplicate situations:', numberFormatter.format(totalSkippedDuplicateSituations));
      console.log('Total skipped impossible situations:', numberFormatter.format(totalSkippedImpossibleSituations));
      return;
    }

    // console.log('Skipped duplicate situations:', numberFormatter.format(totalSkippedDuplicateSituations - this.#lastSkippedDuplicateSituations));
    console.log('Total skipped duplicate situations so far:', numberFormatter.format(totalSkippedDuplicateSituations));
    console.log('Total skipped impossible situations so far:', numberFormatter.format(totalSkippedImpossibleSituations));
    // this.#lastSkippedDuplicateSituations = totalSkippedDuplicateSituations;
  }

  #maybeLog (logger: () => unknown, fallbackLogger?: () => unknown) {
    if (this.#loggingDisabled) {
      if (fallbackLogger) fallbackLogger();
      return;
    }

    logger();
  }

  /**
   * @returns The current memory usage in bytes.
   */
  #getMemoryUsage () {
    const memory = process.memoryUsage.rss();

    if (memory > this.meta.maxMemoryUsed) {
      this.meta.maxMemoryUsed = memory;
    }

    // B -> kB -> MB
    return memory;
  }

  #memoryToString (memory: number) {
    memory /= 1024 ** 2;
    const unit = memory > 1024 ? 'GB' : 'MB';
    return `${numberFormatter.format(unit === 'GB' ? memory / 1024 : memory)} ${unit}`;
  }

  /**
   * @returns The current memory usage in MB.
   */
  #logMemoryUsage () {
    const memory = this.#getMemoryUsage();
    console.log('Current memory usage:', this.#memoryToString(memory));
    return memory;
  }

  async #checkMemoryUsage () {
    this.#logMemoryUsage();

    // const memory = this.#logMemoryUsage();
    // if ((memory / 1024) > this.#maxMemoryUsageInGB) {
    //   console.log(`Memory usage is over ${this.#maxMemoryUsageInGB} GB, clearing up space first`);

    //   const { reachedMaxMemory: reachedMaxMemoryBefore } = this.meta;

    //   if (!reachedMaxMemoryBefore) {
    //     console.log(heapStats());
    //     // await Bun.write('heap-before-clear.json', JSON.stringify(generateHeapSnapshot(), null, 2));
    //   }

    //   this.meta.reachedMaxMemory = true;
    //   Bun.gc(true);
    //   this.#logMemoryUsage();

    //   if (!reachedMaxMemoryBefore) {
    //     console.log(heapStats());
    //     // await Bun.write('heap-after-clear.json', JSON.stringify(generateHeapSnapshot(), null, 2));
    //     process.exit(1);
    //   }
    // }
  }

  #milliSecondsToString (ms: number) {
    // Log seconds, minutes or hours depending on the duration
    if (ms < 1000) {
      return `${numberFormatter.format(ms)} milliseconds`;
    }
    else if (ms < 60_000) {
      return `${numberFormatter.format(ms / 1000)} seconds`;
    }
    else if (ms < 3_600_000) {
      return `${numberFormatter.format(ms / 60_000)} minutes`;
    }
    else {
      return `${numberFormatter.format(ms / 3_600_000)} hours`;
    }
  }

  // /**
  //  * Delay everything that follows this function until the next tick.
  //  * This allows Node/Bun to garbage collect and let the event loop run.
  //  * It may also be used to let the AbortController abort the request
  //  * during intensive sync logic.
  //  */
  // async #nextEventLoopTick () {
  //   // When using Node:
  //   // Wait for Node's next tick to allow other code to run and console.logs to show.
  //   // await new Promise((resolve) => setImmediate(resolve));

  //   // When using Bun:
  //   // NOTE: Big nope, this slows down everything a LOT. Maybe only do this if memory > x?
  //   // Bun.gc(false);
  // }

  #saveCalculationDuration () {
    this.#timings.tEnd = performance.now();
    this.meta.calculationDuration = this.#timings.tEnd - this.#timings.tStart;
  }
}
