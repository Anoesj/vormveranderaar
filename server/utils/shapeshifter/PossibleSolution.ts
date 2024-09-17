import type {
  PuzzlePiece,
  Position,
  GameBoard,
} from '#imports';

export type PossibleSolutionPart = {
  /** The ID of the puzzle piece. */
  id: PuzzlePiece['id'];
  /** The position of the puzzle piece on the game board. */
  position: Position;
  /** The puzzle piece on an empty game board at the given position. */
  grid: GameBoard;
  /** The game board before the puzzle piece was placed. */
  before?: GameBoard;
  /** The game board after the puzzle piece was placed. */
  after?: GameBoard;
  /** The index of the possible solution this part is part of. */
  partOfPossibleSolutionStart?: number;
};

export type PuzzlePiecePlacementOptions = {
  puzzlePiece: PuzzlePiece;
  possiblePositions: Position[];
};

export class PossibleSolution {
  targetValue: number;
  parts: PossibleSolutionPart[];
  solutionStartIndex?: number;
  continuationInfo?: {
    unusedPuzzlePiecesPlacementOptions: PuzzlePiecePlacementOptions[];
    unusedPuzzlePiecesCount: number;
    unusedPuzzlePiecesPossibleCombinations: number;
  };

  constructor (
    targetValue: number,
    parts: PossibleSolutionPart[] = [],
  ) {
    this.targetValue = targetValue;
    this.parts = parts;
  }

  cloneWith (appendedParts: PossibleSolutionPart[]) {
    const cloned = new PossibleSolution(this.targetValue, this.parts.concat(appendedParts));
    cloned.solutionStartIndex = this.solutionStartIndex;
    return cloned;
  }

  add (part: PossibleSolutionPart) {
    this.parts.push(part);
  }

  /**
   * - The game board so far if not all puzzle pieces have been used yet.
   * - The final game board if all puzzle pieces have been used.
   * - `undefined` if no puzzle pieces have been used yet.
   */
  get finalGameBoard () {
    return this.parts.at(-1)?.after;
  }

  equals (other: PossibleSolution) {
    const otherParts = other.parts;

    for (const [i, ownPart] of this.parts.entries()) {
      const otherPart = otherParts[i];

      if (
        !otherPart
        || ownPart.id !== otherPart.id
        || ownPart.position !== otherPart.position
      ) {
        return false;
      }
    }

    return true;
  }

  sortAlphabetically () {
    this.parts.sort((a, b) => a.id.localeCompare(b.id, 'nl-NL'));
  }

  toSortedAlphabetically () {
    return this.parts.toSorted((a, b) => a.id.localeCompare(b.id, 'nl-NL'));
  }

  getContinuationInfo (puzzlePieces: PuzzlePiece[], avoidCorners: boolean) {
    const unusedPuzzlePieces = puzzlePieces.filter((puzzlePiece) => !this.parts.find((part) => puzzlePiece.id === part.id));

    /*
      Sort by how much they influence the game board (more influence comes first).

      NOTE:
      I tried sorting by possible positions count too, but that slowed down
      the algorithm by 33%. This is probably because we skip a lot of options
      as soon as we find out that the puzzle cannot be solved anymore.
      If we handle the puzzle pieces with the most influence first,
      we can skip options earlier.
    */
    unusedPuzzlePieces.sort((a, b) => b.cellsInfluenced - a.cellsInfluenced);

    const unusedPuzzlePiecesCount = unusedPuzzlePieces.length;

    const unusedPuzzlePiecesPlacementOptions: PuzzlePiecePlacementOptions[] =
      unusedPuzzlePieces.map((puzzlePiece) => ({
        puzzlePiece,
        possiblePositions: puzzlePiece.getPossiblePositions(avoidCorners),
      }));

    const unusedPuzzlePiecesPossibleCombinations = MathHelper.product(unusedPuzzlePiecesPlacementOptions.map(p => p.possiblePositions.length));

    this.continuationInfo = {
      unusedPuzzlePiecesPlacementOptions,
      unusedPuzzlePiecesCount,
      unusedPuzzlePiecesPossibleCombinations,
    };

    return this.continuationInfo;
  }

  isSolution () {
    return this.finalGameBoard!.checkIsSolution(this.targetValue);
  }

  logSolution () {
    if (!this.parts.length) {
      return 'No puzzle pieces used.';
    }

    console.log(
      // eslint-disable-next-line prefer-template
      'Found solution!\n'
      + 'Sorted by brute force stacking order:\n'
      + this.parts.map(({ id, position }) => `${id} at ${position}`).join('\n')
      + '\nSorted by original order:\n'
      + this.toSortedAlphabetically().map(({ id, position }) => `${id} at ${position}`).join('\n')
    );
  }
}