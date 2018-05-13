import {
  COLORS,
  Contact,
  ContactListener,
  World
} from 'classic2d';
import { DebugDraw } from './debug-draw';
import { MovingAverage } from './moving-average';

export class Test<T = any> implements ContactListener<T> {
  private world: World;
  private debugDraw: DebugDraw;
  private contactListener?: void | ContactListener<T>;

  private contacts: Contact[];
  private frameTimeMovingAverage = new MovingAverage(60);
  private isPause: boolean = false;
  private shouldMakeStep: boolean = false;

  constructor(world: World, debugDraw: DebugDraw, contactListener?: void | ContactListener<T>) {
    this.world = world;
    this.debugDraw = debugDraw;
    this.contactListener = contactListener;
    this.world.setDebugDraw(this.debugDraw);
    this.clearContacts();
  }

  beginContact(contact: Contact<T>): void {
    if (!this.hasContact(contact)) {
      this.contacts.push(contact);
    }
    if (this.contactListener) {
      this.contactListener.beginContact(contact);
    }
  }

  endContact(contact: Contact<T>): void {
    if (this.contactListener) {
      this.contactListener.endContact(contact);
    }
  }

  preSolve(contact: Contact<T>): void {
    if (this.contactListener) {
      this.contactListener.preSolve(contact);
    }
  }

  draw(time: number): void {
    this.world.drawDebugData();
    this.drawHelp(time);
    this.debugDraw.flush();
    this.drawContacts();
    this.clearContacts();
  }

  makeStep(): void {
    this.shouldMakeStep = true;
  }

  pause(isPause: boolean = !this.isPause): void {
    this.isPause = isPause;
  }

  setContactListener(contactListener: ContactListener): void {
    this.contactListener = contactListener;
  }

  step(time: number): void {
    if (!this.isPause || this.shouldMakeStep) {
      this.world.step(time);
      this.shouldMakeStep = false;
    }
  }

  private clearContacts(): void {
    this.contacts = [];
  }

  private drawContacts(): void {
    for (const contact of this.contacts) {
      const point = contact.getPoint();
      this.debugDraw.drawPoint(point, COLORS.CONTACT);
    }
  }

  private drawHelp(time: number): void {
    const averageFrameTime = this.frameTimeMovingAverage.get(time);
    const help = '[R] - reset; [P] - pause; [O] - step';
    const fps = 'FPS: ' + Math.floor(1000 / averageFrameTime).toString();
    const frame = 'Frame time: ' + averageFrameTime.toFixed(3).toString() + ' ms';
    this.debugDraw.printText(help);
    this.debugDraw.printText(fps);
    this.debugDraw.printText(frame);
    if (this.isPause) {
      this.debugDraw.printText('[PAUSE]');
    }
  }

  private hasContact(contact: Contact): boolean {
    for (const c of this.contacts) {
      if (c.bodyA === contact.bodyA && c.bodyB === contact.bodyB) {
        return true;
      }
    }
    return false;
  }
}
