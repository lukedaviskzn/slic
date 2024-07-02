const express = require('express')

const app = express();
const port = 3030;

app.use(express.static('public'));

let lobbies = [];

const initialLobbyState = {
    id: 'lobby1',
    status: 'waiting',
    players: [],
    playerInputs: [0,0,0,0],
    gameData: {
        planeRotation: 0,
        playerPositions: [
            {x: 0, y: 0 },
            {x: 0, y: 0 },
            {x: 0, y: 0 },
            {x: 0, y: 0 }
        ]
    }
};

lobbies.push(initialLobbyState)



app.get('/joinLobby', (req, res) => {
    // return the lobby waiting for and the clients playerid (0,1,2,3)
    // for now just join lobby 1
    // Needs player name
    lobby = lobbies[0]
    playerId = lobby.players.length + 1
    lobby.players[playerId] = req.params.name
    if(playerId === 3){
        lobby.status = "playing"
    }
    let response  = {lobby: "lobby1", playerid: playerId}
    res.json(response)
})

app.get('/startLobby', (req, res) => {
    lobby = lobbies[0]
    lobby.status = "playing"
    let response  = {lobby: "lobby1", playerid: playerId}
    res.json(response)
})

app.get('/checkLobbyStatus', (req, res) => {
    // Given lobbyid returns whether or not the game has begun, on the client side, if this becomes true need to instantiate the game
    const lobby = lobbies.find(lobby => lobby.id === req.query.lobbyId);
        if (lobby) {
            let response  = {status : lobby.status}
            res.json(response)
    }

    console.log(lobbies);
    // When the lobby status changes we need to add the lobbyis and playerid as arguments
})

app.get('/sendPlayerInfo', (req, res) => {
    // Add rotation to the running average and recompute circular mean
    // <lobbyid, playerid>

    var rotation = parseFloat(req.params.rotation)
    var ballposition = req.params.position.split(",")
    var averageRotation;
    const lobby = lobbies.find(lobby => lobby.id === lobbyId);
        if (lobby) {
            lobby.gameData.playerInputs[req.params.playerid] = rotation;
            lobby.gameData.gameData.playerPositions[req.params.playerid].x = parseFloat(ballposition[0])
            lobby.gameData.gameData.playerPositions[req.params.playerid].y = parseFloat(ballposition[1])
            averageRotation = circularMean(gameData.playerInputs);
        }
    // Create JSON object representing latest game state
    // Calculate circular mean of rotations
    
    let response = {
        playerpositions : lobby.gameData.playerPositions,
        rotation : lobby.gameData.planeRotation
    }

    res.json(response)

})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

function circularMean(lastKnownEulerAngles){
    var x_total = 0;
    var y_total = 0;
    for (let index = 0; index < lastKnownEulerAngles.length; index++) {
        const angle = lastKnownEulerAngles[index];
        console.log(angle)
        var radianAngle = parseInt(angle)*(Math.PI/180)
        console.log(angle)
        console.log(radianAngle)
        var x = Math.sin(radianAngle);
        var y = Math.cos(radianAngle);
        x_total += x;
        y_total += y;
    }

    var x_average = x_total / lastKnownEulerAngles.length;
    var y_average = y_total / lastKnownEulerAngles.length;
    return Math.atan2(x_average, y_average);
}