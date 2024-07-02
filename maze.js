// @ts-check

class Maze {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: height }, () => Array.from({ length: width }, () => [true, true, true, true]));
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    getNeighbors(x, y) {
        const neighbors = [];
        if (this.isInBounds(x, y - 1)) neighbors.push([x, y - 1, 0, 2]); // top
        if (this.isInBounds(x + 1, y)) neighbors.push([x + 1, y, 1, 3]); // right
        if (this.isInBounds(x, y + 1)) neighbors.push([x, y + 1, 2, 0]); // down
        if (this.isInBounds(x - 1, y)) neighbors.push([x - 1, y, 3, 1]); // left
        return neighbors;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    carvePassagesFrom(cx, cy) {
        const directions = this.getNeighbors(cx, cy);
        this.shuffle(directions);

        for (const [nx, ny, fromDir, toDir] of directions) {
            if (this.grid[ny][nx][0] && this.grid[ny][nx][1] && this.grid[ny][nx][2] && this.grid[ny][nx][3]) { // if all walls are intact
                this.grid[cy][cx][fromDir] = false; // remove the wall between the current cell and the neighbor
                this.grid[ny][nx][toDir] = false; // remove the wall between the neighbor and the current cell
                this.carvePassagesFrom(nx, ny); // recurse into the neighbor cell
            }
        }
    }

    generate() {
        this.carvePassagesFrom(0, 0); // start carving from the top-left corner
        return this.grid;
    }
}

module.exports = function generateMaze(size) {
    const maze = new Maze(size, size);
    let mazeData = maze.generate();

    var newData = [];

    for(let i = 0; i < size; i++) {
        for(let j = 0; j < size; j++) {
            newData.push({
                l: mazeData[j][i][3],
                t: mazeData[j][i][0]
            });
        }
        newData.push({
            l: false,
            t: true
        });
    }
    for(let i = 0; i < size; i++) {
        newData.push({
            l: true,
            t: false
        });
    }

    for(let i = 1; i < size; i++) {
        for(let j = 1; j < size; j++) {
            if(Math.random() < 0.1) {
                newData[i*(size+1)+j].l = false;
            }
            if(Math.random() < 0.1) {
                newData[i*(size+1)+j].t = false;
            }
        }
    }
    
    newData.push({
        l: false,
        t: false
    });

    return newData;
}
