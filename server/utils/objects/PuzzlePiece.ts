import { Grid, type GridLike } from './Grid';
import { type CornerType, type Position } from './Puzzle';
import { type GameBoard } from './GameBoard';

export class PuzzlePiece {
  id: string;
  grid: Grid<number>;
  #gameBoard: GameBoard;

  activeCorners: Record<CornerType, boolean>;
  spansXAxis: boolean;
  spansYAxis: boolean;
  canAvoidEdges: boolean;
  canAvoidCorners: boolean;

  constructor (grid: GridLike<number>,id: string, gameBoard: GameBoard) {
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

    this.spansXAxis = cols === gameBoard.grid.cols;
    this.spansYAxis = rows === gameBoard.grid.rows;

    this.canAvoidEdges = gameBoard.grid.rows >= rows + 2 && gameBoard.cols >= cols + 2;

    this.canAvoidCorners = this.canAvoidEdges || (
      Object.values(this.activeCorners).some(val => val === false)
      && !this.spansXAxis
      && !this.spansYAxis
    ) 
    || (
      ((!topLeft && !bottomLeft) || (!topRight && !bottomRight))
      && !this.spansXAxis
    )
    || (
      ((!topLeft && !topRight) || (!bottomLeft && !bottomRight))
      && !this.spansYAxis
    );
  }

  at (position: [number, number]): Grid<number> {
    const puzzlePieceGrid = this.grid.grid;

    const onGameBoardGrid = this.#gameBoard.grid.toEmpty<number>(0);

    onGameBoardGrid.grid = onGameBoardGrid.grid.map((row, rowIndex) => {
      return row.map((_colVal, colIndex) => {
        const ri = rowIndex - position [1];
        const ci = colIndex - position[0];
        return puzzlePieceGrid[ri]?.[ci] ?? 0;
      });
    });

    return onGameBoardGrid;
  }

  getPossiblePositions (): Position[] {
    const positions: Position[] = [];
    
    const gameBoardGrid = this.#gameBoard.grid;

    const {
      cols: gameBoardCols, 
      rows: gameBoardRows,
    } = gameBoardGrid;

    const {
      cols: ownCols,
      rows: ownRows,
    } = this.grid;

    for (const [rowIndex, row] of gameBoardGrid.grid.entries()) {
      if (rowIndex + ownRows > gameBoardRows) {
        continue;
      }

      for (const [colIndex, _colVal] of row.entries()) {
        if (colIndex + ownCols > gameBoardCols) {
          continue;
        }

        positions.push([colIndex, rowIndex ]);
      }
    }

    return positions;
  }
}