export type GridLike<T = unknown> = T[][];

export class Grid<T> {
  grid: GridLike<T>;
  rows: number;
  cols: number;

  isSolution?: boolean;

  constructor(grid: GridLike<T>) {
    this.grid = grid;
    this.rows = this.#rowsCount;
    this.cols = this.#colsCount;
  }

  get #rowsCount() {
    return this.grid.length;
  }

  get #colsCount() {
    return this.grid[0].length;
  }

  get(x: number, y: number) {
    return this.grid.at(y)?.at(x);
  }

  get topLeft() {
    return this.get(0, 0)!;
  }

  get topRight() {
    return this.get(-1, 0)!;
  }

  get bottomLeft() {
    return this.get(0, -1)!;
  }

  get bottomRight() {
    return this.get(-1, -1)!;
  }

  toString() {
    let str = '';

    for (const row of this.grid) {
      str += `\n${row.map((colVal) => String(colVal).padStart(3, ' '))}`;
    }

    str += '\n';

    return str;
  }

  // toJSON() {
  //   return this.toString();
  // }

  toEmpty<T extends number | boolean>(value: T) {
    const cols = new Array<T>(this.cols).fill(value);

    const rows = new Array(this.rows)
      .fill('temp')
      .map(() => structuredClone(cols));

    return new Grid<T>(rows);
  }

  clone() {
    return new Grid<T>(structuredClone(this.grid));
  }

  static assertNumericGrid(grid: Grid<unknown>): grid is Grid<number> {
    return typeof grid.get(0, 0) === 'number';
  }

  stack(figureCount: number, ...grids: Grid<number>[]): Grid<number> {
    Grid.assertNumericGrid(this);

    const newGrid = this.clone() as Grid<number>;

    /*
    for (const [rowIndex, row] of newGrid.grid.entries()) {
      for (const [colIndex, colVal] of row.entries()) {
        const otherGridsValsStacked = 
        grids.map(grid => grid.get(colIndex, rowIndex)!);
        
        newGrid.grid[rowIndex]![colIndex]! = (colVal + otherGridsValsStacked) % figureCount;
      }
    }
    */

    for (const grid of grids) {
      newGrid.grid = newGrid.grid.map((row, rowIndex) =>
        row.map(
          (colVal, colIndex) =>
            (colVal + grid.grid[rowIndex][colIndex]) % figureCount
        )
      );
    }

    return newGrid;
  }

  everyValueIs(value: T) {
    return this.grid.every((row) => row.every((colVal) => colVal === value));
  }

  checkIsSolution(value: T) {
    this.isSolution = this.everyValueIs(value);
  }
}
