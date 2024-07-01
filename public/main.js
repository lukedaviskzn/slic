// @ts-check

main();

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
