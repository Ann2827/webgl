import "./style.css";
import { Matrix } from "sylvester-es6";
import { isCanvas, isScript } from "./validation";

function initWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  let gl = null;

  try {
    // Попытаться получить стандартный контекст. Если не получится, попробовать получить экспериментальный.
    gl = canvas.getContext("webgl"); // || canvas.getContext("experimental-webgl");
  } catch (e) {}

  // Если мы не получили контекст GL, завершить работу
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
    gl = null;
  }

  return gl;
}

function getShader(gl: WebGLRenderingContext, id: string): null | WebGLShader {
  const shaderScript = document.getElementById(id);
  if (!shaderScript || !isScript(shaderScript)) {
    return null;
  }

  let theSource = "";
  let currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == currentChild.TEXT_NODE) {
      theSource += currentChild.textContent;
    }

    currentChild = currentChild.nextSibling;
  }

  let shader: WebGLShader | null;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    // неизвестный тип шейдера
    return null;
  }
  if (!shader) return null;

  gl.shaderSource(shader, theSource);
  // скомпилировать шейдерную программу
  gl.compileShader(shader);
  // Проверить успешное завершение компиляции
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
    );
    return null;
  }

  return shader;
}

function initShaders(gl: WebGLRenderingContext) {
  const fragmentShader = getShader(gl, "shader-fs");
  const vertexShader = getShader(gl, "shader-vs");
  if (!fragmentShader || !vertexShader) return;

  // создать шейдерную программу
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // Если создать шейдерную программу не удалось, вывести предупреждение
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }
  gl.useProgram(shaderProgram);
  const vertexPositionAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexPosition"
  );
  gl.enableVertexAttribArray(vertexPositionAttribute);
}

// var horizAspect = 480.0 / 640.0;

function initBuffers(gl: WebGLRenderingContext) {
  const squareVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

  var vertices = [
    1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function loadIdentity(): Matrix {
  return Matrix.I(4);
}

function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}

function translation (v) {
  if (v.elements.length == 2) {
    var r = Matrix.I(3);
    r.elements[2][0] = v.elements[0];
    r.elements[2][1] = v.elements[1];
    return r;
  }

  if (v.elements.length == 3) {
    var r = Matrix.I(4);
    r.elements[0][3] = v.elements[0];
    r.elements[1][3] = v.elements[1];
    r.elements[2][3] = v.elements[2];
    return r;
  }

  throw "Invalid length for Translation";
};

function mvTranslate(v) {
  multMatrix(translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setMatrixUniforms(gl: WebGLRenderingContext) {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(
    pUniform,
    false,
    new Float32Array(perspectiveMatrix.flatten())
  );

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}

function makeFrustum(
  left: number,
  right: number,
  bottom: number,
  top: number,
  znear: number,
  zfar: number
) {
  var X = (2 * znear) / (right - left);
  var Y = (2 * znear) / (top - bottom);
  var A = (right + left) / (right - left);
  var B = (top + bottom) / (top - bottom);
  var C = -(zfar + znear) / (zfar - znear);
  var D = (-2 * zfar * znear) / (zfar - znear);

  return new Matrix([
    [X, 0, A, 0],
    [0, Y, B, 0],
    [0, 0, C, D],
    [0, 0, -1, 0],
  ]);
}

function makePerspective(
  fovy: number,
  aspect: number,
  znear: number,
  zfar: number
) {
  var ymax = znear * Math.tan((fovy * Math.PI) / 360.0);
  var ymin = -ymax;
  var xmin = ymin * aspect;
  var xmax = ymax * aspect;

  return makeFrustum(xmin, xmax, ymin, ymax, znear, zfar);
}

function drawScene(gl: WebGLRenderingContext) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const perspectiveMatrix = makePerspective(45, 640.0 / 480.0, 0.1, 100.0);

  const m = loadIdentity();
  mvTranslate([-0.0, 0.0, -6.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function main(selector: string) {
  const canvas = document.querySelector(selector);
  if (!isCanvas(canvas)) return;

  const gl = initWebGL(canvas);
  if (!gl) return;

  gl.clearColor(0.0, 0.0, 0.5, 0.5); // установить в качестве цвета очистки буфера цвета чёрный, полная непрозрачность
  gl.enable(gl.DEPTH_TEST); // включает использование буфера глубины
  gl.depthFunc(gl.LEQUAL); // определяет работу буфера глубины: более ближние объекты перекрывают дальние
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // очистить буфер цвета и буфер глубины.

  initShaders(gl);
  initBuffers(gl);
  drawScene(gl);
}

main("#gl-canvas");
