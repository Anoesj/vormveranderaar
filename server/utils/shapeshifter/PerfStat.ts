export class PerfStat {
  length = 0;
  average = 0;
  total = 0;

  push (value: number) {
    this.total += value;
    this.average = ((this.average * this.length) + value) / (this.length + 1);
    this.length++;
  }
}
