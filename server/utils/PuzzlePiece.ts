import { Grid, type GridLike } from './Grid';
import { Position } from './Position';
import type { CornerType } from './Puzzle';
import type { GameBoard } from './GameBoard';

export class PuzzlePiece {
  id: string;
  grid: Grid;
  #gameBoard: GameBoard;

  activeCorners: Record<CornerType, boolean>;
  spansXAxis: boolean;
  spansYAxis: boolean;
  canAvoidEdges: boolean;
  canAvoidAffectingSomeCorners: boolean;

  possiblePositions: Position[];
  possiblePositionsWhereCornersNotAffected: Position[];

  #gameBoardGridCache: WeakMap<Position, GameBoard> = new WeakMap();

  constructor (grid: GridLike<number>, id: string, gameBoard: GameBoard) {
    this.id = id;
    this.grid = new Grid(grid.map(row => row.map(colValue => colValue)));
    this.#gameBoard = gameBoard;

    const {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      rows,
      cols,
    } = this.grid;

    this.activeCorners = {
      topLeft: Boolean(topLeft),
      topRight: Boolean(topRight),
      bottomLeft: Boolean(bottomLeft),
      bottomRight: Boolean(bottomRight),
    };

    this.spansXAxis = cols === gameBoard.cols;
    this.spansYAxis = rows === gameBoard.rows;

    this.canAvoidEdges = gameBoard.rows >= rows + 2 && gameBoard.cols >= cols + 2;

    this.canAvoidAffectingSomeCorners = this.#canAvoidAffectingSomeCorners;

    this.possiblePositions = this.#possiblePositions;
    this.possiblePositionsWhereCornersNotAffected = this.possiblePositions
      .filter((position) => {
        const onGameBoardGrid = this.toEmptyGameBoardWithPuzzlePieceAt(position);

        return (
          !onGameBoardGrid.topLeft
          && !onGameBoardGrid.topRight
          && !onGameBoardGrid.bottomLeft
          && !onGameBoardGrid.bottomRight
        );
      });
  }

  toEmptyGameBoardWithPuzzlePieceAt (position: Position): GameBoard {
    if (this.#gameBoardGridCache.has(position)) {
      return this.#gameBoardGridCache.get(position)!;
    }

    const puzzlePieceGrid = this.grid.data;

    const onGameBoardGrid = this.#gameBoard.toEmpty();

    onGameBoardGrid.data = onGameBoardGrid.data.map((row, rowIndex) => {
      return row.map((_colVal, colIndex) => {
        const ri = rowIndex - position.y;
        const ci = colIndex - position.x;
        return puzzlePieceGrid[ri]?.[ci] ?? 0;
      });
    });

    this.#gameBoardGridCache.set(position, onGameBoardGrid);

    return onGameBoardGrid;
  }

  get #canAvoidAffectingSomeCorners (): boolean {
    const {
      canAvoidEdges,
      spansXAxis,
      spansYAxis,
      activeCorners,
    } = this;

    return (
      // If it can avoid edges, it can avoid corners too.
      canAvoidEdges
      // If the puzzle piece can avoid either the top and bottom edges,
      // or the left and right edges, it can avoid corners.
      || (
        this.#gameBoard.rows >= this.grid.rows + 2
        || this.#gameBoard.cols >= this.grid.cols + 2
      )
      // If one of the corners of the puzzle piece are inactive,
      // it can avoid corners if it doesn't span the x or y axis,
      // because you can always move it some way away from the corner.
      || (
        Object.values(activeCorners).some(val => val === false)
        && !spansXAxis
        && !spansYAxis
      )
      // If the puzzle piece has inactive left or right corners,
      // it can avoid corners, as long as it doesn't span the X axis,
      // because you can move the piece to the left or right.
      || (
        (
          (!activeCorners.topLeft && !activeCorners.bottomLeft)
          || (!activeCorners.topRight && !activeCorners.bottomRight)
        )
        && !spansXAxis
      )
      // If the puzzle piece has inactive top or bottom corners,
      // it can avoid corners, as long as it doesn't span the Y axis,
      // because you can move the piece up or down.
      || (
        (
          (!activeCorners.topLeft && !activeCorners.topRight)
          || (!activeCorners.bottomLeft && !activeCorners.bottomRight)
        )
        && !spansYAxis
      )
    );
  }

  get #possiblePositions (): Position[] {
    const positions: Position[] = [];

    const {
      data: gameBoardGrid,
      cols: gameBoardCols,
      rows: gameBoardRows,
    } = this.#gameBoard;

    const {
      cols: ownCols,
      rows: ownRows,
    } = this.grid;

    for (const [rowIndex, row] of gameBoardGrid.entries()) {
      if (rowIndex + ownRows > gameBoardRows) {
        continue;
      }

      for (const [colIndex, _colVal] of row.entries()) {
        if (colIndex + ownCols > gameBoardCols) {
          continue;
        }

        positions.push(Position.get(colIndex, rowIndex));
      }
    }

    return positions;
  }
}