export class Position {
  /**
   * A cache to store instances of Position.
   */
  static #instanceCache = new Map<string, Position>();

  /**
   * A private key to prevent direct instantiation of the Position class.
   * Can only be referenced from within the class (also static methods).
   */
  static #constructorKey = Symbol();

  #x: number;
  #y: number;

  constructor (x: number, y: number, constructorKey: symbol) {
    if (constructorKey !== Position.#constructorKey) {
      throw new Error('Position cannot be instantiated directly. Use Position.get() instead.');
    }

    this.#x = x;
    this.#y = y;
  }

  get x () {
    return this.#x;
  }

  get y () {
    return this.#y;
  }

  static get (x: number, y: number): Position {
    const key = Position.toString(x, y);

    if (this.#instanceCache.has(key)) {
      return this.#instanceCache.get(key)!;
    }

    const newPosition = new Position(x, y, Position.#constructorKey);
    this.#instanceCache.set(key, newPosition);
    return newPosition;
  }

  static toString (x: number, y: number) {
    return `(${x}, ${y})`;
  }

  toString () {
    return Position.toString(this.#x, this.#y);
  }

  toJSON () {
    return this.toString();
  }

  // get left () {
  //   return Position.get(this.x - 1, this.y);
  // }

  // get right () {
  //   return Position.get(this.x + 1, this.y);
  // }

  // get up () {
  //   return Position.get(this.x, this.y - 1);
  // }

  // get down () {
  //   return Position.get(this.x, this.y + 1);
  // }

  // isAdjacentTo (position: Position) {
  //   return (
  //     (this.x === position.x && Math.abs(this.y - position.y) === 1) ||
  //     (this.y === position.y && Math.abs(this.x - position.x) === 1)
  //   );
  // }
}
