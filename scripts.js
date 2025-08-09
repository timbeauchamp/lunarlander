// Lunar Lander Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = true;
let gameWon = false;
let gameLost = false;

// Lander object
const lander = {
    x: canvas.width / 2,
    y: 50,
    velocityX: 0,
    velocityY: 0,
    angle: 0,
    fuel: 1000,
    thrust: 0.2,
    rotationSpeed: 0.1,
    size: 15
};

// Terrain
const terrain = [];
let landingPadX = canvas.width * 0.4;
let landingPadWidth = 100;

// Controls
const keys = {
    up: false,
    left: false,
    right: false
};

// Initialize terrain
function generateTerrain() {
    terrain.length = 0;
    for (let x = 0; x <= canvas.width; x += 10) {
        let height = canvas.height - 100 + Math.sin(x * 0.01) * 50;
        
        // Create flat landing pad
        if (x >= landingPadX && x <= landingPadX + landingPadWidth) {
            height = canvas.height - 100;
        }
        
        terrain.push({ x: x, y: height });
    }
}

// Input handling
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowUp':
            keys.up = true;
            e.preventDefault();
            break;
        case 'ArrowLeft':
            keys.left = true;
            e.preventDefault();
            break;
        case 'ArrowRight':
            keys.right = true;
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowUp':
            keys.up = false;
            e.preventDefault();
            break;
        case 'ArrowLeft':
            keys.left = false;
            e.preventDefault();
            break;
        case 'ArrowRight':
            keys.right = false;
            e.preventDefault();
            break;
    }
});

// Update game physics
function update() {
    if (!gameRunning) return;

    // Rotation
    if (keys.left) {
        lander.angle -= lander.rotationSpeed;
    }
    if (keys.right) {
        lander.angle += lander.rotationSpeed;
    }

    // Thrust
    if (keys.up && lander.fuel > 0) {
        const thrustX = Math.sin(lander.angle) * lander.thrust;
        const thrustY = -Math.cos(lander.angle) * lander.thrust;
        
        lander.velocityX += thrustX;
        lander.velocityY += thrustY;
        lander.fuel -= 2;
    }

    // Gravity
    lander.velocityY += 0.02;

    // Update position
    lander.x += lander.velocityX;
    lander.y += lander.velocityY;

    // Check boundaries
    if (lander.x < 0) lander.x = 0;
    if (lander.x > canvas.width) lander.x = canvas.width;

    // Check collision with terrain
    checkCollision();
}

// Check collision with terrain
function checkCollision() {
    const landerBottom = lander.y + lander.size;
    
    for (let i = 0; i < terrain.length - 1; i++) {
        const point1 = terrain[i];
        const point2 = terrain[i + 1];
        
        if (lander.x >= point1.x && lander.x <= point2.x) {
            const terrainHeight = point1.y + (point2.y - point1.y) * ((lander.x - point1.x) / (point2.x - point1.x));
            
            if (landerBottom >= terrainHeight) {
                // Collision detected
                gameRunning = false;
                
                // Check if landing was successful
                const speed = Math.sqrt(lander.velocityX * lander.velocityX + lander.velocityY * lander.velocityY);
                const onLandingPad = lander.x >= landingPadX && lander.x <= landingPadX + landingPadWidth;
                const uprightAngle = Math.abs(lander.angle) < 0.3;
                
                if (onLandingPad && speed < 1 && uprightAngle) {
                    gameWon = true;
                } else {
                    gameLost = true;
                }
                break;
            }
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
        const x = (i * 123) % canvas.width;
        const y = (i * 456) % (canvas.height * 0.7);
        ctx.fillRect(x, y, 1, 1);
    }

    // Draw terrain
    ctx.beginPath();
    ctx.moveTo(terrain[0].x, terrain[0].y);
    for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#666';
    ctx.fill();

    // Draw landing pad
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(landingPadX, canvas.height - 105, landingPadWidth, 5);

    // Draw lander
    ctx.save();
    ctx.translate(lander.x, lander.y);
    ctx.rotate(lander.angle);
    
    // Lander body
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-lander.size/2, -lander.size/2, lander.size, lander.size);
    
    // Thrust flame
    if (keys.up && lander.fuel > 0) {
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(-3, lander.size/2, 6, 15);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-2, lander.size/2, 4, 10);
    }
    
    ctx.restore();

    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Fuel: ${Math.max(0, Math.floor(lander.fuel))}`, 10, 30);
    ctx.fillText(`Speed: ${Math.sqrt(lander.velocityX * lander.velocityX + lander.velocityY * lander.velocityY).toFixed(1)}`, 10, 50);
    ctx.fillText(`Altitude: ${Math.floor(canvas.height - lander.y)}`, 10, 70);

    // Game over messages
    if (gameWon) {
        ctx.fillStyle = '#00ff00';
        ctx.font = '32px Arial';
        ctx.fillText('SUCCESSFUL LANDING!', canvas.width/2 - 150, canvas.height/2);
        ctx.font = '16px Arial';
        ctx.fillText('Press F5 to restart', canvas.width/2 - 70, canvas.height/2 + 30);
    } else if (gameLost) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '32px Arial';
        ctx.fillText('CRASHED!', canvas.width/2 - 80, canvas.height/2);
        ctx.font = '16px Arial';
        ctx.fillText('Press F5 to restart', canvas.width/2 - 70, canvas.height/2 + 30);
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize and start game
generateTerrain();
gameLoop();
