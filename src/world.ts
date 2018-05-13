import { ContactListener, World } from 'classic2d';
import { DebugDraw } from './debug-draw';
import { Test } from './test';

export class SandboxWorld extends World {
  private listener: void | ContactListener;
  private test: Test;

  constructor(debugDraw: DebugDraw) {
    super();
    this.test = new Test(this, debugDraw);
    super.setContactListener(this.test);
  }

  getTest(): Test {
    return this.test;
  }

  setContactListener(listener: ContactListener): void {
    this.test.setContactListener(listener);
  }
}
