// @ts-check

class Vec2 {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
    }

    /**
     * @returns {number}
     */
    length() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    /**
     * @param {Vec2} other
     * @returns {number}
     */
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    /**
     * @param {Vec2} other
     * @returns {Vec2}
     */
    project(other) {
        return other.mul(this.dot(other) / other.length());
    }

    /**
     * @param {Vec2} other
     * @returns {Vec2}
     */
    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    /**
     * @param {Vec2} other
     * @returns {Vec2}
     */
    sub(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    /**
     * @param {number} other
     */
    mul(other) {
        return new Vec2(this.x * other, this.y * other);
    }

    /**
     * @param {number} other
     */
    div(other) {
        return new Vec2(this.x / other, this.y / other);
    }
}

class AABB {
    /**
     * @param {Vec2} min
     * @param {Vec2} max
     */
    constructor(min, max) {
        /** @type {Vec2} */
        this.min = min;
        /** @type {Vec2} */
        this.max = max;
    }

    // Citation: https://gamedev.stackexchange.com/questions/156870/how-do-i-implement-a-aabb-sphere-collision
    /**
     * @param {Vec2} p
     * @returns {number}
     */
    squareDistPoint(p) {
        let sqrDist = 0;

        if (p.x < this.min.x) sqrDist += (this.min.x - p.x) * (this.min.x - p.x);
        if (p.x > this.max.x) sqrDist += (p.x - this.max.x) * (p.x - this.max.x);
        if (p.y < this.min.y) sqrDist += (this.min.y - p.y) * (this.min.y - p.y);
        if (p.y > this.max.y) sqrDist += (p.y - this.max.y) * (p.y - this.max.y);

        return sqrDist;
    }

    // Citation: https://gamedev.stackexchange.com/questions/156870/how-do-i-implement-a-aabb-sphere-collision
    /**
     * 
     * @param {Sphere} sphere
     * @returns {boolean}
     */
    collideSphere(sphere) {
        let sqrDist = this.squareDistPoint(sphere.centre);
        return sqrDist <= sphere.radius*sphere.radius;
    }

    // Citation: https://gamedev.stackexchange.com/questions/156870/how-do-i-implement-a-aabb-sphere-collision
    /**
     * 
     * @param {Vec2} p
     * @returns {Vec2}
     */
    closestPoint(p) {
        let qx = 0;
        let qy = 0;

        let v = p.x;
        if (v < this.min.x) v = this.min.x;
        if (v > this.max.x) v = this.max.x;
        qx = v;

        v = p.y;
        if (v < this.min.y) v = this.min.y;
        if (v > this.max.y) v = this.max.y;
        qy = v;
        
        return new Vec2(qx, qy);
    }
}

class Sphere {
    /**
     * @param {Vec2} centre
     * @param {number} radius
     */
    constructor(centre, radius) {
        /** @type {Vec2} */
        this.centre = centre;
        /** @type {number} */
        this.radius = radius;
    }
}

let boardSize = 10;
let wall_height = 0.1;
/**
 * @type {{t: boolean, l: boolean}[]}
 */
let walls = [];

for (let i = 0; i < boardSize + 1; i++) {
    for (let j = 0; j < boardSize + 1; j++) {
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
function scale(x, y=x, z=x) {
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

let statusElem = document.getElementById("status");
if (!statusElem) throw "Status element missing.";

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

    varying vec3 v_pos;

    void main() {
        v_pos = position;
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
    uniform int render_mode;

    varying vec3 v_pos;

    void main() {
        vec4 final = vec4(0.0);
        if (render_mode == 0) {
            final = vec4(colour, 1.0);
        } else if (render_mode == 1) {
            if (length(v_pos) > 0.5) {
                discard;
            }
            float d = dot(v_pos, vec3(-0.707, 0.707, 0.0)) / 2.0;
            final = vec4(colour + d*vec3(1.0) - length(v_pos)*length(v_pos), 1.0);
        } else if (render_mode == 2) {
            final = vec4(colour * (v_pos.y + 10.0) / 10.5, 1.0);
        }
        gl_FragColor = final;
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

let rot = 0;

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

    if (window.DeviceOrientationEvent) {
        // window.addEventListener('deviceorientation', (event) => {
        //     if (statusElem) statusElem.innerText = JSON.stringify(event);
        // }, false);
        window.addEventListener('deviceorientationabsolute', (event) => {
            if (!event.alpha || !event.beta || !event.gamma || !statusElem) return;
            statusElem.innerText = "Alpha: " + Math.round(event.alpha * 100.0)/100.0 + ", Beta: " + Math.round(event.beta * 100.0)/100.0 + ", Gamma: " + Math.round(event.gamma * 100.0)/100.0;
            rot = event.beta;
        }, false);
    } else {
        throw "Doesn't support device orientation.";
    }

    requestAnimationFrame(draw);
}

let lastWidth;
let lastHeight;

let ball = new Sphere(new Vec2(-0.023, 0.6), 0.025);
let ballVel = new Vec2(0, 0);

let lastTime;

function drawObject(gl, r, g, b, renderMode, model) {
    let loc = gl.getUniformLocation(program, "colour");
    gl.uniform3f(loc, r, g, b);

    loc = gl.getUniformLocation(program, "render_mode");
    gl.uniform1i(loc, renderMode);

    loc = gl.getUniformLocation(program, "model");
    gl.uniformMatrix4fv(loc, false, model);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * @param {DOMHighResTimeStamp} time
 */
function draw(time) {
    if (!lastTime) lastTime = time;
    
    let dt = (time - lastTime) / 1000.0;
    lastTime = time;

    if (!canvas || !gl || !vertexBuffer || !program) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (!perspective || lastWidth !== canvas.width || lastHeight !== canvas.height) {
        perspective = genPerspective(1.0, canvas.width / canvas.height, 0.1, 100.0);
        lastWidth = canvas.width;
        lastHeight = canvas.height;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // perspective matrix
    let loc = gl.getUniformLocation(program, "perspective");
    gl.uniformMatrix4fv(loc, false, perspective);

    gl.clearColor(30/255, 21/255, 42/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // let boardZRot = -0.1;
    let boardZRot = rot * Math.PI / 180.0;
    let boardRot = rotZ(boardZRot);

    let board = matMul(translate(0, 0, -1.5), boardRot);

    drawObject(gl, 78/255, 103/255, 102/255, 0, board);

    let cap = matMul(translate(0.0, 0.5, 0.0), matMul(rotX(Math.PI/2), scale(1.0, 0.005, 1.0)));

    for (let i = 0; i < boardSize+1; i++) {
        for (let j = 0; j < boardSize+1; j++) {
            if (i < boardSize && walls[j+boardSize*i].t) {
                let wall = matMul(translate(-0.5 + 0.5/boardSize + i/boardSize, 0.5 - j/boardSize, wall_height/2), matMul(rotX(Math.PI/2), scale(1/boardSize, wall_height, 1.0)));
                
                // wall
                drawObject(gl, 90/255, 177/255, 187/255, 2, matMul(board, wall));

                // cap
                drawObject(gl, 120/255, 241/255, 255/255, 0, matMul(board, matMul(wall, cap)));
            }

            if (j < boardSize && walls[j+boardSize*i].l) {
                let wall = matMul(translate(-0.5 + i/boardSize, 0.5 - 0.5/boardSize - j/boardSize, wall_height/2), matMul(rotZ(Math.PI/2), matMul(rotX(Math.PI/2), scale(1/boardSize, wall_height, 1.0))));
                
                // wall
                drawObject(gl, 90/255, 177/255, 187/255, 2, matMul(board, wall));

                // cap
                drawObject(gl, 120/255, 241/255, 255/255, 0, matMul(board, matMul(wall, cap)));
            }
        }
    }

    ballVel.x -= 1.0*dt*-Math.sin(boardZRot);
    ballVel.y -= 1.0*dt*Math.cos(boardZRot);
    
    ball.centre.x += ballVel.x*dt;
    ball.centre.y += ballVel.y*dt;

    runCollisions();

    let ballModel = matMul(translate(0,0,-1.5), matMul(boardRot, matMul(translate(ball.centre.x, ball.centre.y, 0.05), scale(ball.radius*2))));

    // ball
    drawObject(gl, 0/255, 230/255, 23/255, 1, ballModel);

    requestAnimationFrame(draw);
}

function runCollisions(until=(boardSize+1)*(boardSize+1)) {
    for (let idx = 0; idx < until; idx++) {
        let i = Math.floor(idx/boardSize);
        let j = idx % boardSize;
        // there is a wall here
        if (i < boardSize && walls[idx].t) {
            let wallLeft = -0.5 + i/boardSize;
            let wallY = 0.5 - j/boardSize;

            let wall = new AABB(new Vec2(wallLeft, wallY-0.05/boardSize), new Vec2(wallLeft+1/boardSize, wallY+0.05/boardSize));

            if (wall.collideSphere(ball)) {
                // Citation: https://www.gamedev.net/forums/topic/544686-sphere-aabb-collision-repsonse/544686/

                // Vector pbox = aabb.closestPoint(sphere.position);
                // Vector delta = (sphere.position - pbox);
                // float distance =  delta.length();
                // if(distance < 0.000001f || distance > sphere.radius) return false;Vector normal = delta / distance; vector push = normal * (sphere.radius - distance);sphere.position += push;sphere.velocity -= normal * sphere.velocity.dotProduct(delta);

                let pbox = wall.closestPoint(ball.centre);

                let delta = pbox.sub(ball.centre);
                delta = delta.mul(ball.radius / (delta.length()+0.0001));

                let psphere = ball.centre.add(delta);
                
                let push = pbox.sub(psphere);

                ball.centre = ball.centre.add(push);

                let proj = ballVel.project(push.div(push.length()));
                
                ballVel = ballVel.add(proj.mul(-1.5));

                if (isNaN(ball.centre.x)) {
                    throw "err";
                }
            }
        }
        // there is a wall here
        if (j < boardSize && walls[idx].l) {
            let wallX = -0.5 + i/boardSize;
            let wallBottom = 0.5 - (j+1)/boardSize;
            
            let wall = new AABB(new Vec2(wallX-0.05/boardSize, wallBottom), new Vec2(wallX+0.05/boardSize, wallBottom+1/boardSize));

            if (wall.collideSphere(ball)) {
                // Citation: https://www.gamedev.net/forums/topic/544686-sphere-aabb-collision-repsonse/544686/

                // Vector pbox = aabb.closestPoint(sphere.position);
                // Vector delta = (sphere.position - pbox);
                // float distance =  delta.length();
                // if(distance < 0.000001f || distance > sphere.radius) return false;Vector normal = delta / distance; vector push = normal * (sphere.radius - distance);sphere.position += push;sphere.velocity -= normal * sphere.velocity.dotProduct(delta);

                let pbox = wall.closestPoint(ball.centre);

                let delta = pbox.sub(ball.centre);
                delta = delta.mul(ball.radius / (delta.length()+0.0001));

                let psphere = ball.centre.add(delta);
                
                let push = pbox.sub(psphere);

                ball.centre = ball.centre.add(push);

                let proj = ballVel.project(push.div(push.length()));
                
                ballVel = ballVel.add(proj.mul(-1.5));

                if (isNaN(ball.centre.x)) {
                    throw "err";
                }
            }
        }
    }
}
