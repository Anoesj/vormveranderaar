export type GridLike<T = unknown> = T[][];

export class Grid {
  data: GridLike<number>;
  rows: number;
  cols: number;
  cells: number;

  constructor (grid: GridLike<number>) {
    this.data = grid;
    this.rows = this.#rowsCount;
    this.cols = this.#colsCount;
    this.cells = this.rows * this.cols;
  }

  /**
   * This can be used by methods that return another instance of this class
   * or if ran by a subclass, the subclass.
   *
   * It makes sure the typing of the return value is not `Grid` when ran
   * by a subclass of `Grid`, but the subclass itself.
   *
   * NOTE: Things will get harder when subclasses have different
   * constructor parameters than `Grid`, good luck with that.
   */
  construct<T extends this> (grid: GridLike<number>): T {
    return new (this.constructor as new (grid: GridLike<number>) => T)(grid);
  }

  clone () {
    // NOTE: Interestingly, this is WAAAY faster than `structuredClone(this.data)`.
    const dataClone = this.data.map((row) => row.map((colVal) => colVal));
    return this.construct(dataClone);
  }

  get #rowsCount () {
    return this.data.length;
  }

  get #colsCount () {
    return this.data[0].length;
  }

  get (x: number, y: number) {
    return this.data.at(y)?.at(x);
  }

  get topLeft () {
    return this.get(0, 0)!;
  }

  get topRight () {
    return this.get(-1, 0)!;
  }

  get bottomLeft () {
    return this.get(0, -1)!;
  }

  get bottomRight () {
    return this.get(-1, -1)!;
  }

  countValue (value: number) {
    let count = 0;

    const {
      rows,
      cols,
      data,
    } = this;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        if (data[rowIndex][colIndex] === value) {
          count++;
        }
      }
    }

    return count;
  }

  everyValueIs (value: number) {
    return this.data.every(
      (row) => row.every((colVal) => colVal === value)
    );
  }

  toString () {
    let str = '';

    const {
      data,
      cols,
      rows,
    } = this;

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      str += '\n';
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        if (colIndex > 0) {
          str += ',';
        }

        str += String(data[rowIndex][colIndex]).padStart(3, ' ');
      }
    }

    return str;
  }
}
