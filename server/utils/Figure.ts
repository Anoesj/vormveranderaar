export class Figure {
  name: string | number;
  value: number;

  constructor (name: string | number, value: number) {
    this.name = name;
    this.value = value;
  }

  toString () {
    return `${this.name} (${this.value})`;
  }
}
