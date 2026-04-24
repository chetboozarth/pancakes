const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const stackEl = document.querySelector("#stack");
const timeEl = document.querySelector("#time");
const levelEl = document.querySelector("#level");
const messageEl = document.querySelector("#message");
const startBtn = document.querySelector("#start");
const leftBtn = document.querySelector("#left");
const rightBtn = document.querySelector("#right");
const speedInput = document.querySelector("#speed");
const speedLabel = document.querySelector("#speedLabel");
const difficultyInput = document.querySelector("#difficulty");
const difficultyLabel = document.querySelector("#difficultyLabel");

const W = canvas.width;
const H = canvas.height;
const groundY = H - 66;
const STACK_GOAL = 15;
const NORMAL_LEVEL_SECONDS = 60;
const CELEBRATION_SECONDS = 10;
const BONUS_SECONDS = 15;
const FINAL_LEVEL = 3;
const plate = { x: W / 2, y: groundY, width: 142, speed: 7 };
const keys = new Set();
const heldButtons = { left: false, right: false };

const foods = [
  { name: "pancake", points: 10, stack: 1, color: "#d99b42", kind: "food" },
  { name: "blueberry", points: 5, stack: 0, color: "#4762b5", kind: "food" },
  { name: "strawberry", points: 8, stack: 0, color: "#f04d4d", kind: "food" },
  { name: "butter", points: 12, stack: 0, color: "#ffe36e", kind: "food" }
];

const hazards = [
  { name: "sock", points: -10, color: "#7e7e90", kind: "hazard" },
  { name: "fork", points: -12, color: "#b8c0c9", kind: "hazard" }
];

const state = {
  running: false,
  phase: "idle",
  level: 1,
  pendingLevel: 1,
  score: 0,
  stack: 0,
  timeLeft: NORMAL_LEVEL_SECONDS,
  drops: [],
  lastSpawn: 0,
  lastTick: 0,
  timerCarry: 0,
  difficulty: 1,
  celebrationFinale: false,
  frameId: null
};

function resetGame() {
  if (state.frameId) cancelAnimationFrame(state.frameId);
  state.frameId = null;
  state.phase = "level";
  state.level = 1;
  state.pendingLevel = 1;
  state.running = true;
  state.score = 0;
  state.stack = 0;
  state.timeLeft = NORMAL_LEVEL_SECONDS;
  state.drops = [];
  state.lastSpawn = 0;
  state.lastTick = performance.now();
  state.timerCarry = 0;
  state.difficulty = 1;
  state.celebrationFinale = false;
  plate.x = W / 2;
  messageEl.textContent = `Level ${state.level}: stack ${STACK_GOAL} pancakes before time runs out!`;
  startBtn.textContent = "Restart";
  updateHud();
  beginLoop();
}

function startLevel(level) {
  state.phase = "level";
  state.running = true;
  state.level = level;
  state.pendingLevel = level;
  state.stack = 0;
  state.timeLeft = NORMAL_LEVEL_SECONDS;
  state.drops = [];
  state.lastSpawn = 0;
  state.lastTick = performance.now();
  state.timerCarry = 0;
  state.difficulty = 1;
  plate.x = W / 2;
  messageEl.textContent = `Level ${state.level}: stack ${STACK_GOAL} pancakes before time runs out!`;
  beginLoop();
}

function startNextLevelPrompt(level) {
  state.phase = "levelReady";
  state.running = false;
  state.pendingLevel = level;
  state.level = level;
  state.stack = 0;
  state.timeLeft = NORMAL_LEVEL_SECONDS;
  state.drops = [];
  state.timerCarry = 0;
  startBtn.textContent = `Start Level ${level}`;
  messageEl.textContent = `Ready for Level ${level}? Press Start or Space.`;
}

function startCelebration(isFinale) {
  state.phase = "celebration";
  state.running = true;
  state.celebrationFinale = isFinale;
  state.timeLeft = CELEBRATION_SECONDS;
  state.drops = [];
  state.lastTick = performance.now();
  state.timerCarry = 0;
  messageEl.textContent = isFinale ? "Final dance party!" : "Dance party! Bonus round next.";
}

function startBonusRound() {
  state.phase = "bonus";
  state.running = true;
  state.stack = 0;
  state.timeLeft = BONUS_SECONDS;
  state.drops = [];
  state.lastSpawn = 0;
  state.lastTick = performance.now();
  state.timerCarry = 0;
  state.difficulty = 4;
  messageEl.textContent = "Bonus round! Max speed, medium difficulty.";
}

function finishGame() {
  state.phase = "gameover";
  state.running = false;
  state.drops = [];
  startBtn.textContent = "Play Again";
  messageEl.textContent = `Game complete! Final score: ${state.score}`;
}

function beginLoop() {
  if (!state.frameId) state.frameId = requestAnimationFrame(loop);
}

function handleStartAction() {
  if (state.phase === "levelReady") {
    startBtn.textContent = "Restart";
    startLevel(state.pendingLevel);
  } else {
    resetGame();
  }
}

function updateHud() {
  scoreEl.textContent = state.score;
  stackEl.textContent = state.stack;
  timeEl.textContent = state.timeLeft;
  levelEl.textContent = state.phase === "bonus" ? "Bonus" : state.level;
}

function getSpeedScale() {
  return Number(speedInput.value) / 100;
}

function getActiveSpeedScale() {
  return state.phase === "bonus" ? 1.2 : getSpeedScale();
}

function updateSpeedLabel() {
  const value = Number(speedInput.value);
  if (value < 65) {
    speedLabel.textContent = "Slow";
  } else if (value < 90) {
    speedLabel.textContent = "Easy";
  } else if (value < 110) {
    speedLabel.textContent = "Normal";
  } else {
    speedLabel.textContent = "Quick";
  }
}

function getDifficultyLevel() {
  return Number(difficultyInput.value);
}

function getActiveDifficultyLevel() {
  return state.phase === "bonus" ? 3 : getDifficultyLevel();
}

function updateDifficultyLabel() {
  const labels = ["Practice", "Easy", "Medium", "Hard", "Expert"];
  difficultyLabel.textContent = labels[getDifficultyLevel() - 1];
}

function chooseDropItem() {
  const difficultyLevel = getActiveDifficultyLevel();
  const hazardChanceByDifficulty = [0.06, 0.12, 0.22, 0.32, 0.42];
  const pancakeChanceByDifficulty = [0.72, 0.62, 0.48, 0.36, 0.26];

  if (Math.random() < hazardChanceByDifficulty[difficultyLevel - 1]) {
    return hazards[Math.floor(Math.random() * hazards.length)];
  }

  if (Math.random() < pancakeChanceByDifficulty[difficultyLevel - 1]) {
    return foods[0];
  }

  const toppings = foods.slice(1);
  return toppings[Math.floor(Math.random() * toppings.length)];
}

function spawnDrop(now) {
  if (state.phase === "celebration") return;

  const speedScale = getActiveSpeedScale();
  const gap = Math.max(540, 1180 - state.difficulty * 65) / speedScale;
  if (now - state.lastSpawn < gap) return;

  const item = chooseDropItem();
  const radius = item.name === "pancake" ? 30 : 22;

  state.drops.push({
    ...item,
    x: 50 + Math.random() * (W - 100),
    y: -40,
    radius,
    speed: (1.55 + Math.random() * 1.15 + state.difficulty * 0.12) * speedScale,
    wobble: Math.random() * Math.PI * 2
  });

  state.lastSpawn = now;
}

function movePlate() {
  const left = keys.has("ArrowLeft") || keys.has("a") || heldButtons.left;
  const right = keys.has("ArrowRight") || keys.has("d") || heldButtons.right;

  if (left) plate.x -= plate.speed;
  if (right) plate.x += plate.speed;
  plate.x = Math.max(plate.width / 2, Math.min(W - plate.width / 2, plate.x));
}

function updateDrops() {
  for (const drop of state.drops) {
    drop.y += drop.speed;
    drop.wobble += 0.05;
    drop.x += Math.sin(drop.wobble) * 0.45;
  }

  const caught = [];
  state.drops = state.drops.filter((drop) => {
    const onPlateX = Math.abs(drop.x - plate.x) < plate.width / 2 + drop.radius * 0.45;
    const onPlateY = drop.y + drop.radius > plate.y - 16 && drop.y - drop.radius < plate.y + 18;

    if (onPlateX && onPlateY) {
      caught.push(drop);
      return false;
    }

    return drop.y - drop.radius < H;
  });

  for (const drop of caught) {
    state.score = Math.max(0, state.score + drop.points);
    if (drop.stack) {
      if (state.phase === "level") {
        state.stack += drop.stack;
        state.timeLeft += 5;
      }
    }
    if (drop.kind === "hazard") {
      if (state.phase === "level") state.stack = Math.max(0, state.stack - 2);
      messageEl.textContent = `Oops, ${drop.name}! Keep the breakfast clean.`;
    } else {
      if (drop.name === "pancake" && state.phase === "level") {
        messageEl.textContent = "Nice pancake! +5 seconds";
      } else if (drop.name === "pancake") {
        messageEl.textContent = "Bonus pancake!";
      } else {
        messageEl.textContent = `Yum, ${drop.name}!`;
      }
    }
  }
}

function updateTimer(delta) {
  state.timerCarry += delta;
  if (state.timerCarry >= 1000) {
    const seconds = Math.floor(state.timerCarry / 1000);
    state.timeLeft = Math.max(0, state.timeLeft - seconds);
    state.timerCarry %= 1000;
    if (state.phase === "level") {
      state.difficulty = Math.max(1, 1 + Math.floor((NORMAL_LEVEL_SECONDS - state.timeLeft) / 10));
    }
  }
}

function checkGameEnd() {
  if (state.phase === "level" && state.stack >= STACK_GOAL) {
    startCelebration(state.level === FINAL_LEVEL);
  } else if (state.phase === "level" && state.timeLeft <= 0) {
    state.running = false;
    messageEl.textContent = `Time! You stacked ${state.stack} pancakes. Try again?`;
  } else if (state.phase === "celebration" && state.timeLeft <= 0) {
    if (state.celebrationFinale) {
      finishGame();
    } else {
      startBonusRound();
    }
  } else if (state.phase === "bonus" && state.timeLeft <= 0) {
    startNextLevelPrompt(state.level + 1);
  }
}

function drawBackground() {
  const levelSky = ["#b7ecff", "#fbd0ff", "#b8f2d8"];
  const levelGround = ["#5cbc68", "#f5a623", "#7a8ee8"];
  const levelGrass = ["#4ca95d", "#d9841f", "#6277d8"];

  ctx.fillStyle = levelSky[state.level - 1] || levelSky[0];
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  if (state.level === 1) {
    drawCloud(135, 86, 1);
    drawCloud(685, 108, 1.25);
  } else if (state.level === 2) {
    drawCloud(130, 96, 0.85);
    drawCloud(420, 78, 1.05);
    drawCloud(720, 126, 0.9);
    drawLevelTwoHills();
  } else {
    drawStars();
    drawMoon();
  }

  ctx.fillStyle = levelGround[state.level - 1] || levelGround[0];
  ctx.fillRect(0, groundY + 35, W, H - groundY);
  ctx.fillStyle = levelGrass[state.level - 1] || levelGrass[0];
  for (let x = 0; x < W; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + 36);
    ctx.lineTo(x + 17, groundY + 20);
    ctx.lineTo(x + 34, groundY + 36);
    ctx.fill();
  }
}

function drawLevelTwoHills() {
  ctx.fillStyle = "#ffeb9f";
  ctx.beginPath();
  ctx.arc(180, groundY + 38, 155, Math.PI, 0);
  ctx.arc(475, groundY + 46, 190, Math.PI, 0);
  ctx.arc(775, groundY + 42, 135, Math.PI, 0);
  ctx.fill();
}

function drawStars() {
  ctx.fillStyle = "#fff7a8";
  for (let i = 0; i < 28; i += 1) {
    const x = (i * 83) % W;
    const y = 34 + ((i * 47) % 190);
    ctx.beginPath();
    ctx.arc(x, y, i % 3 === 0 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoon() {
  ctx.fillStyle = "#fff4b8";
  ctx.beginPath();
  ctx.arc(760, 85, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8f2d8";
  ctx.beginPath();
  ctx.arc(778, 72, 38, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, 28 * scale, 0, Math.PI * 2);
  ctx.arc(x + 32 * scale, y - 14 * scale, 34 * scale, 0, Math.PI * 2);
  ctx.arc(x + 70 * scale, y, 28 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlate() {
  ctx.save();
  ctx.translate(plate.x, plate.y);

  for (let i = 0; i < Math.min(state.stack, 9); i += 1) {
    ctx.fillStyle = i % 2 ? "#e7ad55" : "#d99b42";
    roundRect(-56, -28 - i * 12, 112, 20, 10);
    ctx.fill();
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-38, -24 - i * 12, 12, 4);
    ctx.fillRect(18, -22 - i * 12, 14, 4);
  }

  ctx.fillStyle = "#f5f3ee";
  ctx.beginPath();
  ctx.ellipse(0, 8, plate.width / 2, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#dfe8ef";
  ctx.beginPath();
  ctx.ellipse(0, 6, plate.width / 2 - 24, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDrop(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);

  if (drop.name === "pancake") {
    ctx.fillStyle = drop.color;
    roundRect(-32, -15, 64, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-16, -5, 10, 4);
    ctx.fillRect(10, 2, 13, 4);
  } else if (drop.name === "blueberry") {
    ctx.fillStyle = drop.color;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#263970";
    ctx.beginPath();
    ctx.arc(5, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (drop.name === "strawberry") {
    ctx.fillStyle = drop.color;
    ctx.beginPath();
    ctx.moveTo(0, 23);
    ctx.bezierCurveTo(-32, -4, -15, -28, 0, -12);
    ctx.bezierCurveTo(15, -28, 32, -4, 0, 23);
    ctx.fill();
    ctx.fillStyle = "#2f9e44";
    ctx.fillRect(-9, -20, 18, 8);
  } else if (drop.name === "butter") {
    ctx.fillStyle = drop.color;
    roundRect(-20, -16, 40, 32, 7);
    ctx.fill();
  } else if (drop.name === "sock") {
    ctx.fillStyle = drop.color;
    roundRect(-11, -27, 22, 45, 7);
    ctx.fill();
    roundRect(-11, 6, 38, 18, 9);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-10, -17, 20, 6);
  } else {
    ctx.strokeStyle = drop.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(0, 28);
    ctx.moveTo(-15, -30);
    ctx.lineTo(-15, -6);
    ctx.moveTo(15, -30);
    ctx.lineTo(15, -6);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDancingPancakes(now) {
  const dancers = state.celebrationFinale
    ? [
        { x: 315, y: 365, scale: 0.72, offset: 0 },
        { x: 450, y: 350, scale: 0.84, offset: 1.2 },
        { x: 585, y: 370, scale: 0.7, offset: 2.4 }
      ]
    : [
        { x: 250, y: 340, scale: 1.1, offset: 0 },
        { x: 450, y: 315, scale: 1.3, offset: 1.2 },
        { x: 650, y: 345, scale: 1.05, offset: 2.4 }
      ];

  ctx.fillStyle = "rgba(255, 247, 214, 0.78)";
  roundRect(86, 74, 728, 112, 8);
  ctx.fill();
  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#23313a";
  ctx.textAlign = "center";
  ctx.font = "800 43px Trebuchet MS";
  ctx.fillText(state.celebrationFinale ? "Final Dance Party!" : "Dance Party!", W / 2, 124);
  ctx.font = "800 25px Trebuchet MS";
  ctx.fillText(`${state.timeLeft} seconds`, W / 2, 162);

  if (state.celebrationFinale) drawFinalDanceKitchen(false);
  for (const dancer of dancers) {
    drawDancingPancake(dancer.x, dancer.y, dancer.scale, now / 260 + dancer.offset);
  }
  if (state.celebrationFinale) drawFinalDanceKitchen(true);
}

function drawFinalDanceKitchen(foreground) {
  if (!foreground) {
    ctx.fillStyle = "#e9edf2";
    roundRect(160, 330, 580, 170, 8);
    ctx.fill();
    ctx.strokeStyle = "#23313a";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = "#2d3740";
    ctx.fillRect(202, 350, 496, 46);
    ctx.fillStyle = "#ff7b54";
    for (const x of [260, 450, 640]) {
      ctx.beginPath();
      ctx.arc(x, 374, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#3b4650";
    ctx.beginPath();
    ctx.ellipse(450, 392, 240, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#23313a";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = "#596673";
    ctx.beginPath();
    ctx.ellipse(450, 382, 205, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#23313a";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(660, 386);
    ctx.lineTo(790, 350);
    ctx.stroke();
    return;
  }

  ctx.fillStyle = "#303a43";
  ctx.beginPath();
  ctx.ellipse(450, 414, 246, 45, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = "#cbd3db";
  for (const x of [245, 330, 570, 655]) {
    ctx.beginPath();
    ctx.arc(x, 472, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#23313a";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawDancingPancake(x, y, scale, beat) {
  const hop = Math.sin(beat) * 14;
  const armSwing = Math.sin(beat) * 26;
  const legSwing = Math.cos(beat) * 18;

  ctx.save();
  ctx.translate(x, y + hop);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-50, -4);
  ctx.lineTo(-92, -34 - armSwing);
  ctx.moveTo(50, -4);
  ctx.lineTo(92, -34 + armSwing);
  ctx.moveTo(-25, 26);
  ctx.lineTo(-46 - legSwing, 70);
  ctx.moveTo(25, 26);
  ctx.lineTo(46 + legSwing, 70);
  ctx.stroke();

  ctx.fillStyle = "#d99b42";
  roundRect(-62, -34, 124, 68, 28);
  ctx.fill();
  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(-34, -8, 14, 5);
  ctx.fillRect(22, 10, 18, 5);

  ctx.fillStyle = "#111820";
  roundRect(-38, -16, 32, 18, 5);
  ctx.fill();
  roundRect(6, -16, 32, 18, 5);
  ctx.fill();
  ctx.strokeStyle = "#111820";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(6, -8);
  ctx.stroke();

  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 9, 16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawStartOverlay() {
  if (state.running || state.phase === "celebration") return;

  ctx.fillStyle = "rgba(255, 247, 214, 0.84)";
  roundRect(210, 150, 480, 190, 8);
  ctx.fill();
  ctx.strokeStyle = "#23313a";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#23313a";
  ctx.textAlign = "center";
  ctx.font = "800 42px Trebuchet MS";
  if (state.phase === "gameover") {
    ctx.fillText("Game Complete!", W / 2, 218);
  } else if (state.phase === "levelReady") {
    ctx.fillText(`Level ${state.pendingLevel}`, W / 2, 218);
  } else {
    ctx.fillText("Pancake Stack", W / 2, 218);
  }
  ctx.font = "700 23px Trebuchet MS";
  if (state.phase === "gameover") {
    ctx.fillText(`Final score: ${state.score}`, W / 2, 278);
    ctx.fillText("Press Start to play again.", W / 2, 314);
  } else if (state.phase === "levelReady") {
    ctx.fillText("Press Start or Space when ready.", W / 2, 278);
    ctx.fillText("New background, same pancake goal.", W / 2, 314);
  } else {
    ctx.fillText("Use arrows, A/D, touch, or the buttons.", W / 2, 268);
    ctx.fillText("Catch pancakes. Avoid socks and forks.", W / 2, 306);
  }
}

function draw(now = performance.now()) {
  drawBackground();
  if (state.phase === "celebration") {
    drawDancingPancakes(now);
  } else {
    for (const drop of state.drops) drawDrop(drop);
    drawPlate();
  }
  drawStartOverlay();
}

function loop(now) {
  if (!state.running) {
    draw(now);
    updateHud();
    state.frameId = null;
    return;
  }

  const delta = now - state.lastTick;
  state.lastTick = now;

  if (state.phase !== "celebration") {
    movePlate();
    spawnDrop(now);
    updateDrops();
  }
  updateTimer(delta);
  checkGameEnd();
  updateHud();
  draw(now);
  state.frameId = requestAnimationFrame(loop);
}

function setHeldButton(button, value) {
  heldButtons[button] = value;
}

startBtn.addEventListener("click", handleStartAction);

speedInput.addEventListener("input", updateSpeedLabel);
difficultyInput.addEventListener("input", updateDifficultyLabel);

leftBtn.addEventListener("pointerdown", () => setHeldButton("left", true));
leftBtn.addEventListener("pointerup", () => setHeldButton("left", false));
leftBtn.addEventListener("pointerleave", () => setHeldButton("left", false));
rightBtn.addEventListener("pointerdown", () => setHeldButton("right", true));
rightBtn.addEventListener("pointerup", () => setHeldButton("right", false));
rightBtn.addEventListener("pointerleave", () => setHeldButton("right", false));

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (event.key === " " || event.key === "Enter") {
    if (!state.running || state.phase === "levelReady") {
      event.preventDefault();
      handleStartAction();
    }
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scale = W / rect.width;
  plate.x = (event.clientX - rect.left) * scale;
  plate.x = Math.max(plate.width / 2, Math.min(W - plate.width / 2, plate.x));
});

updateSpeedLabel();
updateDifficultyLabel();
draw();
