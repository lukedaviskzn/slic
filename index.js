const express = require('express')
const generateMaze = require('./maze');

const app = express();
const port = 3030;

app.use(express.static('public'));

const defaultBoardSize = 16;

/**
 * @type {Object.<string, {
 *      id: string,
 *      status: 'waiting' | 'playing' | 'finished',
 *      gravityAngle: number,
 *      winner: string,
 *      
 *      boardSize: number,
 *      walls: [{t: boolean, l: boolean}],
 *      players: Object.<string, {
 *          playerId: string,
 *          username: string,
 *          score: number,
 *          gravityAngle: number,
 *          x: number, y: number,
 *          vx: number, vy: number,
 *          lastPoll: number,
 *      }>,
 *      powerUps: [{x: number, y: number, skill: '0g', holder: string, timeActivated: number}]
 * }>}
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
        winner: "",
        boardSize: defaultBoardSize,
        walls: generateMaze(defaultBoardSize),
        players: {},
        powerUps: [],
    };

    for (let i = 0; i < lobby.boardSize / 4; i++) {
        let j = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
        let idx = lobby.boardSize + j*(lobby.boardSize+1);
        lobby.walls[idx].t = false;
    }

    for (let i = 0; i < lobby.boardSize * lobby.boardSize / 32; i++) {
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
            holder: "",
            timeActivated: -1,
        });
    }

    lobbies[id] = lobby;

    res.json(lobby);
});

app.get("/lobby/join", (req, res) => {
    let lobbyId = req.query.lobby;
    let username_ = req.query.username; // Add to the client

    let lobby = lobbies[lobbyId];
    if (lobby === undefined) {
        res.json({'error': "Lobby doesn't exist."});
    } else if (Object.keys(lobby.players).length >= 4) {
        res.json({'error': 'Lobby full.'});
    } else {
        let playerId = Math.round(Math.random()*1.0e9)+"";
        lobby.players[playerId] = {
            playerId: playerId,
            username: username_,
            score: 0,
            gravityAngle: 0,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,

            lastPoll: new Date().getTime() + 10000,
        };
        res.json({
            player: playerId,
            lobby: lobby,
        });
    }
});

app.get("/lobby/start", (req, res) => {
    let lobbyId = req.query.lobby;
    let lobby = lobbies[lobbyId];
    if (lobby === undefined) {
        res.json({'error': "Lobby doesn't exist."});
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
        res.json({'error': "Lobby doesn't exist."});
    } else {
        lobby.winner = "";
        lobby.status = 'waiting';
        lobby.walls = generateMaze(lobby.boardSize);

        for (let i = 0; i < lobby.boardSize / 4; i++) {
            let j = Math.max(Math.min(Math.floor(Math.random() * lobby.boardSize), lobby.boardSize), 0);
            let idx = lobby.boardSize + j*(lobby.boardSize+1);
            lobby.walls[idx].t = false;
        }

        lobby.powerUps = [];

        for (let i = 0; i < lobby.boardSize * lobby.boardSize / 32; i++) {
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
                holder: "",
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
    let playerId = req.query.player;
    let px = parseInt(req.query.px);
    let py = parseInt(req.query.py);
    if (lobby === undefined) {
        res.json({'error': "Lobby doesn't exist."});
    } else {
        const p = lobby.powerUps.find(powerUp => powerUp.x == px && powerUp.y == py);

        if (p && !p.holder) {
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
    const lobbyId = req.query.lobby;
    const playerId = /** @type {string | undefined} */(req.query.player);
    const gravity = playerId ? parseFloat(req.query.gravity) : 0.0;
    const bx = playerId ? parseFloat(req.query.bx) : 0.0;
    const by = playerId ? parseFloat(req.query.by) : 0.0;
    const vx = playerId ? parseFloat(req.query.vx) : 0.0;
    const vy = playerId ? parseFloat(req.query.vy) : 0.0;
    const win = req.query.win !== undefined;
    
    let lobby = lobbies[lobbyId];
    
    if (lobby === undefined) {
        res.json({'error': "Lobby doesn't exist."});
        return;
    }

    if (playerId && !(playerId in lobby.players)) {
        res.json({'error': "Player not in game."});
        return;
    }

    const time = new Date().getTime();

    if (playerId) {
        lobby.players[playerId].gravityAngle = gravity;
        lobby.players[playerId].x = bx;
        lobby.players[playerId].y = by;
        lobby.players[playerId].vx = vx;
        lobby.players[playerId].vy = vy;
        lobby.players[playerId].lastPoll = time;

        if (lobby.status === 'playing' && win && !lobby.winner) {
            lobby.winner = playerId;
            lobby.status = 'finished';
            lobby.players[winner].score += 1;
            console.log("Increased " + lobby.players[winner].username + "score to" + lobby.players[winner].score) 
        }
    
        let averageGravity = 0.0;
        const keys = Object.keys(lobby.players);
        keys.forEach(p => {
            averageGravity += lobby.players[p].gravityAngle;
        });
        averageGravity /= keys.length || 1;
    
        lobby.gravityAngle = lobby.gravityAngle * 4 / 5.0 + averageGravity / 5.0;
    }

    lobby.powerUps = lobby.powerUps.filter(powerUp => powerUp.timeActivated < 0 || powerUp.timeActivated + 15000 >= time);

    let playerRemove = Object.values(lobby.players).filter(player => player.lastPoll >= 0 && player.lastPoll + 10000 < time);
    playerRemove.forEach(p => {
        delete lobby.players[p.playerId];
    });

    res.json({
        timestamp: new Date().getTime(),
        lobby,
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`);
});
