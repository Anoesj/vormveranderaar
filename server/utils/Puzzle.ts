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

  meta: {
    totalNumberOfPossibleCombinations: number;
    totalNumberOfTriedCombinations: number;
    returningMaxOneSolution?: boolean;
    skippedDuplicateSituations: number;
    skippedImpossibleSituations: number;
    maxMemoryUsed: number;
    reachedMaxMemory?: boolean;
    calculationDuration: number;
  } = {
    totalNumberOfPossibleCombinations: 0,
    totalNumberOfTriedCombinations: 0,
    returningMaxOneSolution: false,
    skippedDuplicateSituations: 0,
    skippedImpossibleSituations: 0,
    maxMemoryUsed: 0,
    reachedMaxMemory: false,
    calculationDuration: 0,
  };

  #perf: {
    tStart: number;
    tEnd: number | null;
    toEmptyGameBoardWithPuzzlePieceAt: number[];
    clone: number[];
    stack: number[];
    calculatedSameSituationBefore: number[];
  } = {
    tStart: performance.now(),
    tEnd: null,
    toEmptyGameBoardWithPuzzlePieceAt: [],
    clone: [],
    stack: [],
    calculatedSameSituationBefore: [],
  };

  constructor(options: {
    figures: Array<string | number>;
    gameBoard: GridLike<number>;
    puzzlePieces: GridLike<number>[];
  }) {
    console.log('\nYum, a puzzle to chew on!');
    // console.log('Figures:', options.figures);
    // console.log('Game board:', options.gameBoard.toString());
    // console.log('Puzzle pieces:', options.puzzlePieces.map(p => p.toString()));

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

    this.puzzlePiecesCount = puzzlePieces.length;

    this.puzzlePiecesThatCannotAvoidAnyCorners = puzzlePieces
      .filter((p) => !p.canAvoidAffectingSomeCorners)
      .map((p) => p.id);

    this.meta.totalNumberOfPossibleCombinations = this.calculateProduct(puzzlePieces.map(p => p.possiblePositions.length));

    this.meta.returningMaxOneSolution = this.meta.totalNumberOfPossibleCombinations > 1_000_000;

    console.log('Total number of possible combinations:', numberFormatter.format(this.meta.totalNumberOfPossibleCombinations));

    this.#getMinimumTransformsNeededForCorners();
    this.#getPossibleTransformsForCorners();
    this.#getPuzzlePiecesWithActiveCorners();
    this.#combineCornerOptions();
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
              const puzzlePieceId = cornerInfo.puzzlePiecesThatCanAffectState[nthBit];

              const puzzlePiece = this.puzzlePieces[puzzlePieceId];

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

  #combineCornerOptions () {
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
      const keyCorner1 = keys[0];
      const keyCorner2 = keys[1];
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
      for (const topRight of this.cornersInfo!.topRight.possiblePuzzlePieceCombinations!) {
        if (!compatible({ topLeft, topRight })) {
          continue;
        }

        for (const bottomLeft of this.cornersInfo!.bottomLeft.possiblePuzzlePieceCombinations!) {
          if (
            !compatible({ topLeft, bottomLeft })
            || !compatible({ topRight, bottomLeft })
          ) {
            continue;
          }

          for (const bottomRight of this.cornersInfo!.bottomRight.possiblePuzzlePieceCombinations!) {
            if (
              !compatible({ topLeft, bottomRight })
              || !compatible({ topRight, bottomRight })
              || !compatible({ bottomLeft, bottomRight })
            ) {
              continue;
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
              console.log(
                'Discarded possible solution start, because not all corners are affected by the puzzle pieces the right number of times:',
                affectedCounts,
              );

              continue;
            }

            const possibleSolutionStart = new PossibleSolution(this.targetFigure.value);

            let missingRequiredPuzzlePieces = [...this.puzzlePiecesThatCannotAvoidAnyCorners];

            for (const part of allPuzzlePiecesAffectingCorners) {
              const puzzlePiece = this.puzzlePieces[part.id];

              missingRequiredPuzzlePieces = missingRequiredPuzzlePieces
                .filter((p) => p !== part.id);

              possibleSolutionStart.add({
                id: part.id,
                position: part.position,
                grid: puzzlePiece.toEmptyGameBoardWithPuzzlePieceAt(part.position),
              });
            }

            if (missingRequiredPuzzlePieces.length) {
              console.log(
                'Discarded possible solution start, because not all puzzle pieces that affect corners are used in the corners:',
                missingRequiredPuzzlePieces,
              );

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
            console.log(`\nAdded new possible solution start (#${this.possibleSolutionStarts.length})`);
            console.log(possibleSolutionStart.toString());
          }
        }
      }
    }

    // Sort possible solution starts by length of the array.
    // We want to brute force the possible solution starts that
    // have the least amount of possible combinations first.
    const puzzlePieces = Object.values(this.puzzlePieces);
    this.possibleSolutionStarts.sort((a, b) => {
      return a.getContinuationInfo(puzzlePieces).unusedPuzzlePiecesPossibleCombinations
        - b.getContinuationInfo(puzzlePieces).unusedPuzzlePiecesPossibleCombinations;
    });

    for (const [index, possibleSolutionStart] of this.possibleSolutionStarts.entries()) {
      possibleSolutionStart.solutionStartIndex = index;

      for (const part of possibleSolutionStart.parts) {
        part.partOfPossibleSolutionStart = index;
      }
    }
  }

  calculateProduct (arr: number[]) {
    return arr.reduce((acc, cur) => acc * cur, 1);
  }

  resultlogSkippedSituations (final = false) {
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

  /**
   * @returns The current memory usage in bytes.
   */
  getMemoryUsage () {
    const memory = process.memoryUsage.rss();

    if (memory > this.meta.maxMemoryUsed) {
      this.meta.maxMemoryUsed = memory;
    }

    // B -> kB -> MB
    return memory;
  }

  memoryToString (memory: number) {
    memory /= 1024 ** 2;
    const unit = memory > 1024 ? 'GB' : 'MB';
    return `${numberFormatter.format(unit === 'GB' ? memory / 1024 : memory)} ${unit}`;
  }

  /**
   * @returns The current memory usage in MB.
   */
  logMemoryUsage () {
    const memory = this.getMemoryUsage();
    console.log('Current memory usage:', this.memoryToString(memory));
    return memory;
  }

  async checkMemoryUsage () {
    this.logMemoryUsage();

    // const memory = this.logMemoryUsage();
    // if ((memory / 1024) > this.#maxMemoryUsageInGB) {
    //   console.log(`Memory usage is over ${this.#maxMemoryUsageInGB} GB, clearing up space first`);

    //   const { reachedMaxMemory: reachedMaxMemoryBefore } = this.meta;

    //   if (!reachedMaxMemoryBefore) {
    //     console.log(heapStats());
    //     // await Bun.write('heap-before-clear.json', JSON.stringify(generateHeapSnapshot(), null, 2));
    //   }

    //   this.meta.reachedMaxMemory = true;
    //   Bun.gc(true);
    //   this.logMemoryUsage();

    //   if (!reachedMaxMemoryBefore) {
    //     console.log(heapStats());
    //     // await Bun.write('heap-after-clear.json', JSON.stringify(generateHeapSnapshot(), null, 2));
    //     process.exit(1);
    //   }
    // }
  }

  milliSecondsToString (ms: number) {
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

  /**
   * Delay everything that follows this function until the next tick.
   * This allows Node/Bun to garbage collect and let the event loop run.
   */
  async nextTick () {
    // When using Node:
    // Wait for Node's next tick to allow other code to run and console.logs to show.
    // await new Promise((resolve) => setImmediate(resolve));

    // When using Bun:
    // NOTE: Big nope, this slows down everything a LOT. Maybe only do this if memory > x?
    // Bun.gc(false);
  }

  async *bruteForceSolution ({
    possibleSolutionStarts = this.possibleSolutionStarts,
    from = 0,
    to,
  } : {
    possibleSolutionStarts?: PossibleSolution[];
    from?: number;
    to?: number;
  } = {}): AsyncGenerator<boolean> {
    // Brute force solutions for every "possible solution start"
    const possibleSolutionStartsCount = possibleSolutionStarts.length;
    const puzzlePieces = Object.values(this.puzzlePieces);

    const iEnd = Math.min(to ?? possibleSolutionStartsCount, possibleSolutionStartsCount);

    for (let i = from; i < iEnd; i++) {
      console.log('\nNumber of tried combinations so far:', numberFormatter.format(this.meta.totalNumberOfTriedCombinations));
      this.resultlogSkippedSituations();
      await this.checkMemoryUsage();

      const possibleSolutionStart = possibleSolutionStarts[i];

      const {
        unusedPuzzlePiecesPlacementOptions,
        unusedPuzzlePiecesCount,
        unusedPuzzlePiecesPossibleCombinations,
      } = possibleSolutionStart.getContinuationInfo(puzzlePieces);

      console.log(`\nBrute forcing from possible solution start #${i + 1}/${possibleSolutionStartsCount} (${numberFormatter.format(unusedPuzzlePiecesPossibleCombinations)} possible combinations)`);
      console.log('Unused puzzle pieces:', unusedPuzzlePiecesCount === 0 ? '-' : `${unusedPuzzlePiecesCount} (${unusedPuzzlePiecesPlacementOptions.map(p => p.puzzlePiece.id).join(', ')})`);

      // If possible solution consist of no possible solution parts,
      // the solution is: do nothing. In that case, the grid after all changes
      // is the original game board.
      const gameBoardSoFar = possibleSolutionStart.finalGameBoard ?? this.gameBoard;
      gameBoardSoFar.checkIsSolution(this.targetFigure.value);

      console.log('Game board so far:', gameBoardSoFar.toString());

      if (!unusedPuzzlePiecesCount) {
        console.log('No unused puzzle pieces, checking if we reached a solution already');

        if (gameBoardSoFar.isSolution) {
          console.log('Found solution!');
          console.log(possibleSolutionStart.toString());
          this.meta.totalNumberOfTriedCombinations++;
          this.solutions.push(possibleSolutionStart);

          // this.resultlogSkippedSituations();
          yield true;

          if (this.meta.returningMaxOneSolution) {
            console.log('Returning max one solution, stopping the brute force');
            return;
          }

          continue;
        }

        console.log('No solutions found for this possible solution start');
        // this.resultlogSkippedSituations();
        yield false;
        continue;
      }

      const gameBoard = gameBoardSoFar.clone();

      const shouldAbort = this.calculatedSameSituationBefore(unusedPuzzlePiecesPlacementOptions.map(p => p.puzzlePiece), gameBoard);

      if (shouldAbort) {
        console.log(`Had the same grid with the same unused puzzle pieces before, skipping this entire possible solution start.`);
        this.meta.skippedDuplicateSituations += unusedPuzzlePiecesPossibleCombinations;
        // this.resultlogSkippedSituations();
        yield false;
        continue;
      }

      const currentPuzzlePiecePlacementOptions = unusedPuzzlePiecesPlacementOptions.shift()!;

      // const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (const possibleSolution of this.puzzlePiecePlacementOptionsIterator({
        gameBoard,
        baseSolution: possibleSolutionStart,
        current: currentPuzzlePiecePlacementOptions,
        next: unusedPuzzlePiecesPlacementOptions,
      })) {
        // await this.nextTick();
        // await wait(1000);

        this.meta.totalNumberOfTriedCombinations++;

        if (possibleSolution.isSolution()) {
          console.log('Found solution!');
          console.log(possibleSolution.toString());
          this.solutions.push(possibleSolution);
          yield true;

          if (this.meta.returningMaxOneSolution) {
            console.log('Returning max one solution, stopping.');
            return;
          }

          continue;
        }
      }

      // this.resultlogSkippedSituations();
    }

    this.saveCalculationDuration();
    console.log('\n-----------------------------------');
    console.log('Total number of tried combinations:', numberFormatter.format(this.meta.totalNumberOfTriedCombinations));
    this.resultlogSkippedSituations(true);
    console.log('Total time to calculate solution:', this.milliSecondsToString(this.meta.calculationDuration));
    console.log('Max memory used:', this.memoryToString(this.meta.maxMemoryUsed));

    // type PerfType = keyof typeof this.perf;
    // const loggedPerfTypes: PerfType[] = [
    //   'calculatedSameSituationBefore',
    // ];

    // for (const [k, v] of Object.entries(this.perf)) {
    //   if (!loggedPerfTypes.includes(k as PerfType)) {
    //     continue;
    //   }

    //   const total = v.reduce((a, b) => a + b, 0);
    //   console.log(`\nAverage time spent in ${k}: ${total / v.length} ms`);
    //   console.log(`Total time spent in ${k}: ${total} ms`);
    // }
  }

  /**
   * Indicates whether we ran into this exact situation before, so
   * with the same game board grid and the same puzzle pieces left.
   *
   * NOTE: Don't use this during the brute force, as saving every
   * situation takes up so much memory, that the script will just
   * crash at some point.
   */
  calculatedSameSituationBefore (puzzlePieces: PuzzlePiece[], gameBoard: GameBoard): boolean {
    // IDEA: Represent every puzzle piece using a binary code. The number of bits should be equal to the number of puzzle pieces.
    // Then we can create a bitmask that represents which puzzle pieces have been used and which ones haven't.

    const key = `${puzzlePieces.map(p => p.id).join('')}${gameBoard.toShortString()}`;

    if (this.#uniqueSituations.has(key)) {
      return true;
    }

    this.#uniqueSituations.add(key);
    return false;
  }

  *puzzlePiecePlacementOptionsIterator({
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

    // console.log('Now trying multiple placements of puzzle piece:', puzzlePiece.id);

    for (let i = 0; i < possiblePositionCount; i++) {
      // const p0 = performance.now();

      const position = possiblePositions[i];
      const grid = puzzlePiece.toEmptyGameBoardWithPuzzlePieceAt(position);
      // const p1 = performance.now();

      const before = gameBoard.clone();
      // const p2 = performance.now();

      const after = gameBoard.stack(this.figuresCount, grid);
      // const p3 = performance.now();

      // const shouldAbort = this.calculatedSameSituationBefore(next.map(p => p.puzzlePiece), after);
      // const p4 = performance.now();

      // this.perf.toEmptyGameBoardWithPuzzlePieceAt.push(p1 - p0);
      // this.perf.clone.push(p2 - p1);
      // this.perf.stack.push(p3 - p2);
      // this.perf.calculatedSameSituationBefore.push(p4 - p3);

      // if (shouldAbort) {
      //   this.meta.skippedDuplicateSituations += this.calculateProduct(next.map(p => p.possiblePositions.length));
      //   continue;
      // }

      const result = baseSolution.cloneWith([
        {
          id: puzzlePiece.id,
          position,
          grid,
          before,
          after,
        },
      ]);

      const afterCorrectCellsCount = after.countValue(this.targetFigure.value);
      const afterIncorrectCellsCount = after.cells - afterCorrectCellsCount;
      const nextLevelsMaxInfluencedCells = next.reduce((acc, p) => acc + p.puzzlePiece.cellsInfluenced, 0);
      const canBeSolvedFromHereOn = afterIncorrectCellsCount <= nextLevelsMaxInfluencedCells;

      if (!canBeSolvedFromHereOn) {
        // console.log(`Placed puzzle piece ${puzzlePiece.id} at ${position}, but unsolvable situation found:`, {
        //   afterCorrectCellsCount,
        //   afterIncorrectCellsCount,
        //   nextLevelsMaxInfluencedCells,
        //   canBeSolvedFromHereOn,
        // });

        this.meta.skippedImpossibleSituations += next.length;
        continue;
      }

      // If there are more levels, proceed to the next level, yield that
      // level's result and continue with the next possible position of
      // the current puzzle piece.
      if (next.length) {
        const [newCurrent, ...newNext] = next;

        // console.log('Going a level deeper into puzzle piece:', newCurrent.puzzlePiece.id, {
        //   next: newNext.map(p => ({
        //     id: p.puzzlePiece.id,
        //     possiblePositions: p.possiblePositions.length,
        //   })),
        // });

        // TODO: REVIEW: I have no idea what I'm doing. Can't grasp how the recursion here works and if this is the right place to do this.
        // TODO: Also, this can be more generic. Calculate the number of cells that all next puzzle pieces combined can influence. If that number is less than the number of incorrect cells, skip <insert-whatever-the-fuck-we-have-to-skip>.
        // If only one puzzle piece is left, we can check if the game board
        // could still be solved with the remaining puzzle piece and skip
        // iterating further if it's impossible.
        // if (newNext.length === 1) {
        //   const afterIncorrectCellsCount = after.cells - after.countValue(this.targetFigure.value);

        //   if (afterIncorrectCellsCount > newNext[0].puzzlePiece.cellsInfluenced) {
        //     // console.log({
        //     //   afterIncorrectCellsCount,
        //     //   newNextLevelPuzzlePieceCellsInfluenced: newNext[0].puzzlePiece.cellsInfluenced,
        //     // });
        //     this.meta.skippedImpossibleSituations += newNext[0].possiblePositions.length;
        //     continue;
        //   }
        // }

        // NOTE: It might be possible to replace this with `yield* this.puzzlePiecePlacementOptionsIterator({...})`.
        // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield*
        for (const nestedResult of this.puzzlePiecePlacementOptionsIterator({
          gameBoard: after,
          baseSolution: result,
          current: newCurrent,
          next: newNext,
        })) {
          yield nestedResult;
        }

        // console.log(`Tried all placements of puzzle piece ${newCurrent.puzzlePiece.id} with this placement of puzzle piece ${puzzlePiece.id}`);

        // Prevent yielding the result of the current level, while we
        // still have deeper levels to go through.
        continue;
      }

      // Only on the final level, yield the result up all the way to the top.
      yield result;
    }
  }

  saveCalculationDuration () {
    this.#perf.tEnd = performance.now();
    this.meta.calculationDuration = this.#perf.tEnd - this.#perf.tStart;
  }
}
