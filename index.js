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
let activeUpgradeTimers = { autoShoot: null, tripleShot: null, doubleDamageAndPoints: null, piercingShot: null };
let upgradeExpiresAt = { autoShoot: 0, tripleShot: 0, doubleDamageAndPoints: 0, piercingShot: 0 };
let upgradePopups = { autoShoot: null, tripleShot: null, doubleDamageAndPoints: null, piercingShot: null };
let isGameRunning = false;
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
    if (!isGameRunning || event.button !== 0) return;
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

    const boss = new Entity(x, y, radius, color, velocity);
    boss.speed = 0.5;
    enemies.push(boss);

    // setInterval does not respond to changes in the delay variables.
    enemySpawnDelay = Math.max(100, enemySpawnDelay * 0.5);
    powerUpSpawnDelay = Math.max(1000, powerUpSpawnDelay * 0.5);
    clearInterval(spawnEnemiesInterval);
    clearInterval(spawnUpgradesInterval);
    spawnEnemiesInterval = setInterval(spawnEnemy, enemySpawnDelay);
    spawnUpgradesInterval = setInterval(spawnUpgrade, powerUpSpawnDelay);
}

function spawnUpgrade() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const types = ["autoShoot", "tripleShot", "doubleDamageAndPoints", "piercingShot"];
    const type = types[Math.floor(Math.random() * types.length)];
    upgrades.push(new Upgrade(x, y, type));
}

function shootProjectile(event) {
    if (!isGameRunning) return;

    const angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    const color = activeUpgrades.doubleDamageAndPoints ? "red" : "white";

    function fireAtAngle(shotAngle) {
        const velocity = { x: Math.cos(shotAngle) * 5, y: Math.sin(shotAngle) * 5 };
        const projectile = new Entity(player.x, player.y, 5, color, velocity);
        // Capture power-ups when fired rather than changing bullets in flight.
        projectile.damage = activeUpgrades.doubleDamageAndPoints ? 20 : 10;
        projectile.scoreMultiplier = activeUpgrades.doubleDamageAndPoints ? 2 : 1;
        projectile.piercing = activeUpgrades.piercingShot;
        projectile.hitEnemies = new WeakSet();
        projectiles.push(projectile);
    }

    fireAtAngle(angle);
    if (activeUpgrades.tripleShot) {
        fireAtAngle(angle - 0.1);
        fireAtAngle(angle + 0.1);
    }
}

function autoShoot(event) {
    const now = Date.now();
    if (now - lastShotTime > shotInterval && isMouseDown) {
        shootProjectile(event);
        lastShotTime = now;
    }
}

const upgradeLabels = {
    autoShoot: "Auto Shoot",
    tripleShot: "Triple Shot",
    doubleDamageAndPoints: "Double Damage & Points",
    piercingShot: "Piercing Shot"
};

function displayUpgradeInfo() {
    const active = Object.keys(activeUpgrades).filter((type) => activeUpgrades[type]);
    upgradeInfoElement.textContent = active.map((type) => upgradeLabels[type]).join(" | ");
}

function updateUpgradePopups() {
    for (const type of Object.keys(upgradePopups)) {
        const popup = upgradePopups[type];
        if (popup) {
            const seconds = Math.max(0, Math.ceil((upgradeExpiresAt[type] - Date.now()) / 1000));
            popup.textContent = `${upgradeLabels[type]} - ${seconds}s`;
        }
    }
}

function resetUpgrades() {
    for (const type of Object.keys(activeUpgrades)) {
        clearTimeout(activeUpgradeTimers[type]);
        activeUpgradeTimers[type] = null;
        activeUpgrades[type] = false;
        upgradeExpiresAt[type] = 0;
        if (upgradePopups[type]) upgradePopups[type].remove();
        upgradePopups[type] = null;
    }
    displayUpgradeInfo();
}

function activateUpgrade(type) {
    if (!isGameRunning) return;

    clearTimeout(activeUpgradeTimers[type]);
    activeUpgrades[type] = true;
    upgradeExpiresAt[type] = Date.now() + upgradeDuration;

    // Collecting the same power-up again refreshes its timeout.
    if (!upgradePopups[type]) {
        const popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.top = "10%";
        popup.style.left = "50%";
        popup.style.transform = "translateX(-50%)";
        popup.style.padding = "10px";
        popup.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        popup.style.color = "white";
        popup.style.border = "2px solid gold";
        popup.style.borderRadius = "5px";
        popup.style.zIndex = "1000";
        document.body.appendChild(popup);
        upgradePopups[type] = popup;
    }

    activeUpgradeTimers[type] = setTimeout(() => {
        if (!isGameRunning) return;
        activeUpgrades[type] = false;
        activeUpgradeTimers[type] = null;
        upgradeExpiresAt[type] = 0;
        upgradePopups[type]?.remove();
        upgradePopups[type] = null;
        displayUpgradeInfo();
    }, upgradeDuration);

    updateUpgradePopups();
    displayUpgradeInfo();
}

function loadScores() {
    try {
        const scores = JSON.parse(localStorage.getItem("scores"));
        return Array.isArray(scores) ? scores : [];
    } catch {
        return [];
    }
}

function saveScore(name, score) {
    const scores = loadScores();
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    try {
        localStorage.setItem("scores", JSON.stringify(scores));
    } catch {
        // Blocked or unavailable storage must not interrupt gameplay.
    }
}

function displayHighScores() {
    const scores = loadScores();
    highScoresElement.replaceChildren(...scores.slice(0, 10).map((entry, index) => {
        const row = document.createElement("div");
        row.textContent = `${index + 1}. ${entry.name} - ${entry.score}`;
        return row;
    }));
}

function animate() {
    if (!isGameRunning) return;
    const speed = 2;
    animationId = requestAnimationFrame(animate);
    updateUpgradePopups();

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
            if (distance - enemy.radius - projectile.radius < 1 && !projectile.hitEnemies.has(enemy)) {
                projectile.hitEnemies.add(enemy);

                score += (enemy.radius - 10 > 10 ? 100 : 250) * projectile.scoreMultiplier;
                scoreElement.textContent = score;

                if (enemy.radius - projectile.damage > 10) {
                    enemy.radius -= projectile.damage;
                } else {
                    enemies.splice(enemyIndex, 1);
                }

                if (!projectile.piercing) {
                    projectiles.splice(projectileIndex, 1);
                    break;
                }
            }
        }
    }

    for (const enemy of enemies) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const speed = enemy.speed ?? 1;
        enemy.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        enemy.update();

        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (distance - enemy.radius - player.radius < 1) {
            endGame();
            return;
        }
    }

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

function stopGameplayTimers() {
    if (animationId != null) cancelAnimationFrame(animationId);
    animationId = null;
    clearInterval(spawnEnemiesInterval);
    clearInterval(spawnUpgradesInterval);
    clearInterval(spawnBossInterval);
    spawnEnemiesInterval = null;
    spawnUpgradesInterval = null;
    spawnBossInterval = null;
}

function endGame() {
    if (!isGameRunning) return;
    isGameRunning = false;
    stopGameplayTimers();
    resetUpgrades();

    popupScoreElement.textContent = score;
    popupElement.style.display = "flex";
    const name = prompt("Enter your name:");
    saveScore(name?.trim() || "Anonymous", score);
    displayHighScores();
}

startGameButton.addEventListener("click", () => {
    stopGameplayTimers();
    resetUpgrades();
    popupElement.style.display = "none";

    projectiles = [];
    enemies = [];
    upgrades = [];
    score = 0;
    scoreElement.textContent = 0;
    player = new Player(canvas.width / 2, canvas.height / 2);
    isMouseDown = false;
    lastShotTime = 0;
    enemySpawnDelay = 500;
    powerUpSpawnDelay = 10000;

    isGameRunning = true;
    animate();
    spawnEnemiesInterval = setInterval(spawnEnemy, enemySpawnDelay);
    spawnUpgradesInterval = setInterval(spawnUpgrade, powerUpSpawnDelay);
    spawnBossInterval = setInterval(spawnBossAndIncreaseDifficulty, 150000);

    displayHighScores();
});

displayHighScores();
