const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const start_game_button = document.querySelector("#start-game-button");
const Popup = document.querySelector("#popup");
const scoreEl = document.querySelector("#score");
const popupScore = document.querySelector("#popup-score");
const highScoresEl = document.querySelector("#high-scores");
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

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 10, "white");
    }
    draw() {
        context.save();
        context.translate(this.x, this.y);
        const angle = Math.atan2(mouse_position.y - this.y, mouse_position.x - this.x);
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
let active_upgrades = { Tiros_Automaticos: false, Tiros_Triplos: false, Dano_e_Pontos_Duplos: false, Tiro_Penetrante: false };
let active_upgrades_timers = { Tiros_Automaticos: 0, Tiros_Triplos: 0, Dano_e_Pontos_Duplos: 0, Tiro_Penetrante: 0 };
let score = 0;
let spawn_enemies;
let keys = { w: false, a: false, s: false, d: false };
let last_shot_time = 0;
const shot_interval = 80;
const upgrade_duration = 10000;
let is_mouse_down = false;
let mouse_position = { x: player.x, y: player.y };
let enemy_delay = 500;
let powerup_delay = 10000;

addEventListener("keydown", ({ key }) => {
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

addEventListener("keyup", ({ key }) => {
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

addEventListener("mousemove", (event) => {
    mouse_position = { x: event.clientX, y: event.clientY };
});

addEventListener("mousedown", (event) => {
    is_mouse_down = true;
    if (active_upgrades.Tiros_Automaticos) {
        Tiros_Automaticos(event);
    } else {
        shoot_projectile(event);
    }
});

addEventListener("mouseup", () => {
    is_mouse_down = false;
});

function spawn_enemy() {
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

function spawn_boss_increase_difficulty() {
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

    enemy_delay /= 0.5;
    powerup_delay /= 0.5;
    if (radius <= 400){
        radius * 2;
    }
}

function spawn_upgrade() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const types = ["Tiros_Automaticos", "Tiros_Triplos", "Dano_e_Pontos_Duplos", "Tiro_Penetrante"];
    const type = types[Math.floor(Math.random() * types.length)];
    upgrades.push(new Upgrade(x, y, type));
}

function shoot_projectile(event) {
    const angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };

    const color = active_upgrades.Dano_e_Pontos_Duplos ? "red" : "white";

    projectiles.push(new Entity(player.x, player.y, 5, color, velocity));

    if (active_upgrades.Tiros_Triplos) {
        const offset_angle = 0.1;
        const left_velocity = {
            x: Math.cos(angle - offset_angle) * 5,
            y: Math.sin(angle - offset_angle) * 5
        };
        const right_velocity = {
            x: Math.cos(angle + offset_angle) * 5,
            y: Math.sin(angle + offset_angle) * 5
        };
        projectiles.push(new Entity(player.x, player.y, 5, color, left_velocity));
        projectiles.push(new Entity(player.x, player.y, 5, color, right_velocity));
    }
}

function Tiros_Automaticos(event) {
    const now = Date.now();
    if (now - last_shot_time > shot_interval && is_mouse_down) {
        shoot_projectile(event);
        last_shot_time = now;
    }
}

function activate_upgrade(type) {
    active_upgrades[type] = true;
    active_upgrades_timers[type] = upgrade_duration;

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

    let remainingTime = upgrade_duration / 1000;
    upgradePopup.innerText = `${type} - ${remainingTime}s`;

    const countdownInterval = setInterval(() => {
        remainingTime -= 1;
        upgradePopup.innerText = `${type.replace('_', ' ')} - ${remainingTime}s`;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            document.body.removeChild(upgradePopup);
        }
    }, 1000);

    setTimeout(() => {
        active_upgrades[type] = false;
        display_upgrade_info(type);
    }, upgrade_duration);
}

function display_upgrade_info(type) {
    const info = {
        Tiros_Automaticos: "Auto Shoot: Automatically shoot projectiles",
        Tiros_Triplos: "Triple Shot: Shoot 3 projectiles at once",
        Dano_e_Pontos_Duplos: "Double Damage & Points: Deal double damage and earn double points",
        Tiro_Penetrante: "Piercing Shot: Projectiles pierce through enemies"
    };
    upgradeInfo.innerHTML = info[type];
}

function save_score(name, score) {
    let scores = JSON.parse(localStorage.getItem("scores")) || [];
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem("scores", JSON.stringify(scores));
}

function display_high_scores() {
    let scores = JSON.parse(localStorage.getItem("scores")) || [];
    highScoresEl.innerHTML = scores.slice(0, 10).map((entry, index) => `${index + 1}. ${entry.name} - ${entry.score}`).join("<br>");
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

    if (is_mouse_down && active_upgrades.Tiros_Automaticos) {
        Tiros_Automaticos({ clientX: mouse_position.x, clientY: mouse_position.y });
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

                score += (enemy.radius - 10 > 10 ? 100 : 250) * (active_upgrades.Dano_e_Pontos_Duplos ? 2 : 1);
                scoreEl.innerHTML = score;

                const damage = active_upgrades.Dano_e_Pontos_Duplos ? 20 : 10;

                if (enemy.radius - damage > 10) {
                    enemy.radius -= 10;
                } else {
                    enemies.splice(eidx, 1);
                }

                if (!active_upgrades.Tiro_Penetrante) {
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
            clearInterval(spawn_enemies);
            popupScore.innerHTML = score;
            Popup.style.display = "flex";
            const name = prompt("Enter your name:");
            save_score(name, score);
            display_high_scores();
        }
    });

    upgrades.forEach((upgrade, uidx) => {
        upgrade.update();

        const dist = Math.hypot(upgrade.x - player.x, upgrade.y - player.y);
        if (dist - upgrade.radius - player.radius < 1) {
            activate_upgrade(upgrade.type);
            upgrades.splice(uidx, 1);
        }
    });

}

start_game_button.addEventListener("click", () => {
    Popup.style.display = "none";
    projectiles = [];
    enemies = [];
    upgrades = [];
    score = 0;
    scoreEl.innerHTML = 0;
    player = new Player(canvas.width / 2, canvas.height / 2);

    animate();
    spawn_enemies = setInterval(spawn_enemy, enemy_delay);
    setInterval(spawn_upgrade, powerup_delay);
    setInterval(spawn_boss_increase_difficulty, 150000);

    clearInterval(powerup_delay);
    clearInterval(enemy_delay);
    display_high_scores();
});

display_high_scores();
