export class MovingAverage {
  private count: number;
  private window: number[];
  private pointer: number = 0;
  private sum: number = 0;

  constructor(count: number = 100) {
    this.count = count;
    this.window = new Array<number>(this.count);
    for (let i = 0; i < this.count; i++) {
      this.window[i] = 0;
    }
  }

  get(value: number): number {
    this.sum += -this.window[this.pointer] + value;
    this.window[this.pointer] = value;
    this.pointer = (this.pointer + 1) % this.window.length;
    return this.sum / this.count;
  }
}
