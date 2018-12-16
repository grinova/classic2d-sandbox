import {
  Color,
  COLOR_COMPONENTS,
  Mat4,
  Vec2
} from 'classic2d'
import { Draw } from './graphics/draw'

const WHITE = '#FFFFFF';

function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class Camera {
  private static readonly K = 100;
  private static readonly ZOOM_K = 10 / 9;

  center: Vec2;
  zoom: number;
  width: number;
  height: number;

  constructor(x: number, y: number, zoom: number, width: number, height: number) {
    this.center = new Vec2(x, y);
    this.zoom = zoom;
    this.width = width;
    this.height = height;
  }

  buildProjectionMatrix(): Mat4 {
    const near = 0.1;
    const far = 100.0;
    const right = this.width / (2 * Camera.K);
    const left = -right;
    const top = this.height / (2 * Camera.K);
    const bottom = -top;
    const projection = Mat4.ortho(left, right, bottom, top, near, far);
    projection.translate(0, 0, -10);
    const z = Math.pow(Camera.ZOOM_K, this.zoom);
    projection.scale(z, z, z);
    projection.translate(-this.center.x, -this.center.y);
    return projection;
  }

  move(offset: Vec2): void {
    const x = offset.x / Camera.K;
    const y = offset.y / Camera.K;
    const z = Math.pow(Camera.ZOOM_K, this.zoom);
    this.center.x += x / z;
    this.center.y += y / z;
  }
}

class RenderLine {
  private static readonly MAX_MATRICES = 512;
  private static readonly MAX_VERTICES = RenderLine.MAX_MATRICES * 2;
  private static readonly MAX_COLORS = RenderLine.MAX_MATRICES * 4;
  private static readonly MAX_INDICES = RenderLine.MAX_MATRICES;

  private static readonly VS_SOURCE = `
    attribute vec4 aVertex;
    attribute vec4 aColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertex;
      vColor = aColor;
    }
    `;

  private static readonly FS_SOURCE = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
    `;

  private gl: WebGLRenderingContext;
  private camera: Camera;

  private vertices = new Float32Array(RenderLine.MAX_VERTICES);
  private colors = new Float32Array(RenderLine.MAX_COLORS);
  private count = 0;
  private matrices = new Array<{ matrix: Mat4, offset: number, count: number }>(RenderLine.MAX_MATRICES);
  private indices = new Uint16Array(RenderLine.MAX_INDICES);
  private matricesCount = 0;

  private vertexBuffer: WebGLBuffer;
  private colorBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;

  private programInfo: {
    program: WebGLProgram,
    attribLocations: {
      vertexPosition: number;
      colorPosition: number;
    },
    uniformLocations: {
      projectionMatrix: WebGLUniformLocation,
      modelViewMatrix: WebGLUniformLocation
    }
  };

  constructor(gl: WebGLRenderingContext, camera: Camera) {
    this.gl = gl;
    this.camera = camera;
    this.vertexBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    const program = initShaderProgram(gl, RenderLine.VS_SOURCE, RenderLine.FS_SOURCE);
    this.programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, 'aVertex'),
        colorPosition: gl.getAttribLocation(program, 'aColor')
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix')
      }
    };

    for (let i = 0; i < RenderLine.MAX_INDICES; i++) {
      this.indices[i] = i;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  }

  addVertices(matrix: Mat4, ps: Vec2[], color: Color): void {
    let lastVertices = this.count;
    for (let i = 0; i < ps.length; i++) {
      if (this.count === RenderLine.MAX_VERTICES) {
        if (i > 0) {
          this.matrices[this.matricesCount++] = { matrix, offset: lastVertices / 2, count: (this.count - lastVertices) / 2 };
        }
        this.flush();
        lastVertices = this.count;
      }
      this.vertices[this.count++] = ps[i].x;
      this.vertices[this.count++] = ps[i].y;
      const offset = (this.count / 2 - 1) * COLOR_COMPONENTS;
      for (let j = 0; j < COLOR_COMPONENTS; j++) {
        this.colors[offset + j] = color[j];
      }
    }
    this.matrices[this.matricesCount++] = { matrix, offset: lastVertices / 2, count: (this.count - lastVertices) / 2 };
  }

  flush(): void {
    if (this.matricesCount === 0) {
      return;
    }

    const { gl, programInfo } = this;
    const projectionMatrix = this.camera.buildProjectionMatrix();

    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      programInfo.attribLocations.colorPosition, COLOR_COMPONENTS, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.colorPosition);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

    for (let i = 0; i < this.matricesCount; i++) {
      const matrix = this.matrices[i];
      gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, matrix.matrix);
      // FIXME: Магическое число 2 - это размер в байтах типа gl.UNSIGNED_SHORT
      gl.drawElements(gl.LINES, matrix.count, gl.UNSIGNED_SHORT, matrix.offset * 2);
    }

    gl.useProgram(null);

    this.count = 0;
    this.matricesCount = 0;
  }
}

class RenderPoint {
  private static readonly MAX_VERTICES = 512;
  private static readonly MAX_COLORS = RenderPoint.MAX_VERTICES * 2;
  private static readonly MAX_INDICES = RenderPoint.MAX_VERTICES / 2;

  private static readonly VS_SOURCE = `
    attribute vec4 aVertex;
    attribute vec4 aColor;

    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * aVertex;
      gl_PointSize = 5.0;
      vColor = aColor;
    }`;

  private static readonly FS_SOURCE = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }`;

  private gl: WebGLRenderingContext;
  private camera: Camera;

  private vertices = new Float32Array(RenderPoint.MAX_VERTICES);
  private colors = new Float32Array(RenderPoint.MAX_COLORS);
  private count = 0;
  private indices = new Uint16Array(RenderPoint.MAX_INDICES);

  private vertexBuffer: WebGLBuffer;
  private colorBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;

  private programInfo: {
    program: WebGLProgram,
    attribLocations: {
      vertexPosition: number;
      colorPosition: number;
    },
    uniformLocations: {
      projectionMatrix: WebGLUniformLocation
    }
  };

  constructor(gl: WebGLRenderingContext, camera: Camera) {
    this.gl = gl;
    this.camera = camera;
    this.vertexBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    const program = initShaderProgram(gl, RenderPoint.VS_SOURCE, RenderPoint.FS_SOURCE);
    this.programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, 'aVertex'),
        colorPosition: gl.getAttribLocation(program, 'aColor')
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix')
      }
    };

    for (let i = 0; i < RenderPoint.MAX_INDICES; i++) {
      this.indices[i] = i;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  }

  vertex(vertex: Vec2, color: Color): void {
    if (this.count === RenderPoint.MAX_VERTICES) {
      this.flush();
    }
    this.vertices[this.count++] = vertex.x;
    this.vertices[this.count++] = vertex.y;
    const colorOffset = ((this.count / 2) - 1) * COLOR_COMPONENTS;
    for (let i = 0; i < COLOR_COMPONENTS; i++) {
      this.colors[colorOffset + i] = color[i];
    }
  }

  flush(): void {
    if (this.count === 0) {
      return;
    }

    const { gl, programInfo } = this;
    gl.useProgram(programInfo.program);
    const projectionMatrix = this.camera.buildProjectionMatrix();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      programInfo.attribLocations.colorPosition, COLOR_COMPONENTS, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.colorPosition);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);

    gl.drawElements(gl.POINTS, this.count / 2, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(null);

    this.count = 0;
  }
}

class RenderText {
  private static readonly DEFAULT_SIZE = 12;
  private static readonly DEFAULT_FONT = 'Courier New';

  private gl2d: CanvasRenderingContext2D;
  private size: number;
  private yOffset: number = 0;

  private texts: {
    text: string;
    x: number;
    y: number;
  }[] = [];

  constructor(gl2d: CanvasRenderingContext2D, size: number = RenderText.DEFAULT_SIZE) {
    this.gl2d = gl2d;
    this.size = size;
  }

  fill(text: string, x: number, y: number): void {
    this.texts.push({ text, x, y });
  }

  print(text: string): void {
    this.fill(text, 0, this.yOffset);
    this.yOffset += this.size;
  }

  flush(): void {
    const { gl2d } = this;
    gl2d.clearRect(0, 0, gl2d.canvas.width, gl2d.canvas.height);
    gl2d.fillStyle = WHITE;
    gl2d.font = this.size + 'px ' + RenderText.DEFAULT_FONT;
    gl2d.textBaseline = 'top';

    for (const text of this.texts) {
      this.gl2d.fillText(text.text, text.x, text.y);
    }
    this.texts = [];
    this.yOffset = 0;
  }
}

export interface Options {
  textSize?: number;
}

export class DebugDraw implements Draw {
  private static readonly CIRCLE_SEGMENT = 32;

  private camera: Camera;
  private lines: RenderLine;
  private text: RenderText;
  private points: RenderPoint;

  constructor(
    gl: WebGLRenderingContext,
    gl2d: CanvasRenderingContext2D,
    camera: Camera,
    options?: void | Options
  ) {
    this.camera = camera;
    this.lines = new RenderLine(gl, this.camera);
    this.points = new RenderPoint(gl, this.camera);
    const textSize = options && options.textSize;
    this.text = new RenderText(gl2d, textSize);
  }

  drawCircle(position: Vec2, angle: number, radius: number, color: Color): void {
    const matrix = new Mat4().translate(position.x, position.y).rotate(angle).scale(radius, radius, 1)
    const ps: Vec2[] = [];
    const f = Math.PI / 2;
    const x = Math.cos(f);
    const y = Math.sin(f);
    let p1 = new Vec2(x, y);
    for (let i = 1; i <= DebugDraw.CIRCLE_SEGMENT; i++) {
      const fi = 2 * Math.PI / DebugDraw.CIRCLE_SEGMENT * i + f;
      const x = Math.cos(fi);
      const y = Math.sin(fi);
      const p2 = new Vec2(x, y);
      ps.push(p1);
      ps.push(p2);
      p1 = p2.copy();
    }
    this.lines.addVertices(matrix, [new Vec2(), ps[0]], color);
    this.lines.addVertices(matrix, ps, color);
  }

  drawPoint(position: Vec2, color: Color): void {
    this.points.vertex(position, color);
  }

  drawText(text: string, x: number, y: number): void {
    this.text.fill(text, x, y);
  }

  printText(text: string): void {
    this.text.print(text);
  }

  flush(): void {
    this.lines.flush();
    this.text.flush();
    this.points.flush();
  }
}
