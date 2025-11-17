const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const startGameButton = document.querySelector("#start-game-button");
const popupElement = document.querySelector("#popup");
const scoreElement = document.querySelector("#score");
const popupScoreElement = document.querySelector("#popup-score");
const highScoresElement = document.querySelector("#high-scores");
const upgradeInfoElement = document.querySelector("#upgrade-info");

canvas.width = innerWidth;
canvas.height = innerHeight;

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

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 10, "white");
    }
    draw() {
        context.save();
        context.translate(this.x, this.y);
        const angle = Math.atan2(mousePosition.y - this.y, mousePosition.x - this.x);
        context.rotate(angle);

        context.beginPath();
        context.moveTo(-15, -10);
        context.lineTo(15, 0);
        context.lineTo(-15, 10);
        context.closePath();

        context.fillStyle = this.color;
        context.fill();
        context.restore();
    }
}

class Upgrade extends Entity {
    constructor(x, y, type) {
        super(x, y, 15, "gold");
        this.type = type;
    }
    draw() {
        context.beginPath();
        const sides = 6;
        const angle = (Math.PI * 2) / sides;
        context.moveTo(this.x + this.radius * Math.cos(0), this.y + this.radius * Math.sin(0));
        for (let i = 1; i <= sides; i++) {
            context.lineTo(this.x + this.radius * Math.cos(i * angle), this.y + this.radius * Math.sin(i * angle));
        }
        context.fillStyle = this.color;
        context.fill();
    }
}

let player = new Player(canvas.width / 2, canvas.height / 2);
let projectiles = [];
let enemies = [];
let upgrades = [];
let activeUpgrades = { autoShoot: false, tripleShot: false, doubleDamageAndPoints: false, piercingShot: false };
let activeUpgradeTimers = { autoShoot: 0, tripleShot: 0, doubleDamageAndPoints: 0, piercingShot: 0 };
let score = 0;
let spawnEnemiesInterval;
let spawnUpgradesInterval;
let spawnBossInterval;
let animationId;
let keys = { w: false, a: false, s: false, d: false };
let lastShotTime = 0;
const shotInterval = 80;
const upgradeDuration = 10000;
let isMouseDown = false;
let mousePosition = { x: canvas.width / 2, y: canvas.height / 2 };
let enemySpawnDelay = 500;
let powerUpSpawnDelay = 10000;

addEventListener("keydown", ({ key }) => {
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

addEventListener("keyup", ({ key }) => {
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

addEventListener("mousemove", (event) => {
    mousePosition = { x: event.clientX, y: event.clientY };
});

addEventListener("mousedown", (event) => {
    isMouseDown = true;
    if (activeUpgrades.autoShoot) {
        autoShoot(event);
    } else {
        shootProjectile(event);
    }
});

addEventListener("mouseup", () => {
    isMouseDown = false;
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

function spawnBossAndIncreaseDifficulty() {
    let radius = 50;
    let x, y;

    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    const color = 'red';
    const angle = Math.atan2(player.y - y, player.x - x);
    const velocity = { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 };

    enemies.push(new Entity(x, y, radius, color, velocity));

    // Increase difficulty by reducing spawn delays (multiply by 0.5 to make faster)
    enemySpawnDelay *= 0.5;
    powerUpSpawnDelay *= 0.5;
    // Note: radius modification removed as it had no effect on spawned enemy
}

function spawnUpgrade() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const types = ["autoShoot", "tripleShot", "doubleDamageAndPoints", "piercingShot"];
    const type = types[Math.floor(Math.random() * types.length)];
    upgrades.push(new Upgrade(x, y, type));
}

function shootProjectile(event) {
    const angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };

    const color = activeUpgrades.doubleDamageAndPoints ? "red" : "white";

    projectiles.push(new Entity(player.x, player.y, 5, color, velocity));

    if (activeUpgrades.tripleShot) {
        const offsetAngle = 0.1;
        const leftVelocity = {
            x: Math.cos(angle - offsetAngle) * 5,
            y: Math.sin(angle - offsetAngle) * 5
        };
        const rightVelocity = {
            x: Math.cos(angle + offsetAngle) * 5,
            y: Math.sin(angle + offsetAngle) * 5
        };
        projectiles.push(new Entity(player.x, player.y, 5, color, leftVelocity));
        projectiles.push(new Entity(player.x, player.y, 5, color, rightVelocity));
    }
}

function autoShoot(event) {
    const now = Date.now();
    if (now - lastShotTime > shotInterval && isMouseDown) {
        shootProjectile(event);
        lastShotTime = now;
    }
}

function activateUpgrade(type) {
    activeUpgrades[type] = true;
    activeUpgradeTimers[type] = upgradeDuration;

    // Create the popup
    const upgradePopup = document.createElement("div");
    upgradePopup.style.position = "fixed";
    upgradePopup.style.top = "10%";
    upgradePopup.style.left = "50%";
    upgradePopup.style.transform = "translateX(-50%)";
    upgradePopup.style.padding = "10px";
    upgradePopup.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    upgradePopup.style.color = "white";
    upgradePopup.style.border = "2px solid gold";
    upgradePopup.style.borderRadius = "5px";
    upgradePopup.style.zIndex = "1000";
    document.body.appendChild(upgradePopup);

    let remainingTime = upgradeDuration / 1000;
    upgradePopup.innerText = `${type} - ${remainingTime}s`;

    const countdownInterval = setInterval(() => {
        remainingTime -= 1;
        upgradePopup.innerText = `${type.replace(/([A-Z])/g, ' $1').trim()} - ${remainingTime}s`;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            document.body.removeChild(upgradePopup);
        }
    }, 1000);

    setTimeout(() => {
        activeUpgrades[type] = false;
        displayUpgradeInfo(type);
    }, upgradeDuration);
}

function displayUpgradeInfo(type) {
    const info = {
        autoShoot: "Auto Shoot: Automatically shoot projectiles",
        tripleShot: "Triple Shot: Shoot 3 projectiles at once",
        doubleDamageAndPoints: "Double Damage & Points: Deal double damage and earn double points",
        piercingShot: "Piercing Shot: Projectiles pierce through enemies"
    };
    upgradeInfoElement.innerHTML = info[type];
}

function saveScore(name, score) {
    let scores = JSON.parse(localStorage.getItem("scores")) || [];
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem("scores", JSON.stringify(scores));
}

function displayHighScores() {
    let scores = JSON.parse(localStorage.getItem("scores")) || [];
    highScoresElement.innerHTML = scores.slice(0, 10).map((entry, index) => `${index + 1}. ${entry.name} - ${entry.score}`).join("<br>");
}

function animate() {
    const speed = 2;
    animationId = requestAnimationFrame(animate);

    context.fillStyle = "rgba(0,0,0, 0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    player.velocity.x = keys.d ? speed : keys.a ? -speed : 0;
    player.velocity.y = keys.s ? speed : keys.w ? -speed : 0;
    player.x = (player.x + canvas.width) % canvas.width || canvas.width;
    player.y = (player.y + canvas.height) % canvas.height || canvas.height;

    player.update();

    if (isMouseDown && activeUpgrades.autoShoot) {
        autoShoot({ clientX: mousePosition.x, clientY: mousePosition.y });
    }

    // Use backward loop to safely remove items while iterating
    for (let projectileIndex = projectiles.length - 1; projectileIndex >= 0; projectileIndex--) {
        const projectile = projectiles[projectileIndex];
        projectile.update();
        
        if (
            projectile.x + projectile.radius < 0 ||
            projectile.y + projectile.radius < 0 ||
            projectile.x - projectile.radius > canvas.width ||
            projectile.y - projectile.radius > canvas.height
        ) {
            projectiles.splice(projectileIndex, 1);
            continue;
        }

        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = enemies[enemyIndex];
            const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
            if (distance - enemy.radius - projectile.radius < 1) {

                score += (enemy.radius - 10 > 10 ? 100 : 250) * (activeUpgrades.doubleDamageAndPoints ? 2 : 1);
                scoreElement.innerHTML = score;

                const damage = activeUpgrades.doubleDamageAndPoints ? 20 : 10;

                if (enemy.radius - damage > 10) {
                    enemy.radius -= 10;
                } else {
                    enemies.splice(enemyIndex, 1);
                }

                if (!activeUpgrades.piercingShot) {
                    projectiles.splice(projectileIndex, 1);
                    break; // Exit inner loop after removing projectile
                }
            }
        }
    }

    enemies.forEach((enemy) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.velocity = { x: Math.cos(angle), y: Math.sin(angle) };
        enemy.update();

        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (distance - enemy.radius - player.radius < 1) {
            cancelAnimationFrame(animationId);
            clearInterval(spawnEnemiesInterval);
            popupScoreElement.innerHTML = score;
            popupElement.style.display = "flex";
            const name = prompt("Enter your name:");
            saveScore(name, score);
            displayHighScores();
        }
    });

    // Use backward loop to safely remove items while iterating
    for (let upgradeIndex = upgrades.length - 1; upgradeIndex >= 0; upgradeIndex--) {
        const upgrade = upgrades[upgradeIndex];
        upgrade.update();

        const distance = Math.hypot(upgrade.x - player.x, upgrade.y - player.y);
        if (distance - upgrade.radius - player.radius < 1) {
            activateUpgrade(upgrade.type);
            upgrades.splice(upgradeIndex, 1);
        }
    }

}

startGameButton.addEventListener("click", () => {
    popupElement.style.display = "none";
    
    // Clear any existing game intervals and animation
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    if (spawnEnemiesInterval) {
        clearInterval(spawnEnemiesInterval);
    }
    if (spawnUpgradesInterval) {
        clearInterval(spawnUpgradesInterval);
    }
    if (spawnBossInterval) {
        clearInterval(spawnBossInterval);
    }
    
    // Reset game state
    projectiles = [];
    enemies = [];
    upgrades = [];
    score = 0;
    scoreElement.innerHTML = 0;
    player = new Player(canvas.width / 2, canvas.height / 2);
    
    enemySpawnDelay = 500;
    powerUpSpawnDelay = 10000;
    
    // Start new game
    animate();
    spawnEnemiesInterval = setInterval(spawnEnemy, enemySpawnDelay);
    spawnUpgradesInterval = setInterval(spawnUpgrade, powerUpSpawnDelay);
    spawnBossInterval = setInterval(spawnBossAndIncreaseDifficulty, 150000);
    
    displayHighScores();
});

displayHighScores();
