const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const StartGameBtn = document.querySelector("#start-game-button");
const Popup = document.querySelector("#popup");
const scoreEl = document.querySelector("#score");
const popupScore = document.querySelector("#popup-score");
const upgradeInfo = document.querySelector("#upgrade-info");

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

class Upgrade extends Entity {
    constructor(x, y, type) {
        super(x, y, 15, "gold");
        this.type = type;
    }
}

let player = new Entity(canvas.width / 2, canvas.height / 2, 10, "white");
let projectiles = [];
let enemies = [];
let upgrades = [];
let activeUpgrades = { autoshoot: false, tripleShot: false, doubleDamage: false, piercingShot: false };
let score = 0;
let spawnEnemies;
let keys = { w: false, a: false, s: false, d: false };
let lastShotTime = 0;
const shotInterval = 20; // Interval for autoshooting
const upgradeDuration = 5000; // Duration for upgrades in milliseconds
let isMouseDown = false; // Track mouse button state
let mousePosition = { x: player.x, y: player.y }; // Track mouse position

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
    if (activeUpgrades.autoshoot) {
        autoshoot(event);
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

function spawnUpgrade() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const types = ["autoshoot", "tripleShot", "doubleDamage", "piercingShot"];
    const type = types[Math.floor(Math.random() * types.length)];
    upgrades.push(new Upgrade(x, y, type));
}

function shootProjectile(event) {
    const angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
    const color = activeUpgrades.doubleDamage ? "red" : "white";
    const damage = activeUpgrades.doubleDamage ? 2 : 1;

    projectiles.push(new Entity(player.x, player.y, 5, color, velocity));

    if (activeUpgrades.tripleShot) {
        const offsetAngle = 0.1; // Small angle offset for side projectiles
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

function autoshoot(event) {
    const now = Date.now();
    if (now - lastShotTime > shotInterval && isMouseDown) {
        shootProjectile(event);
        lastShotTime = now;
    }
}

function activateUpgrade(type) {
    activeUpgrades[type] = true;
    displayUpgradeInfo(type);
    setTimeout(() => {
        activeUpgrades[type] = false;
        hideUpgradeInfo();
    }, upgradeDuration);
}

function displayUpgradeInfo(type) {
    upgradeInfo.style.display = "block";
    upgradeInfo.innerHTML = `${type} activated for ${upgradeDuration / 1000}s`;

    let remainingTime = upgradeDuration / 1000;
    const interval = setInterval(() => {
        remainingTime -= 1;
        upgradeInfo.innerHTML = `${type} activated for ${remainingTime}s`;
        if (remainingTime <= 0) {
            clearInterval(interval);
        }
    }, 1000);
}

function hideUpgradeInfo() {
    upgradeInfo.style.display = "none";
}

function animate() {
    const speed = 2;
    animationId = requestAnimationFrame(animate);

    context.fillStyle = "rgba(0,0,0, 0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    player.velocity.x = keys.d ? speed : keys.a ? -speed : 0;
    player.velocity.y = keys.s ? speed : keys.w ? -speed : 0;

    player.update();

    if (isMouseDown && activeUpgrades.autoshoot) {
        autoshoot({ clientX: mousePosition.x, clientY: mousePosition.y });
    }

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
                score += (enemy.radius - 10 > 10 ? 100 : 250) * (activeUpgrades.doubleDamage ? 2 : 1);
                scoreEl.innerHTML = score;
                if (enemy.radius - 10 > 10) {
                    enemy.radius -= 10;
                } else {
                    enemies.splice(eidx, 1);
                }
                if (!activeUpgrades.piercingShot) {
                    projectiles.splice(pidx, 1);
                }
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

    upgrades.forEach((upgrade, uidx) => {
        upgrade.update();

        const dist = Math.hypot(upgrade.x - player.x, upgrade.y - player.y);
        if (dist - upgrade.radius - player.radius < 1) {
            activateUpgrade(upgrade.type);
            upgrades.splice(uidx, 1);
        }
    });
}

StartGameBtn.addEventListener("click", () => {
    Popup.style.display = "none";
    projectiles = [];
    enemies = [];
    upgrades = [];
    score = 0;
    scoreEl.innerHTML = 0;
    player = new Entity(canvas.width / 2, canvas.height / 2, 10, "white");

    animate();
    spawnEnemies = setInterval(spawnEnemy, 500);
    setInterval(spawnUpgrade, 10000); // Spawn an upgrade every 10 seconds
});
