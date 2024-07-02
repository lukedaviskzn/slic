const express = require('express')

const app = express();
const port = 3030;

app.use(express.static('public'));

const defaultBoardSize = 10;

/**
 * @type {Object.<string, {id: string, status: 'waiting' | 'playing', gravityAngle: number. boardSize: number, walls: [{t: boolean, l: boolean}], players: [{gravityAngle: number, x: number, y: number, vx: number, vy: number}]}>}
 */
let lobbies = {};

app.get("/lobby/create", (req, res) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let id = "";
    for (let i = 0; i < 6; i++) {
        let idx = Math.max(Math.min(Math.floor(Math.random()*alphabet.length), alphabet.length), 0);
        id += alphabet[idx];
    }

    let lobby = {
        id,
        status: 'waiting',
        gravityAngle: 0,
        boardSize: defaultBoardSize,
        walls: [],
        players: [],
    };

    for (let i = 0; i < lobby.boardSize + 1; i++) {
        for (let j = 0; j < lobby.boardSize + 1; j++) {
            lobby.walls.push({
                t: j == 0 || Math.random() > 0.5,
                l: i == 0 || i == lobby.boardSize || Math.random() > 0.5,
            });
        }
    }

    lobbies[id] = lobby;

    res.json(lobby);
});

app.get("/lobby/join", (req, res) => {
    let lobbyId = req.query.lobby;
    let lobby = lobbies[lobbyId];
    if (lobby === undefined) {
        res.json({'error': "Lobby Doesn't Exist"});
    } else if (lobby.players.length >= 4) {
        res.json({'error': 'Lobby Full'});
    } else {
        lobby.players.push({
            gravityAngle: 0,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
        });
        res.json({
            player: lobby.players.length-1,
            lobby: lobby,
        });
    }
});

app.get("/lobby/start", (req, res) => {
    let lobbyId = req.query.lobby;
    let lobby = lobbies[lobbyId];
    if (lobby === undefined) {
        res.json({'error': "Lobby Doesn't Exist"});
    } else {
        lobby.status = 'playing';
        res.json({
            lobby
        });
    }
});

app.get("/lobby/status", (req, res) => {
    let lobbyId = req.query.lobby;
    let lobby = lobbies[lobbyId];
    if (lobby === undefined) {
        res.json({'error': "Lobby Doesn't Exist"});
    } else {
        res.json({
            lobby,
        });
    }
});

app.get("/lobby/poll", (req, res) => {
    let lobbyId = req.query.lobby;
    let playerId = (() => {
        let p = req.query.player;
        if (p !== undefined) {
            return parseInt(p);
        } else {
            return null;
        }
    })();
    let gravity = playerId !== null ? parseFloat(req.query.gravity) : 0.0;
    let bx = playerId !== null ? parseFloat(req.query.bx) : 0.0;
    let by = playerId !== null ? parseFloat(req.query.by) : 0.0;
    let vx = playerId !== null ? parseFloat(req.query.vx) : 0.0;
    let vy = playerId !== null ? parseFloat(req.query.vy) : 0.0;
    
    let lobby = lobbies[lobbyId];
    
    if (lobby === undefined) {
        res.json({'error': "Lobby Doesn't Exist"});
        return;
    }

    if (playerId !== null) {
        lobby.players[playerId].gravityAngle = gravity;
        lobby.players[playerId].x = bx;
        lobby.players[playerId].y = by;
        lobby.players[playerId].vx = vx;
        lobby.players[playerId].vy = vy;
    
        let averageGravity = circularMean(lobby.players.map(player => player.gravityAngle));
    
        lobby.gravityAngle = lobby.gravityAngle / 2.0 + averageGravity / 2.0;
    }

    res.json({
        timestamp: new Date().getTime(),
        lobby,
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`);
});

/**
 * @param {[number]} angles
 * @returns number
 */
function circularMean(angles){
    let x_total = 0;
    let y_total = 0;
    
    for (let index = 0; index < angles.length; index++) {
        const angle = angles[index];
        const x = Math.sin(angle);
        const y = Math.cos(angle);
        x_total += x;
        y_total += y;
    }

    let x_average = x_total / angles.length;
    let y_average = y_total / angles.length;
    return Math.atan2(x_average, y_average);
}
