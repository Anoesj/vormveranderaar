import { Grid } from './Grid';

export class GameBoard extends Grid {
  isSolution?: boolean;

  stack (figureCount: number, ...grids: Grid[]): GameBoard {
    const newGrid = this.clone();

    const gridsCount = grids.length;
    for (let i = 0; i < gridsCount; i++) {
      const {
        data,
        cols,
        rows,
      } = grids[i];

      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (let colIndex = 0; colIndex < cols; colIndex++) {
          newGrid.data[rowIndex][colIndex] = (newGrid.data[rowIndex][colIndex] + data[rowIndex][colIndex]) % figureCount;
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

  checkIsSolution (value: number) {
    this.isSolution = this.everyValueIs(value);
  }
}
