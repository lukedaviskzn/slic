const express = require('express')
const generateMaze = require('./maze');

const app = express();
const port = 3030;

app.use(express.static('public'));

const defaultBoardSize = 16;

/**
 * @type {Object.<string, {id: string, status: 'waiting' | 'playing' | 'finished', gravityAngle: number, winner: number, boardSize: number, walls: [{t: boolean, l: boolean}], players: [{gravityAngle: number, x: number, y: number, vx: number, vy: number}], powerUps: [{x: number, y: number, skill: '0g', holder: number, timeActivated: number}]}>}
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
        winner: -1,
        boardSize: defaultBoardSize,
        walls: generateMaze(defaultBoardSize),
        players: [],
        powerUps: [],
    };

    for (let i = 0; i < lobby.boardSize / 4; i++) {
        let j = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
        let idx = lobby.boardSize + j*(lobby.boardSize+1);
        lobby.walls[idx].t = false;
    }

    for (let i = 0; i < lobby.boardSize * lobby.boardSize / 64; i++) {
        let x = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
        let y = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);

        if (lobby.powerUps.find(value => value.x == x && value.y == y)) {
            i -= 1;
            break;
        }

        lobby.powerUps.push({
            x,
            y,
            skill: '0g',
            holder: -1,
            timeActivated: -1,
        });
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

app.get("/lobby/reset", (req, res) => {
    let lobbyId = req.query.lobby;
    let lobby = lobbies[lobbyId];
    if (lobby === undefined) {
        res.json({'error': "Lobby Doesn't Exist"});
    } else {
        lobby.winner = -1;
        lobby.status = 'waiting';
        lobby.walls = generateMaze(lobby.boardSize);

        for (let i = 0; i < lobby.boardSize / 4; i++) {
            let j = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
            let idx = lobby.boardSize + j*(lobby.boardSize+1);
            lobby.walls[idx].t = false;
        }

        for (let i = 0; i < lobby.boardSize * lobby.boardSize / 64; i++) {
            let x = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
            let y = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
    
            if (lobby.powerUps.find(value => value.x == x && value.y == y)) {
                i -= 1;
                break;
            }
    
            lobby.powerUps.push({
                x,
                y,
                skill: -1,
                holder: -1,
                timeActivated: -1,
            });
        }
        
        res.json({
            lobby
        });
    }
});

app.get("/lobby/powerup", (req, res) => {
    let lobbyId = req.query.lobby;
    let lobby = lobbies[lobbyId];
    let playerId = parseInt(req.query.player);
    let px = parseInt(req.query.px);
    let py = parseInt(req.query.py);
    if (lobby === undefined) {
        res.json({'error': "Lobby Doesn't Exist"});
    } else {
        const p = lobby.powerUps.find(powerUp => powerUp.x == px && powerUp.y == py);

        if (p && p.holder < 0) {
            p.holder = playerId;
            p.timeActivated = new Date().getTime();
        }

        res.json({
            'message': 'success',
            // lobby,
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
    let win = req.query.win !== undefined;
    
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

        if (lobby.status === 'playing' && win && lobby.winner == -1) {
            lobby.winner = playerId;
            lobby.status = 'finished';
        }
    
        let averageGravity = 0.0;
        lobby.players.forEach(player => {
            averageGravity += player.gravityAngle;
        });
        averageGravity /= lobby.players.length || 1;
    
        lobby.gravityAngle = lobby.gravityAngle * 4 / 5.0 + averageGravity / 5.0;
    }

    lobby.powerUps = lobby.powerUps.filter(powerUp => powerUp.timeActivated < 0 || powerUp.timeActivated + 15000 >= new Date().getTime());

    res.json({
        timestamp: new Date().getTime(),
        lobby,
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`);
});
