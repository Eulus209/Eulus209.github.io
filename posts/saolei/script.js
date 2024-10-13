const board = document.getElementById('board');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const message = document.getElementById('message');
const resetBtn = document.getElementById('resetBtn');
const boardSize = 10;
const mineCount = 10;
let mineLocations = [];
let revealedCount = 0;
let score = 0;
let time = 0;
let timerInterval;
let gameEnded = false;
function initGame() {
    mineLocations = [];
    revealedCount = 0;
    score = 0;
    time = 0;
    gameEnded = false;
    scoreDisplay.textContent = '000';
    timerDisplay.textContent = '000';
    message.classList.add('hidden');
    clearInterval(timerInterval);

    board.innerHTML = '';
    for (let i = 0; i < boardSize * boardSize; i++) {
        const cell = document.createElement('div');
        cell.setAttribute('data-index', i);
        cell.addEventListener('click', revealCell);
        board.appendChild(cell);
    }
    placeMines();
    calculateMineNeighbors();
    timerInterval = setInterval(updateTimer, 1000);
}
function placeMines() {
    while (mineLocations.length < mineCount) {
        const mineLocation = Math.floor(Math.random() * boardSize * boardSize);
        if (!mineLocations.includes(mineLocation)) {
            mineLocations.push(mineLocation);
        }
    }
}

function calculateMineNeighbors() {
    for (let i = 0; i < boardSize * boardSize; i++) {
        const cell = document.querySelector(`[data-index="${i}"]`);
        if (mineLocations.includes(i)) {
            cell.setAttribute('data-mine', true);
        } else {
            const adjacentMines = countAdjacentMines(i);
            cell.setAttribute('data-mines', adjacentMines);
        }
    }
}

function countAdjacentMines(index) {
    const neighbors = getNeighbors(index);
    return neighbors.filter(neighbor => mineLocations.includes(neighbor)).length;
}

function getNeighbors(index) {
    const row = Math.floor(index / boardSize);
    const col = index % boardSize;
    const neighbors = [];

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                neighbors.push(newRow * boardSize + newCol);
            }
        }
    }

    return neighbors;
}

function revealCell(event) {
    if (gameEnded) return;

    const cell = event.target;
    const index = parseInt(cell.getAttribute('data-index'));

    if (cell.classList.contains('revealed')) return;

    if (mineLocations.includes(index)) {
        cell.classList.add('mine');
        endGame('lose');
    } else {
        revealSafeCell(cell, index);
    }
}

function revealSafeCell(cell, index) {
    if (!cell.classList.contains('revealed')) {
        cell.classList.add('revealed');
        revealedCount++;
        score += 10;
        scoreDisplay.textContent = String(score).padStart(3, '0');

        const mines = cell.getAttribute('data-mines');
        if (mines > 0) {
            cell.textContent = mines;
        } else {
            const neighbors = getNeighbors(index);
            neighbors.forEach(neighborIndex => {
                const neighborCell = document.querySelector(`[data-index="${neighborIndex}"]`);
                revealSafeCell(neighborCell, neighborIndex);
            });
        }

        if (revealedCount === boardSize * boardSize - mineCount) {
            endGame('win');
        }
    }
}

function endGame(result) {
    clearInterval(timerInterval);
    gameEnded = true;
    
    if (result === 'win') {
        message.textContent = 'Victory!';
    } else {
        message.textContent = 'Game Over!';
        revealAllMines(); 
    }

    message.classList.remove('hidden');
}

function revealAllMines() {
    mineLocations.forEach(mineIndex => {
        const mineCell = document.querySelector(`[data-index="${mineIndex}"]`);
        mineCell.classList.add('mine');
    });
}


resetBtn.addEventListener('click', initGame);

document.addEventListener('DOMContentLoaded', initGame);
