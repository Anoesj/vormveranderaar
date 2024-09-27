export class MathHelper {
  static sumReducer = (acc: number, val: number) => acc + val;
  static productReducer = (acc: number, val: number) => acc * val;

  static sum (values: number[]): number {
    return values.reduce(this.sumReducer, 0);
  }

  static product (arr: number[]): number {
    return arr.reduce(this.productReducer, 1);
  }
}
