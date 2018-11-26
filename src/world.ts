import { ContactListener, World } from 'classic2d';
import { Draw } from './graphics/draw';
import { Test } from './test';

export class SandboxWorld extends World {
  private test: Test;

  constructor() {
    super();
    this.test = new Test(this);
    super.setContactListener(this.test);
  }

  getTest(): Test {
    return this.test;
  }

  setContactListener(listener: ContactListener): void {
    this.test.setContactListener(listener);
  }

  setDebugDraw(draw: Draw): void {
    super.setDebugDraw(draw)
    this.test.setDebugDraw(draw)
  }
}
