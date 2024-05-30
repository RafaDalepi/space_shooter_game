const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const start_game_button = document.querySelector("#start-game-button");
const Popup = document.querySelector("#popup");
const scoreEl = document.querySelector("#score");
const popupScore = document.querySelector("#popup-score");
const highScoresEl = document.querySelector("#high-scores");
const upgrade_info = document.querySelector("#upgrade-info");

canvas.width = innerWidth;
canvas.height = innerHeight;

class Entity {
    constructor(x, y, radius, color, velocity = { x: 0, y: 0 }) {
        Object.assign(this, { x, y, radius, color, velocity });
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
        const sides = 6, angle = (Math.PI * 2) / sides;
        context.moveTo(this.x + this.radius * Math.cos(0), this.y + this.radius * Math.sin(0));
        for (let i = 1; i <= sides; i++) {
            context.lineTo(this.x + this.radius * Math.cos(i * angle), this.y + this.radius * Math.sin(i * angle));
        }
        context.fillStyle = this.color;
        context.fill();
    }
}

let player, projectiles = [], enemies = [], upgrades = [], animation_Id, spawn_enemies;
let active_upgrades = { auto_shoot: false, triple_shot: false, double_damage_and_points: false, piercing_shot: false };
let score = 0, keys = { w: false, a: false, s: false, d: false };
let last_shot_time = 0, is_mouse_down = false, mouse_position = { x: canvas.width / 2, y: canvas.height / 2 };
const shot_interval = 80, upgrade_duration = 5000, enemy_delay = 500, powerup_delay = 10000;

["keydown", "keyup"].forEach(event => addEventListener(event, ({ key }) => keys[key] = event === "keydown"));
["mousemove", "mousedown", "mouseup"].forEach(event => addEventListener(event, e => handleMouseEvent(e, event)));

function handleMouseEvent(event, type) {
    if (type === "mousemove") mouse_position = { x: event.clientX, y: event.clientY };
    if (type === "mousedown") {
        is_mouse_down = true;
        active_upgrades.auto_shoot ? auto_shoot(event) : shoot_projectile(event);
    }
    if (type === "mouseup") is_mouse_down = false;
}

function spawn_enemy() {
    const radius = Math.random() * 15 + 10;
    let x = Math.random() < 0.5 ? (Math.random() < 0.5 ? -radius : canvas.width + radius) : Math.random() * canvas.width;
    let y = Math.random() < 0.5 ? (Math.random() < 0.5 ? -radius : canvas.height + radius) : Math.random() * canvas.height;
    const angle = Math.atan2(player.y - y, player.x - x);
    enemies.push(new Entity(x, y, radius, `hsl(${Math.random() * 360}, 50%, 50%)`, { x: Math.cos(angle), y: Math.sin(angle) }));
}

function spawn_upgrade() {
    upgrades.push(new Upgrade(Math.random() * canvas.width, Math.random() * canvas.height, ["auto_shoot", "triple_shot", "double_damage_and_points", "piercing_shot"][Math.floor(Math.random() * 4)]));
}

function shoot_projectile(event) {
    const angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    const baseVelocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
    const color = active_upgrades.double_damage_and_points ? "red" : "white";
    projectiles.push(new Entity(player.x, player.y, 5, color, baseVelocity));
    if (active_upgrades.triple_shot) {
        projectiles.push(new Entity(player.x, player.y, 5, color, { x: Math.cos(angle - 0.1) * 5, y: Math.sin(angle - 0.1) * 5 }));
        projectiles.push(new Entity(player.x, player.y, 5, color, { x: Math.cos(angle + 0.1) * 5, y: Math.sin(angle + 0.1) * 5 }));
    }
}

function auto_shoot(event) {
    if (Date.now() - last_shot_time > shot_interval && is_mouse_down) {
        shoot_projectile(event);
        last_shot_time = Date.now();
    }
}

function activate_upgrade(type) {
    active_upgrades[type] = true;
    display_upgrade_info(type);
    setTimeout(() => {
        active_upgrades[type] = false;
        hide_upgrade_info();
    }, upgrade_duration);
}

function display_upgrade_info(type) {
    upgrade_info.style.display = "block";
    let remaining_time = upgrade_duration / 1000;
    upgrade_info.innerHTML = `${type} time remaining: ${remaining_time}s`;
    const interval = setInterval(() => {
        upgrade_info.innerHTML = `${type} time remaining: ${--remaining_time}s`;
        if (remaining_time <= 0) clearInterval(interval);
    }, 1000);
}

function hide_upgrade_info() {
    upgrade_info.style.display = "none";
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

function max_name_length(maxLength) {
    var input = prompt("Seu nome:");
    if (input === null) {
        return null;
    }
    if (input.length > maxLength) {
        input = input.slice(0, maxLength);
    }
    return input;
}

function animate() {
    animation_Id = requestAnimationFrame(animate);
    context.fillStyle = "rgba(0,0,0, 0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    player.velocity.x = keys.d ? 2 : keys.a ? -2 : 0;
    player.velocity.y = keys.s ? 2 : keys.w ? -2 : 0;
    player.x = (player.x + canvas.width) % canvas.width || canvas.width;
    player.y = (player.y + canvas.height) % canvas.height || canvas.height;

    player.update();

    if (is_mouse_down && active_upgrades.auto_shoot) auto_shoot({ clientX: mouse_position.x, clientY: mouse_position.y });

    projectiles = projectiles.filter(projectile => {
        projectile.update();
        return projectile.x + projectile.radius >= 0 && projectile.y + projectile.radius >= 0 &&
            projectile.x - projectile.radius <= canvas.width && projectile.y - projectile.radius <= canvas.height;
    });

    enemies = enemies.filter(enemy => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.velocity = { x: Math.cos(angle), y: Math.sin(angle) };
        enemy.update();
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) - enemy.radius - player.radius < 1) {
            cancelAnimationFrame(animation_Id);
            clearInterval(spawn_enemies);
            popupScore.innerHTML = score;
            Popup.style.display = "flex";
            const name = max_name_length(5);
            save_score(name, score);
            display_high_scores();
            return false;
        }
        return true;
    });

    upgrades = upgrades.filter(upgrade => {
        upgrade.update();
        if (Math.hypot(upgrade.x - player.x, upgrade.y - player.y) - upgrade.radius - player.radius < 1) {
            activate_upgrade(upgrade.type);
            return false;
        }
        return true;
    });

    projectiles.forEach((projectile, pidx) => {
        enemies.forEach((enemy, eidx) => {
            if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) - enemy.radius - projectile.radius < 1) {
                score += (enemy.radius > 20 ? 100 : 250) * (active_upgrades.double_damage_and_points ? 2 : 1);
                scoreEl.innerHTML = score;
                if (enemy.radius > 20) {
                    enemy.radius -= 10;
                } else {
                    enemies.splice(eidx, 1);
                }
                if (!active_upgrades.piercing_shot) {
                    projectiles.splice(pidx, 1);
                }
            }
        });
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
    display_high_scores();
});

display_high_scores();
