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
        const sqrDist = this.squareDistPoint(sphere.centre);
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

const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('lobby') ?? "";
const player = (() => {
    let p = urlParams.get('player');
    if (p) {
        return parseInt(p);
    } else {
        return null;
    }
})();

const wallHeight = 0.1;

const ballColours = [
    [255, 0, 0],
    [255, 255, 0],
    [255, 0, 255],
    [0, 0, 255],
];

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

/**
 * @param {WebGLRenderingContext} gl
 */
function compileProgram(gl) {
    program = gl.createProgram();
    if (!program) { throw "Failed to create program."; }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
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

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
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

let lastWidth;
let lastHeight;

// let ball = new Sphere(new Vec2(-0.05, 0.05), 0.025);
/** @type {Sphere | undefined} */
let ball;
let ballVel = new Vec2(0, 0);

let rot = 0;
let targetRot = 0;
let acc = new Vec2(0, 0);

let lastTime;
let dt = 0;

let currentFrame = 0;

/** @type {undefined | {id: string, status: 'waiting' | 'playing', gravityAngle: number, boardSize: number, walls: [{t: boolean, l: boolean}], players: [{gravityAngle: number, x: number, y: number, vx: number, vy: number}]}} */
let latestLobbyState;
let latestLobbyTime = 0;

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
        window.addEventListener('devicemotion', (event) => {
            const a = event.accelerationIncludingGravity
            const b = event.acceleration;

            if (!a?.x || !b?.x || !a?.y || !b?.y || !a?.z || !b?.z) return;

            const gx = a.x - b.x;
            const gy = a.y - b.y;

            targetRot = targetRot*9/10 + (Math.atan2(gy, gx) - Math.PI/2) / 10;

            acc.x = b.x;
            acc.y = b.y;
        }, false);
    } else {
        throw "Doesn't support device orientation.";
    }

    if (player !== null) {
        ball = new Sphere(new Vec2(-0.05, 0.4), 0.025);
    }

    let lobbyElem = document.getElementById("lobby");
    if (lobbyElem) {
        lobbyElem.innerText = lobbyId+"";
    }

    poll();

    requestAnimationFrame(draw);
}

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
    
    dt = Math.min((time - lastTime) / 1000.0, 1/30.0);
    lastTime = time;
    
    let lobbyElem = document.getElementById("lobby");

    if (!canvas || !gl || !vertexBuffer || !program) {
        return;
    }
    if (!latestLobbyState) {
        requestAnimationFrame(draw);
        return;
    }
    
    if (currentFrame % 10 == 0) {
        poll();
    }

    currentFrame += 1;
    
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

    rot = rot*4/5 + latestLobbyState.gravityAngle/5;

    const boardZRot = rot;
    const boardRot = rotZ(boardZRot / (player !== null ? 10.0 : 1.0));

    const board = matMul(translate(0, 0, -1.5), boardRot);

    drawObject(gl, 78/255, 103/255, 102/255, 0, board);

    const cap = matMul(translate(0.0, 0.5, 0.0), matMul(rotX(Math.PI/2), scale(1.0, 0.005, 1.0)));

    let size = latestLobbyState.boardSize;

    for (let i = 0; i < size+1; i++) {
        for (let j = 0; j < size+1; j++) {
            if (i < size && latestLobbyState.walls[j+(size+1)*i].t) {
                const wall = matMul(translate(-0.5 + 0.5/size + i/size, 0.5 - j/size, wallHeight/2), matMul(rotX(Math.PI/2), scale(1/size, wallHeight, 1.0)));
                
                // wall
                drawObject(gl, 90/255, 177/255, 187/255, 2, matMul(board, wall));

                // cap
                drawObject(gl, 120/255, 241/255, 255/255, 0, matMul(board, matMul(wall, cap)));
            }

            if (j < size && latestLobbyState.walls[j+(size+1)*i].l) {
                const wall = matMul(translate(-0.5 + i/size, 0.5 - 0.5/size - j/size, wallHeight/2), matMul(rotZ(Math.PI/2), matMul(rotX(Math.PI/2), scale(1/size, wallHeight, 1.0))));
                
                // wall
                drawObject(gl, 90/255, 177/255, 187/255, 2, matMul(board, wall));

                // cap
                drawObject(gl, 120/255, 241/255, 255/255, 0, matMul(board, matMul(wall, cap)));
            }
        }
    }

    if (ball && latestLobbyState.status == 'playing') {
        ballVel.x -= 1.0*dt*-Math.sin(rot);
        ballVel.y -= 1.0*dt*Math.cos(rot);
    
        ballVel.x += acc.x * dt;
        ballVel.y += acc.y * dt;
        
        const numSteps = Math.ceil(ballVel.length() / 0.05);
        
        if (lobbyElem) {
            lobbyElem.innerText = Math.round(1/dt)+" "+numSteps;
        }
    
        for (let i = 0; i < numSteps; i++) {
            ball.centre.x += ballVel.x*dt / numSteps;
            ball.centre.y += ballVel.y*dt / numSteps;
        
            runCollisions(dt / numSteps);
        }
    }

    for (let i = 0; i < latestLobbyState.players.length; i++) {
        const p = latestLobbyState.players[i];

        let br = 0.025;
        let bx = (player === i && ball) ? ball.centre.x : p.x;
        let by = (player === i && ball) ? ball.centre.y : p.y;

        const ballModel = matMul(translate(0,0,-1.5), matMul(boardRot, matMul(translate(bx, by, 0.05), scale(br*2))));

        // ball
        const colour = ballColours[i];
        drawObject(gl, colour[0]/255, colour[1]/255, colour[2]/255, 1, ballModel);

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.8;
        p.vy *= 0.8;
    }

    requestAnimationFrame(draw);
}

const extendBox = 0.025;

/**
 * @param {number} dt
 * @param {number | undefined} until
 * @returns 
 */
function runCollisions(dt, until=undefined) {
    if (!ball || !latestLobbyState) return;

    let size = latestLobbyState.boardSize;

    if (until === undefined) {
        until = (size+1)*(size+1);
    }

    let bx = Math.round((ball.centre.x + 0.5) * size);
    let by = Math.round(-(ball.centre.y - 0.5) * size);

    console.log(bx, by);

    for (let i = Math.max(bx - 2, 0); i < Math.min(bx + 2, size); i++) {
        for (let j = Math.max(by - 2, 0); j < Math.min(by + 2, size); j++) {
            let idx = j + i*(size+1);
            // there is a wall here
            if (i < size && latestLobbyState.walls[idx].t) {
                const wallLeft = -0.5 + (i - extendBox)/size;
                const wallY = 0.5 - j/size;
    
                const wall = new AABB(new Vec2(wallLeft, wallY-extendBox/size), new Vec2(wallLeft+(1+extendBox*2)/size, wallY+extendBox/size));
    
                if (wall.collideSphere(ball)) {
                    // Citation: https://www.gamedev.net/forums/topic/544686-sphere-aabb-collision-repsonse/544686/
    
                    const pbox = wall.closestPoint(ball.centre);
    
                    let delta = pbox.sub(ball.centre);
                    delta = delta.mul(ball.radius / (delta.length()+0.0001));
    
                    let psphere = ball.centre.add(delta);
                    
                    const push = pbox.sub(psphere);
    
                    ball.centre = ball.centre.add(push.mul(0.5));
    
                    ballVel = ballVel.add(push.mul(0.02/dt));

                    console.log("Collided")
                }
            }
            // there is a wall here
            if (j < size && latestLobbyState.walls[idx].l) {
                const wallX = -0.5 + i/size;
                const wallBottom = 0.5 - (j+1)/size;
                
                const wall = new AABB(new Vec2(wallX-0.05/size, wallBottom), new Vec2(wallX+0.05/size, wallBottom+1/size));
    
                if (wall.collideSphere(ball)) {
                    // Citation: https://www.gamedev.net/forums/topic/544686-sphere-aabb-collision-repsonse/544686/
    
                    const pbox = wall.closestPoint(ball.centre);
    
                    let delta = pbox.sub(ball.centre);
                    delta = delta.mul(ball.radius / (delta.length()+0.0001));
    
                    const psphere = ball.centre.add(delta);
                    
                    const push = pbox.sub(psphere);
    
                    ball.centre = ball.centre.add(push.mul(0.5));
    
                    ballVel = ballVel.add(push.mul(0.02/dt));
                }
            }
        }
    }
}

function poll() {
    let params = { lobby: lobbyId, bx: ball?.centre.x+"", by: ball?.centre.y+"", vx: ballVel.x+"", vy: ballVel.y+"", gravity: targetRot+"" };
    if (player !== null) {
        params.player = player;
    }

    fetch("/lobby/poll?" + new URLSearchParams(params)).then(data => {
        data.json().then(json => {
            if (json.error) {
                alert(json.error);
                return;
            }
            if (latestLobbyTime < json.timestamp) {
                latestLobbyState = json.lobby;
            }
        }).catch(err => alert(err));
    }).catch(err => alert(err));
}

try {
    main();
} catch (error) {
    alert(error);
}
