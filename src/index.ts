import { TimeDelta, World } from 'classic2d';
import { appendDomElement, setCanvasSize } from './common/dom';
import { Camera } from './debug-draw';
import { DebugDraw as _DebugDraw } from './debug-draw';
import { Draw } from './graphics/draw';
import { Test } from './test';
import { SandboxWorld } from './world';

export type DebugDraw = _DebugDraw
export const DebugDraw = _DebugDraw

export function createSandbox<T>(options: SandboxOptionsBase<T>, parent: HTMLElement = document.body) {
  const { element: canvasWebgl, remove: removeCanvasWebgl } = appendDomElement('canvas', parent);
  const { element: canvas2d, remove: removeCanvas2d } = appendDomElement('canvas', parent);
  parent.style.overflow = 'hidden';
  parent.style.margin = '0px';
  canvasWebgl.style.position = 'absolute';
  canvas2d.style.position = 'absolute';

  const sandbox = new Sandbox({ ...options, canvasWebgl, canvas2d });
  const remove = () => {
    sandbox.stop();
    removeCanvasWebgl();
    removeCanvas2d();
  };
  return { sandbox, remove };
}

export type ActionHandler<T> = (world: World<T>, sandbox: Sandbox<T>) => void;

export interface Actions<T> {
  init?: void | ActionHandler<T>;
  reset?: void | ActionHandler<T>;
  keyDown?: void | ((event: KeyboardEvent) => void);
  preStep?: void | ((time: TimeDelta) => void);
  postStep?: void | (() => void);
}

export interface SandboxOptionsBase<T> {
  actions?: void | Actions<T>;
  width: number;
  height: number;
}

export interface SandboxOptions<T> extends SandboxOptionsBase<T> {
  canvasWebgl: HTMLCanvasElement;
  canvas2d: HTMLCanvasElement;
}

export class Sandbox<T> {
  private actions: void | Actions<T>;

  private canvasWebgl: HTMLCanvasElement;
  private canvas2d: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private gl2d: CanvasRenderingContext2D;
  private camera: Camera;
  private world: World;
  private test: Test;

  private past = 0;
  private running: boolean = false;

  constructor(options: SandboxOptions<T>) {
    const { actions, canvasWebgl, canvas2d, width, height } = options;
    this.actions = actions;
    this.canvasWebgl = canvasWebgl;
    this.canvas2d = canvas2d;

    setCanvasSize(this.canvasWebgl, width, height);
    setCanvasSize(this.canvas2d, width, height);

    this.camera = new Camera(0, 0, 0, width, height);

    this.gl = this.canvasWebgl.getContext('webgl') || this.canvasWebgl.getContext('experimental-webgl');
    this.gl2d = this.canvas2d.getContext('2d');

    const world = this.world = new SandboxWorld();
    this.test = world.getTest();
    if (this.actions && this.actions.init) {
      this.actions.init(this.world, this);
    }
  }

  getWebGLRenderingContext(): WebGLRenderingContext {
    return this.gl;
  }

  getCanvasRenderingContext2D(): CanvasRenderingContext2D {
    return this.gl2d;
  }

  getCamera(): Camera {
    return this.camera;
  }

  setDebugDraw(draw: Draw): void {
    this.world.setDebugDraw(draw);
  }

  keyDown(event: KeyboardEvent): void {
    this.handleKeyDown(event);
  }

  resize(width: number, height: number): void {
    this.handleResize(width, height);
  }

  run(): void {
    this.running = true;
    requestAnimationFrame(this.render);
  }

  reset(): void {
    this.world.clear();
    if (this.actions && this.actions.reset) {
      this.actions.reset(this.world, this);
    }
  }

  stop(): void {
    this.running = false;
  }

  zoom(zoom: number): void {
    this.camera.zoom = zoom;
  }

  private clearFrame(): void {
    const { gl } = this;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  private handleResize(width: number, height: number): void {
    this.camera.width = width;
    this.camera.height = height;

    setCanvasSize(this.canvasWebgl, width, height);
    setCanvasSize(this.canvas2d, width, height);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'r':
        this.reset();
        break;
      case 'p':
        this.test.pause();
        break;
      case 'o':
        this.test.pause(true);
        this.test.makeStep();
        break;
      default:
        if (this.actions && this.actions.keyDown) {
          this.actions.keyDown(event);
        }
    }
  }

  private render = (now: number): void => {
    if (!this.running) {
      return;
    }
    if (this.actions && this.actions.preStep) {
      this.actions.preStep(now);
    }
    const time = now - this.past;
    this.past = now;
    this.test.step(time);
    if (this.actions && this.actions.postStep) {
      this.actions.postStep();
    }
    this.clearFrame();
    this.test.draw(time);

    requestAnimationFrame(this.render);
  }
}
