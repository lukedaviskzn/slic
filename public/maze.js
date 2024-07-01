var playerCount = 1;
const floorWidth = 3;
const floorHeight = 1;
const floorCount = 5;
const centerPos = Math.floor(floorWidth/2);

function generatePlayerColumn() {
    var column = [];
    //Center gap

    var prev = centerPos;
    for(let curFloor = 0; curFloor <= floorCount; curFloor++) {

        //First column has left wall
        //First row of each floor has top wall
        for(let subFloor = 0; subFloor < floorHeight; subFloor++) {
 
            //add left column
            for(let x = 0; x < floorWidth; x++) {
                var cell = {
                    left: false,
                    top: false
                };
                if(x==0) {
                    cell.left = true;
                }
                if(subFloor==0 && prev!=x) {
                    cell.top = true;
                }    
                column.push(cell);

            }

        }
        // column.push(prev);

        nprev = prev;
        while(nprev==prev) nprev = Math.floor(Math.random() * floorWidth);
        prev = nprev;

    }
    return column;
}

function generateMaze() {
    var maze = [];
    var tempArr = [];
    for(let i = 0; i < playerCount; i++) {
        var playerCol = generatePlayerColumn();
        tempArr[i] = playerCol;
    } 

    for(let j = 0; j <= floorCount * floorHeight; j ++) {
        for(let i = 0; i < playerCount * floorWidth; i++) {
            var cp = Math.floor(i/floorWidth);
            var ci = j*floorWidth + i%floorWidth;

            maze.push(tempArr[cp].at(ci));
        }
        maze.push({
            left: true,
            top: false
        });
    }

    for(let i = 0; i <= playerCount * floorWidth; i++) {
        var cp = Math.floor(i/floorWidth);
        maze.push({
            left: false,
            top: ((i-cp*floorWidth)==centerPos) ? false : true
        });
    }

    console.log(maze);
    return maze;
}

//Get amount of rows
function getRowCount() {
    return ((floorCount*floorHeight+1) * (floorWidth+1))/4+1;
}

//Gets the number of array elements that form one row
function getMazeArrayWidth() {
    return playerCount * floorWidth + 1;
}

//Generate maze
generateMaze();

console.log(getRowCount());

//Maze format:
//Array of objects with left+top property for wall presence