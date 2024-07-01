// @ts-check

/**@type {HTMLCanvasElement | null | undefined}*/
let canvas;
/**@type {WebGLRenderingContext | null | undefined}*/
let gl;
/**@type {WebGLProgram | null | undefined} */
let program;
/**@type {WebGLBuffer | null | undefined} */
let vertexBuffer;

try {
    main();
} catch (error) {
    alert(error);
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
    attribute vec3 position;

    void main() {
        gl_Position = vec4(position, 1.0);
    }
    `);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        console.error(info);
        throw "Failed to compile vertex shader.";
    }

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragShader) { throw "Failed to create fragment shader."; }
    
    gl.shaderSource(fragShader, `
    void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
    }
    `);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        console.error(info);
        throw "Failed to compile fragment shader.";
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);

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

    compileProgram(gl);

    gl.enableVertexAttribArray(0);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0,
        0.0,  0.5, 0.0,
    ]),
    gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    requestAnimationFrame(draw);
}

/**
 * @param {DOMHighResTimeStamp} dt 
 */
function draw(dt) {
    if (!canvas || !gl || !vertexBuffer || !program) return;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.clearColor(0.5, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(draw)
}
