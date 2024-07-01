var outputText;
var phonePanel;
var arrow;

window.addEventListener('load', function () {
    outputText = this.document.getElementById("output");
    phonePanel = this.document.getElementById("panel");
    xrotDiv = this.document.getElementById("xrot");
    yrotDiv = this.document.getElementById("yrot");
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
    // phonePanel.style.transform = 'rotateY('+event.beta+'deg)';
    // yrotDiv.style.transform = 'rotateX('+event.gamma+'deg)';
    // xrotDiv.style.transform = 'rotateY('+event.beta+'deg)';

    
}  