var outputText;

window.addEventListener('load', function () {
    outputText = this.document.getElementById("output");
    outputText.innerText = "Hello world!";
})

if(window.DeviceOrientationEvent){
    window.addEventListener("deviceorientation", handleOrientation, false)
}else{
    console.log("DeviceMotionEvent is not supported");
}

function handleOrientation(event){
    outputText.innerText = "Orientation: "
        + Math.round(event.alpha,2) + ", " //z axis
        + Math.round(event.beta,2)  + ", " //x axis
        + Math.round(event.gamma,2) //y axis
    ;
}  