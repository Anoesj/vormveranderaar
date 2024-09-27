import { Grid } from './Grid';
import type { Figure } from './Figure';

export class GameBoard extends Grid {
  isSolution?: boolean;

  stack (figuresCount: number, ...grids: Grid[]): GameBoard {
    const newGrid = this.clone();

    const gridsCount = grids.length;
    for (let i = 0; i < gridsCount; i++) {
      const {
        data,
        cols,
        rows,
      } = grids[i]!;

      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (let colIndex = 0; colIndex < cols; colIndex++) {
          newGrid.data[rowIndex]![colIndex]! = (newGrid.data[rowIndex]![colIndex]! + data[rowIndex]![colIndex]!) % figuresCount;
        }
      }
    }

    return newGrid;
  }

  toEmpty () {
    const cols = new Array(this.cols).fill(0);

    const rows = new Array(this.rows)
      .fill('temp')
      .map(() => structuredClone(cols));

    return this.construct(rows);
  }

  // countIncorrectCells (targetValue: Figure['value']) {
  //   return this.cells - this.countValue(targetValue);
  // }

  // countTransformsNeededUntilEveryValueIs (
  //   targetValue: Figure['value'],
  //   figuresCount: number,
  // ) {
  //   const {
  //     data,
  //     cols,
  //     rows,
  //   } = this;

  //   let count = 0;

  //   for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
  //     for (let colIndex = 0; colIndex < cols; colIndex++) {
  //       let value = data[rowIndex]![colIndex]!;
  //       while (value !== targetValue) {
  //         value = (value + 1) % figuresCount;
  //         count++;
  //       }
  //     }
  //   }

  //   return count;
  // }

  sum () {
    const {
      data,
      cols,
      rows,
    } = this;

    // Without reduce, for better performance
    let sum = 0;
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        sum += data[rowIndex]![colIndex]!;
      }
    }

    return sum;
  }

  analyze (targetValue: Figure['value']) {
    const invalidCellsArea = {
      x1: 0 as number | null,
      x2: this.cols - 1 as number | null,
      y1: null as number | null,
      y2: null as number | null,
    };

    const {
      data,
      cols,
      rows,
    } = this;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        if (data[rowIndex]![colIndex]! !== targetValue) {
          // First encountered y = y1
          if (invalidCellsArea.y1 === null) {
            invalidCellsArea.y1 = rowIndex;
          }

          // Always update, because last encountered y = y2
          invalidCellsArea.y2 = rowIndex;

          // Lowest encountered x = x1
          invalidCellsArea.x1 = invalidCellsArea.x1 === null
            ? colIndex
            : Math.min(invalidCellsArea.x1, colIndex);

          // Highest encountered x = x2
          invalidCellsArea.x2 = invalidCellsArea.x2 === null
            ? colIndex
            : Math.max(invalidCellsArea.x2, colIndex);
        }
      }
    }

    /*
      TODO:
      - Either: find the area of the board that still contains incorrect cells.
      - Or: find adjacent cells with the same incorrect value.
      - Check if we're already at the solution. If so, we want to check how we
        can stack the next puzzle pieces in such a way, that they have no effect
        on the board.

      NOTE:
      - As a first step, we can just try to sort the possiblePositions by the amount
        of cells that would be transformed (we need to do an analysis of the
        positions of incorrect cells vs. the shape of the puzzle piece).
        See if this can be done in a more performant way than just stacking the before grid
        and the puzzle piece in several positions. That would go against the idea of the iterator.
      - When we know what cells are incorrect, we may be able to find out how many
        cells the puzzle piece should transform at minimum and exclude positions
        for that puzzle piece that would transform too little cells.
    */

    return {
      focusArea: invalidCellsArea as {
        x1: number;
        x2: number;
        y1: number;
        y2: number;
      },
    };
  }

  checkIsSolution (targetValue: Figure['value']) {
    this.isSolution = this.everyValueIs(targetValue);
    return this.isSolution;
  }

  toShortString () {
    return this.data.map((row) => row.join('')).join('');
  }
}
