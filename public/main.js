// @ts-check

main();
const express = require('express')
const app = express()
const port = 3000

app.get('/send_gyroscope_data', (req, res) => {
    console.log(req.params);
})


function main() {
    const canvas = /**@type {HTMLCanvasElement | null}*/(document.getElementById("canvas"));
    const ctx = canvas?.getContext("2d");

    if (!ctx) {
        alert("Failed to initialise canvas. Your browser or device may not support it.");
        return;
    }

    

    ctx.fillStyle = "red";
    ctx.rect(0, 0, 800, 600);
    ctx.fill();
}
