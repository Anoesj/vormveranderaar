import { Grid, type GridLike } from './Grid';

// TODO: Extend Grid instead
export class GameBoard {
  grid: Grid<number>;

  constructor(grid: GridLike<number>) {
    this.grid = new Grid(grid);
  }

  get rows () {
    return this.grid.rows;
  }

  get cols () {
    return this.grid.cols;
  }
}
