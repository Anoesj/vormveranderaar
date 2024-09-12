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

  countIncorrectCells (targetValue: Figure['value']) {
    return this.cells - this.countValue(targetValue);
  }

  countTransformsNeededUntilEveryValueIs (
    targetValue: Figure['value'],
    figuresCount: number,
  ) {
    const {
      data,
      cols,
      rows,
    } = this;

    let count = 0;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        let value = data[rowIndex]![colIndex]!;
        while (value !== targetValue) {
          value = (value + 1) % figuresCount;
          count++;
        }
      }
    }

    return count;
  }

  checkIsSolution (targetValue: Figure['value']) {
    this.isSolution = this.everyValueIs(targetValue);
    return this.isSolution;
  }

  toShortString () {
    return this.data.map(row => row.join('')).join('');
  }
}
