// @ts-check

let boardSize = 10;
let wall_height = 0.1;
/**
 * @type {{t: boolean, l: boolean}[]}
 */
let walls = [];

for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
        walls.push({
            t: Math.random() > 0.5,
            l: Math.random() > 0.5,
        });
    }
}

/**@type {HTMLCanvasElement | null | undefined}*/
let canvas;
/**@type {WebGLRenderingContext | null | undefined}*/
let gl;
/**@type {WebGLProgram | null | undefined} */
let program;
/**@type {WebGLBuffer | null | undefined} */
let vertexBuffer;
/**@type {Float32Array | undefined} */
let perspective;

const IDENTITY = new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1,
]);

try {
    main();
} catch (error) {
    alert(error);
}

/**
 * 
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {Float32Array}
 */
function matMul(a, b) {
    let out = new Float32Array(16);
    // col
    for (let i = 0; i < 4; i++) {
        // row
        for (let j = 0; j < 4; j++) {
            out[i + j*4] = a[i]*b[4*j] + a[i+4]*b[4*j+1] + a[i+8]*b[4*j+2] + a[i+12]*b[4*j+3];
        }
    }
    return out;
}

/**
 * @param {number} fovy
 * @param {number} aspect
 * @param {number} near
 * @param {number} far
 * @returns {Float32Array}
 */
function genPerspective(fovy, aspect, near, far) {
    // Citation: https://webglfundamentals.org/webgl/lessons/webgl-3d-perspective.html
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fovy);
    var rangeInv = 1.0 / (near - far);
 
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Float32Array}
 */
function scale(x, y, z) {
    return new Float32Array([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1,
    ]);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Float32Array}
 */
function translate(x, y, z) {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1,
    ]);
}

/**
 * @param {number} angle
 * @returns {Float32Array}
 */
function rotX(angle) {
    return new Float32Array([
      1, 0, 0, 0,
      0, Math.cos(angle), Math.sin(angle), 0,
      0, -Math.sin(angle), Math.cos(angle), 0,
      0, 0, 0, 1,
    ]);
}

/**
 * @param {number} angle
 * @returns {Float32Array}
 */
function rotY(angle) {
    return new Float32Array([
      Math.cos(angle), 0, -Math.sin(angle), 0,
      0, 1, 0, 0,
      Math.sin(angle), 0, Math.cos(angle), 0,
      0, 0, 0, 1,
    ]);
}

/**
 * @param {number} angle
 * @returns {Float32Array}
 */
function rotZ(angle) {
    return new Float32Array([
      Math.cos(angle), -Math.sin(angle), 0, 0,
      Math.sin(angle), Math.cos(angle), 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
}

/**
 * @param {WebGLRenderingContext} gl
 */
function compileProgram(gl) {
    program = gl.createProgram();
    if (!program) { throw "Failed to create program."; }

    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) { throw "Failed to create vertex shader."; }
    
    gl.shaderSource(vertexShader, `
    #version 100
    
    attribute vec3 position;
    
    uniform mat4 perspective;
    uniform mat4 model;

    void main() {
        gl_Position = perspective * model * vec4(position, 1.0);
    }
    `);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(vertexShader);
        console.error(info);
        throw "Failed to compile vertex shader.";
    }

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragShader) { throw "Failed to create fragment shader."; }
    
    gl.shaderSource(fragShader, `
    #version 100

    precision highp float;

    uniform vec3 colour;

    void main() {
        gl_FragColor = vec4(colour, 1.0);
    }
    `);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(fragShader);
        console.error(info);
        throw "Failed to compile fragment shader.";
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);

    gl.viewport(0, 0, 800, 600);

    gl.linkProgram(program);

    gl.useProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        console.error(info);
        throw "Failed to link program.";
    }
}

function main() {
    canvas = /**@type {HTMLCanvasElement | null}*/(document.getElementById("canvas"));
    gl = canvas?.getContext("webgl");

    if (!gl) { throw "Failed to initialise canvas. Your browser or device may not support it."; }

    gl.enable(gl.DEPTH_TEST);

    compileProgram(gl);

    gl.enableVertexAttribArray(0);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0,
        -0.5,  0.5, 0.0,
        -0.5, 0.5, 0.0,
        0.5, -0.5, 0.0,
        0.5, 0.5, 0.0,
    ]),
    gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    requestAnimationFrame(draw);
}

let last_width;
let last_height;

/**
 * @param {DOMHighResTimeStamp} time
 */
function draw(time) {
    if (!canvas || !gl || !vertexBuffer || !program) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (!perspective || last_width !== canvas.width || last_height !== canvas.height) {
        perspective = genPerspective(1.0, canvas.width / canvas.height, 0.1, 100.0);
        last_width = canvas.width;
        last_height = canvas.height;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // perspective matrix
    let loc = gl.getUniformLocation(program, "perspective");
    gl.uniformMatrix4fv(loc, false, perspective);

    // board colour
    loc = gl.getUniformLocation(program, "colour");
    gl.uniform3f(loc, 0.5, 0.1, 0.5);

    let board = matMul(translate(0, 0, -1.5), matMul(rotY(0.2), rotX(0.1)));

    // board position;
    loc = gl.getUniformLocation(program, "model");
    gl.uniformMatrix4fv(loc, false, board);

    gl.clearColor(0.5, 0.7, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    let cap = matMul(translate(0.0, 0.5, 0.0), matMul(rotX(Math.PI/2), scale(1.0, 0.01, 0.1)));

    for (let i = 0; i < boardSize+1; i++) {
        for (let j = 0; j < boardSize+1; j++) {
            if (i < boardSize && walls[j+boardSize*i].t) {
                // wall colour
                loc = gl.getUniformLocation(program, "colour");
                gl.uniform3f(loc, 1.0, 0.1, 0.1);
                
                let wall = matMul(translate(-0.5 + 0.5/boardSize + i/boardSize, 0.5 - j/boardSize, wall_height/2), matMul(rotX(Math.PI/2), scale(1/boardSize, wall_height, 1.0)));
        
                loc = gl.getUniformLocation(program, "model");
                gl.uniformMatrix4fv(loc, false, matMul(board, wall));
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // cap colour
                loc = gl.getUniformLocation(program, "colour");
                gl.uniform3f(loc, 0.1, 0.1, 1.0);
                
                loc = gl.getUniformLocation(program, "model");
                gl.uniformMatrix4fv(loc, false, matMul(board, matMul(wall, cap)));
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }

            if (j < boardSize && walls[j+boardSize*i].l) {
                // wall colour
                loc = gl.getUniformLocation(program, "colour");
                gl.uniform3f(loc, 1.0, 0.1, 0.1);
                
                let wall = matMul(translate(-0.5 + i/boardSize, 0.5 - 0.5/boardSize - j/boardSize, wall_height/2), matMul(rotZ(Math.PI/2), matMul(rotX(Math.PI/2), scale(1/boardSize, wall_height, 1.0))));
        
                loc = gl.getUniformLocation(program, "model");
                gl.uniformMatrix4fv(loc, false, matMul(board, wall));
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // cap colour
                loc = gl.getUniformLocation(program, "colour");
                gl.uniform3f(loc, 0.1, 0.1, 1.0);
                
                loc = gl.getUniformLocation(program, "model");
                gl.uniformMatrix4fv(loc, false, matMul(board, matMul(wall, cap)));
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        }
    }

    requestAnimationFrame(draw);
}
