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
                    l: false,
                    t: false
                };
                if(x==0) {
                    cell.l = true;
                }
                if(subFloor==0 && prev!=x) {
                    cell.t = true;
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
    /**
     * @type {{t: boolean, l: boolean}[]}
     */
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
            l: true,
            t: false
        });
    }

    for(let i = 0; i < playerCount * floorWidth; i++) {
        var cp = Math.floor(i/floorWidth);
        maze.push({
            l: false,
            t: ((i-cp*floorWidth)==centerPos) ? false : true
        });
    }

    maze.push({
        l: false,
        t: false
    });

    console.log(maze);
    return maze;
}

//Get amount of rows
function getRowCount() {
    return ((floorCount*floorHeight+1) * (floorWidth+1))/4 + 1;
}

//Gets the number of array elements that form one row
function getMazeArrayWidth() {
    return playerCount * floorWidth + 1;
}

//Generate maze
// generateMaze();

// console.log(getRowCount());

//Maze format:
//Array of objects with left+top property for wall presence