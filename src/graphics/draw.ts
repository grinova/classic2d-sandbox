import { Draw as Classic2dDraw } from 'classic2d';

export interface Draw extends Classic2dDraw {
  drawText(text: string, x: number, y: number): void;
  printText(text: string): void;
  flush(): void;
}
