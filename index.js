const express = require('express')

const app = express();
const port = 3030;

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

function calculateAverageEulerAngle(lastKnownEulerAngles){
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

currentlyActivePlayers = []
lastKnownEulerAngles = []
app.get('/send_gyro', (req, res) => {
    if(!currentlyActivePlayers.includes(req.socket.remoteAddress)){
        console.log("Added", req.ip)
        currentlyActivePlayers.push(req.socket.remoteAddress)
    }
    var i = currentlyActivePlayers.indexOf(req.socket.remoteAddress);
    lastKnownEulerAngles[i] = req.query.eulerAngle;
    console.log(lastKnownEulerAngles);
    var plane_angle = calculateAverageEulerAngle(lastKnownEulerAngles);
    console.log(plane_angle);
    res.send(plane_angle + "");
})

