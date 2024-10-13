// 初始化画布和上下文
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const boxSize = 20;  // 每个蛇节的大小
let snake = [{x: 9 * boxSize, y: 10 * boxSize}];  // 初始蛇的位置
let direction = null;  // 当前方向，初始为空
let food = {x: Math.floor(Math.random() * 20) * boxSize, y: Math.floor(Math.random() * 20) * boxSize};  // 随机食物位置
let snakeColor = document.getElementById("snakeColor").value;  // 选择的蛇颜色
let gameInterval = null;  // 游戏定时器

// 监听方向键控制
document.addEventListener("keydown", changeDirection);

// 改变蛇的方向
function changeDirection(event) {
    const key = event.keyCode;
    if (key === 37 && direction !== "RIGHT") {
        direction = "LEFT";
    } else if (key === 38 && direction !== "DOWN") {
        direction = "UP";
    } else if (key === 39 && direction !== "LEFT") {
        direction = "RIGHT";
    } else if (key === 40 && direction !== "UP") {
        direction = "DOWN";
    }
}

// 绘制游戏中的蛇和食物
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清空画布

    // 绘制蛇
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#FF0000" : snakeColor;  // 头部红色，身体自定义颜色
        ctx.fillRect(segment.x, segment.y, boxSize, boxSize);
    });

    // 绘制食物
    ctx.fillStyle = "#FF6600";
    ctx.fillRect(food.x, food.y, boxSize, boxSize);

    // 移动蛇
    let head = {x: snake[0].x, y: snake[0].y};
    if (direction === "LEFT") head.x -= boxSize;
    if (direction === "UP") head.y -= boxSize;
    if (direction === "RIGHT") head.x += boxSize;
    if (direction === "DOWN") head.y += boxSize;

    // 检查食物是否被吃
    if (head.x === food.x && head.y === food.y) {
        food = {x: Math.floor(Math.random() * 20) * boxSize, y: Math.floor(Math.random() * 20) * boxSize};
    } else {
        snake.pop();  // 移除尾部
    }

    // 添加新的头部
    snake.unshift(head);

    // 检查碰撞
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height || collision(head, snake)) {
        clearInterval(gameInterval);  // 停止游戏
        alert("Game Over");
    }
}

// 碰撞检测函数，检查蛇是否撞到自身
function collision(head, snake) {
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

// 启动游戏，重新初始化
function startGame() {
    snakeColor = document.getElementById("snakeColor").value;  // 读取当前选择的颜色
    direction = "RIGHT";  // 初始方向向右
    snake = [{x: 9 * boxSize, y: 10 * boxSize}];  // 初始化蛇
    food = {x: Math.floor(Math.random() * 20) * boxSize, y: Math.floor(Math.random() * 20) * boxSize};  // 初始化食物
    clearInterval(gameInterval);  // 清除之前的定时器
    gameInterval = setInterval(drawGame, 100);  // 每100毫秒刷新一次游戏
}

// 添加点击事件监听器，点击按钮时启动游戏
document.getElementById("startGame").addEventListener("click", startGame);
