import {
  Body,
  BodyDef,
  BodyType,
  CircleShape,
  Rot,
  Vec2,
  World
} from 'classic2d';
import { createSandbox } from './index';

function createBody(
  world: World,
  radius: number,
  density: number,
  position: Vec2,
  angle: number,
  linearVelocity: Vec2,
  angularVelocity: number,
  isStatic: boolean = false,
  inverse: boolean = false
): Body {
  const shape = new CircleShape();
  shape.radius = radius;
  const fd = { shape, density };

  const bd: BodyDef = { position, angle, linearVelocity, angularVelocity, inverse };
  const body = world.createBody(bd);
  if (isStatic) {
    body.type = BodyType.static;
  }

  body.setFixture(fd);
  return body;
}

function rand(max: number, min: number = 0): number {
  return Math.random() * (max - min) + min;
}

function createArena(world: World, radius: number): Body {
  return createBody(world, radius, 1000, new Vec2(), 0, new Vec2(), 0, true, true);
}

function createActors(world: World, count: number, arenaRadius: number): void {
  const ACTOR_RADIUS = 0.05;
  const bodies: Body[] = [];
  for (let i = 0; i < count; i++) {
    const position = findEmptyPlace(ACTOR_RADIUS, arenaRadius, bodies);
    if (!position) {
      return;
    }
    const linearVelocity = new Vec2(rand(1, 0)).rotate(new Rot().setAngle(rand(2 * Math.PI)));
    bodies.push(
      createBody(world, ACTOR_RADIUS, 1, position, 0, linearVelocity, 0));
  }
}

function createBodies(world: World): void {
  const ARENA_RADIUS = 3;
  createArena(world, ARENA_RADIUS);
  createActors(world, 100, ARENA_RADIUS);
}

function findEmptyPlace(radius: number, arenaRadius: number, bodies: Body[], iterations: number = 20): void | Vec2 {
  const maxEmptyRadius = arenaRadius - 2 * radius;
  for (let i = 0; i < iterations; i++) {
    const position = new Vec2(rand(maxEmptyRadius), 0).rotate(new Rot().setAngle(rand(2 * Math.PI)));
    if (bodies.every(body => {
      const p = body.getPosition();
      const r = body.getRadius();
      const d = Math.sqrt(p.sub(position).length());
      return d > radius + r;
    })) {
      return position;
    }
  }
}

function resetWorld(world: World): void {
  world.clear();
  createBodies(world);
}

window.onload = () => {
  const actions = {
    init: resetWorld,
    reset: resetWorld
  };
  const width = window.innerWidth;
  const height = window.innerHeight;
  const { sandbox } = createSandbox({ actions, width, height });
  const resize = (): void => {
    sandbox.resize(window.innerWidth, window.innerHeight);
  };
  const keyDown = (event: KeyboardEvent): void => {
    sandbox.keyDown(event);
  };
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', keyDown);
  sandbox.run();
};
