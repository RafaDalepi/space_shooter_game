// Selecting the canvas and context from the DOM
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
// Selecting other DOM elements
const StartGameBtn = document.querySelector("#start-game-button");
const Popup = document.querySelector("#popup");
const scoreEl = document.querySelector("#score");
const popupScore = document.querySelector("#popup-score");

canvas.width = innerWidth;
canvas.height = innerHeight;

// Entity class to represent game entities like the player, enemies, and projectiles
class Entity {
    constructor(x, y, radius, color, velocity = { x: 0, y: 0 }) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }
    draw() {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.fill();
    }
    update() {
        this.draw();
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

let player = new Entity(canvas.width / 2, canvas.height / 2, 10, "white");
let projectiles = [];
let enemies = [];
let score = 0;
let spawnEnemies;
let keys = { w: false, a: false, s: false, d: false };

addEventListener("keydown", ({ key }) => {
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

addEventListener("keyup", ({ key }) => {
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

function spawnEnemy() {
    const radius = 15 * Math.random() + 10;
    let x, y;

    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
    const angle = Math.atan2(player.y - y, player.x - x);
    const velocity = { x: Math.cos(angle), y: Math.sin(angle) };
    enemies.push(new Entity(x, y, radius, color, velocity));
}

function shootProjectile(event) {
    const angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
    projectiles.push(new Entity(player.x, player.y, 5, "white", velocity));
}

function animate() {
    const speed = 2;
    animationId = requestAnimationFrame(animate);

    context.fillStyle = "rgba(0,0,0, 0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    player.velocity.x = keys.d ? speed : keys.a ? -speed : 0;
    player.velocity.y = keys.s ? speed : keys.w ? -speed : 0;

    player.update();

    projectiles.forEach((projectile, pidx) => {
        projectile.update();
        if (
            projectile.x + projectile.radius < 0 ||
            projectile.y + projectile.radius < 0 ||
            projectile.x - projectile.radius > canvas.width ||
            projectile.y - projectile.radius > canvas.height
        ) {
            projectiles.splice(pidx, 1);
        }

        enemies.forEach((enemy, eidx) => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
            if (dist - enemy.radius - projectile.radius < 1) {
                score += enemy.radius - 10 > 10 ? 100 : 250;
                scoreEl.innerHTML = score;
                if (enemy.radius - 10 > 10) {
                    enemy.radius -= 10;
                } else {
                    enemies.splice(eidx, 1);
                }
                projectiles.splice(pidx, 1);
            }
        });
    });

    enemies.forEach((enemy) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.velocity = { x: Math.cos(angle), y: Math.sin(angle) };
        enemy.update();

        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist - enemy.radius - player.radius < 1) {
            cancelAnimationFrame(animationId);
            clearInterval(spawnEnemies);
            popupScore.innerHTML = score;
            Popup.style.display = "flex";
        }
    });
}

StartGameBtn.addEventListener("click", () => {
    Popup.style.display = "none";
    projectiles = [];
    enemies = [];
    score = 0;
    scoreEl.innerHTML = 0;
    player = new Entity(canvas.width / 2, canvas.height / 2, 10, "white");

    animate();
    spawnEnemies = setInterval(spawnEnemy, 1000);
    addEventListener("click", shootProjectile);
});
