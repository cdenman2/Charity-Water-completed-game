const dropsContainer = document.getElementById("dropsContainer");
const scoreDisplay = document.getElementById("scoreDisplay");
const levelDisplay = document.getElementById("levelDisplay");
const dirtyTankDisplay = document.getElementById("dirtyTankDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const reservoirFill = document.getElementById("reservoirFill");
const reservoirFillText = document.getElementById("reservoirFillText");
const leftDrinkFill = document.getElementById("leftDrinkFill");
const rightDrinkFill = document.getElementById("rightDrinkFill");
const messageBox = document.getElementById("messageBox");
const milestoneBox = document.getElementById("milestoneBox");
const gameOverPanel = document.getElementById("gameOverPanel");
const endPanelTitle = document.getElementById("endPanelTitle");
const endPanelMessage = document.getElementById("endPanelMessage");
const finalDifficulty = document.getElementById("finalDifficulty");
const finalLives = document.getElementById("finalLives");
const finalDirty = document.getElementById("finalDirty");
const finalScore = document.getElementById("finalScore");
const finalPurified = document.getElementById("finalPurified");
const confettiContainer = document.getElementById("confettiContainer");
const levelBanner = document.getElementById("levelBanner");
const reservoirFrame = document.getElementById("reservoirFrame");
const pipeMouth = document.querySelector(".pipe-mouth");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const desktopStartBtn = document.getElementById("desktopStartBtn");
const desktopPauseBtn = document.getElementById("desktopPauseBtn");
const desktopResetBtn = document.getElementById("desktopResetBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const easyBtn = document.getElementById("easyBtn");
const normalBtn = document.getElementById("normalBtn");
const hardBtn = document.getElementById("hardBtn");

const gameArea = document.getElementById("gameArea");

const DIRTY_CLICK_POINTS = 100;
const DIRTY_HIT_PENALTY = 200;
const TANK_FULL_BONUS = 1000;
const MAX_LEVELS_TO_WIN = 8;

const difficultyModes = {
  easy: {
    label: "Easy",
    startingLives: 5,
    maxDirty: 5,
    baseGoal: 10,
    spawnRate: 1320,
    dropSpeed: 0.72,
    pollutedChance: 0.21
  },
  normal: {
    label: "Normal",
    startingLives: 5,
    maxDirty: 5,
    baseGoal: 12,
    spawnRate: 1120,
    dropSpeed: 0.88,
    pollutedChance: 0.28
  },
  hard: {
    label: "Hard",
    startingLives: 5,
    maxDirty: 5,
    baseGoal: 14,
    spawnRate: 920,
    dropSpeed: 1.02,
    pollutedChance: 0.35
  }
};

const milestoneScores = [25, 50, 75, 100];
const milestoneMessages = {
  25: "FANTASTIC WORK! YOU ARE ONE STEP CLOSER TO SAVING A FAMILY FROM POLLUTED WATER!",
  50: "AMAZING WORK! YOU ARE NOW SAVING NUMEROUS FAMILIES AND THEY ARE BLESSED TO HAVE YOU!",
  75: "YOU ARE A NECESSITY, AS IS THE WATER THAT YOU HAVE CLEANED FOR THE COMMUNITY!",
  100: "JOB WELL DONE! YOU HAVE SAVED COUNTLESS LIVES WITH YOUR DEVOTION TO PURIFYING WATER FOR HUMAN AND WILDLIFE CONSUMPTION!"
};

let currentDifficultyKey = "easy";
let currentDifficulty = difficultyModes[currentDifficultyKey];

let score = 0;
let level = 1;
let lives = currentDifficulty.startingLives;
let dirtyInTank = 0;
let reservoirCurrent = 0;
let drinkTankProgress = 0;
let purifiedCount = 0;
let shownMilestones = [];

let running = false;
let gameOver = false;
let levelTransition = false;
let spawnIntervalId = null;
let animationFrameId = null;
let messageTimeoutId = null;
let milestoneTimeoutId = null;
let gullTimeoutId = null;
let drops = [];

let audioCtx = null;
let masterGain = null;
let oceanGain = null;
let oceanFilter = null;
let oceanSource = null;

function getLevelGoal() {
  return currentDifficulty.baseGoal + (level - 1) * 2;
}

function getSpawnRate() {
  return Math.max(560, currentDifficulty.spawnRate - (level - 1) * 18);
}

function getDropSpeed() {
  return currentDifficulty.dropSpeed + (level - 1) * 0.06;
}

function getDropStartY() {
  const mouthRect = pipeMouth.getBoundingClientRect();
  const gameRect = gameArea.getBoundingClientRect();
  return mouthRect.top - gameRect.top + 2;
}

function getReservoirCollisionY() {
  const frameRect = reservoirFrame.getBoundingClientRect();
  const gameRect = gameArea.getBoundingClientRect();
  return frameRect.top - gameRect.top;
}

function updateDisplays() {
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level;
  dirtyTankDisplay.textContent = `${dirtyInTank} / ${currentDifficulty.maxDirty}`;
  reservoirFillText.textContent = `Reservoir Fill: ${reservoirCurrent} / ${getLevelGoal()}`;

  const fillPercent = Math.min((reservoirCurrent / getLevelGoal()) * 100, 100);
  reservoirFill.style.height = `${fillPercent}%`;

  const drinkPercent = Math.min((drinkTankProgress / MAX_LEVELS_TO_WIN) * 100, 100);
  leftDrinkFill.style.height = `${drinkPercent}%`;
  rightDrinkFill.style.height = `${drinkPercent}%`;

  renderLives();
}

function renderLives() {
  livesDisplay.innerHTML = "";
  for (let i = 0; i < currentDifficulty.startingLives; i++) {
    const glass = document.createElement("div");
    glass.className = i < lives ? "glass" : "glass empty";
    livesDisplay.appendChild(glass);
  }
}

function showMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = "message-box";

  if (type === "success") messageBox.classList.add("success");
  if (type === "warning") messageBox.classList.add("warning");

  clearTimeout(messageTimeoutId);
  messageTimeoutId = setTimeout(() => {
    messageBox.textContent = "Protect the reservoir and keep polluted water out.";
    messageBox.className = "message-box";
  }, 2200);
}

function showMilestone(text) {
  milestoneBox.textContent = text;
  milestoneBox.classList.remove("hidden");

  clearTimeout(milestoneTimeoutId);
  milestoneTimeoutId = setTimeout(() => {
    milestoneBox.classList.add("hidden");
  }, 3600);
}

function checkMilestones() {
  if (milestoneScores.includes(purifiedCount) && !shownMilestones.includes(purifiedCount)) {
    shownMilestones.push(purifiedCount);
    showMilestone(milestoneMessages[purifiedCount]);
  }
}

function spawnMiniConfetti(x, y) {
  const colors = ["#ffd400", "#ff5c64", "#2fb6da", "#37c95d", "#b942ff", "#ffffff"];

  for (let i = 0; i < 18; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.setProperty("--dx", `${Math.random() * 100 - 50}px`);
    piece.style.setProperty("--dy", `${Math.random() * 100 - 18}px`);
    piece.style.setProperty("--rot", `${Math.random() * 620 - 310}deg`);
    confettiContainer.appendChild(piece);
    setTimeout(() => piece.remove(), 1800);
  }
}

function spawnBigConfetti() {
  const colors = ["#ffd400", "#ff5c64", "#2fb6da", "#37c95d", "#b942ff", "#ffffff"];

  for (let i = 0; i < 140; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = `${Math.random() * gameArea.clientWidth}px`;
    piece.style.top = `${30 + Math.random() * 130}px`;
    piece.style.setProperty("--dx", `${Math.random() * 260 - 130}px`);
    piece.style.setProperty("--dy", `${220 + Math.random() * 340}px`);
    piece.style.setProperty("--rot", `${Math.random() * 960 - 480}deg`);
    piece.style.width = `${8 + Math.random() * 6}px`;
    piece.style.height = `${12 + Math.random() * 8}px`;
    confettiContainer.appendChild(piece);
    setTimeout(() => piece.remove(), 1800);
  }
}

function showLevelBanner(text = "LEVEL CLEARED!") {
  levelBanner.textContent = text;
  levelBanner.classList.remove("hidden");
}

function hideLevelBanner() {
  levelBanner.classList.add("hidden");
}

function clearDrops() {
  drops.forEach((drop) => {
    if (drop.element && drop.element.parentNode) {
      drop.element.remove();
    }
  });
  drops = [];
}

function setDifficulty(modeKey) {
  if (running || levelTransition) return;

  currentDifficultyKey = modeKey;
  currentDifficulty = difficultyModes[currentDifficultyKey];

  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === modeKey);
  });

  score = 0;
  level = 1;
  lives = currentDifficulty.startingLives;
  dirtyInTank = 0;
  reservoirCurrent = 0;
  drinkTankProgress = 0;
  purifiedCount = 0;
  shownMilestones = [];

  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);
  clearDrops();
  confettiContainer.innerHTML = "";

  gameOver = false;
  running = false;
  levelTransition = false;

  hideLevelBanner();
  milestoneBox.classList.add("hidden");
  gameOverPanel.classList.add("hidden");
  pauseAmbientSound();

  updateDisplays();
  showMessage(`${currentDifficulty.label} mode selected. Press START to begin.`, "success");
}

function createDrop() {
  if (!running || gameOver || levelTransition) return;

  const drop = document.createElement("div");
  const polluted = Math.random() < currentDifficulty.pollutedChance;

  drop.className = polluted ? "drop polluted-drop clickable" : "drop clean-drop";

  const shape = document.createElement("div");
  shape.className = "drop-shape";
  drop.appendChild(shape);

  const gameWidth = gameArea.clientWidth;
  const laneWidth = Math.min(gameWidth * 0.52, 680);
  const laneLeft = (gameWidth - laneWidth) / 2;
  const startX = laneLeft + Math.random() * Math.max(laneWidth - 42, 20);
  const startY = getDropStartY();

  drop.style.left = `${startX}px`;
  drop.style.top = `${startY}px`;
  dropsContainer.appendChild(drop);

  const dropData = {
    element: drop,
    polluted,
    x: startX,
    y: startY,
    speed: getDropSpeed(),
    handled: false
  };

  if (polluted) {
    drop.addEventListener("click", () => {
      if (!running || dropData.handled || !drops.includes(dropData)) return;

      dropData.handled = true;
      playSplashSound();

      const confettiX = dropData.x + 20;
      const confettiY = dropData.y + 18;
      spawnMiniConfetti(confettiX, confettiY);

      drop.remove();
      drops = drops.filter((d) => d !== dropData);

      score += DIRTY_CLICK_POINTS;
      purifiedCount += 1;
      checkMilestones();

      updateDisplays();
      showMessage("Fantastic work! You purified a polluted drop.", "success");
    });
  }

  drops.push(dropData);
}

function handleDropReachedReservoir(dropData) {
  if (dropData.handled) return;
  dropData.handled = true;

  dropData.element.remove();
  drops = drops.filter((d) => d !== dropData);

  if (dropData.polluted) {
    dirtyInTank += 1;
    lives -= 1;
    score -= DIRTY_HIT_PENALTY;

    if (score < 0) score = 0;
    if (lives < 0) lives = 0;

    updateDisplays();
    playMissSound();
    showMessage("Polluted water entered the reservoir. Stop the next one.", "warning");

    if (dirtyInTank >= currentDifficulty.maxDirty || lives <= 0) {
      endGame(false);
    }
  } else {
    reservoirCurrent += 1;
    playCollectSound();
    updateDisplays();

    if (reservoirCurrent >= getLevelGoal()) {
      completeLevel();
    }
  }
}

function animateDrops() {
  if (!running || gameOver || levelTransition) return;

  const collisionY = getReservoirCollisionY();

  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    drop.y += drop.speed;
    drop.element.style.top = `${drop.y}px`;

    if (drop.y + drop.element.offsetHeight >= collisionY) {
      handleDropReachedReservoir(drop);
    }
  }

  animationFrameId = requestAnimationFrame(animateDrops);
}

function completeLevel() {
  running = false;
  levelTransition = true;

  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);
  clearDrops();

  spawnBigConfetti();
  playBigSplashSound();
  playWinSound();
  drinkTankProgress += 1;

  if (drinkTankProgress >= MAX_LEVELS_TO_WIN) {
    updateDisplays();
    showLevelBanner("MISSION COMPLETE!");
    showMessage("You completed the full clean water mission.", "success");

    setTimeout(() => {
      hideLevelBanner();
      endGame(true);
    }, 2200);

    return;
  }

  showLevelBanner(`LEVEL ${level} CLEARED!`);

  if (drinkTankProgress === MAX_LEVELS_TO_WIN - 1) {
    showMessage("One more level will complete the mission!", "success");
  } else if (drinkTankProgress > 0) {
    showMessage(`Level ${level} cleared! Side tanks filled ${drinkTankProgress}/8.`, "success");
  }

  setTimeout(() => {
    hideLevelBanner();
    reservoirCurrent = 0;
    dirtyInTank = 0;
    level += 1;
    updateDisplays();

    levelTransition = false;
    running = true;
    spawnIntervalId = setInterval(createDrop, getSpawnRate());
    animateDrops();
  }, 1800);
}

async function startGame() {
  if (running || gameOver || levelTransition) return;

  initializeAudio();

  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  resumeAmbientSound();

  running = true;
  showMessage(
    `${currentDifficulty.label} mode started. Catch the green polluted drops before they enter the reservoir.`
  );

  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);

  spawnIntervalId = setInterval(createDrop, getSpawnRate());
  animateDrops();
}

function pauseGame() {
  if (!running) return;

  running = false;
  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);
  pauseAmbientSound();
  showMessage("Game paused.");
}

function resetGame(showResetMessage = true) {
  running = false;
  gameOver = false;
  levelTransition = false;

  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);

  clearDrops();
  confettiContainer.innerHTML = "";

  currentDifficulty = difficultyModes[currentDifficultyKey];

  score = 0;
  level = 1;
  lives = currentDifficulty.startingLives;
  dirtyInTank = 0;
  reservoirCurrent = 0;
  drinkTankProgress = 0;
  purifiedCount = 0;
  shownMilestones = [];

  hideLevelBanner();
  milestoneBox.classList.add("hidden");
  gameOverPanel.classList.add("hidden");
  pauseAmbientSound();

  updateDisplays();

  if (showResetMessage) {
    showMessage(`Game reset. ${currentDifficulty.label} mode is ready. Press START.`, "success");
  }
}

function endGame(wonGame) {
  running = false;
  gameOver = true;

  clearInterval(spawnIntervalId);
  cancelAnimationFrame(animationFrameId);
  clearDrops();
  pauseAmbientSound();

  finalDifficulty.textContent = currentDifficulty.label;
  finalLives.textContent = lives;
  finalDirty.textContent = dirtyInTank;
  finalScore.textContent = score;
  finalPurified.textContent = purifiedCount;

  if (wonGame) {
    endPanelTitle.textContent = "YOU WON!";
    endPanelMessage.textContent =
      "JOB WELL DONE! YOU HAVE SAVED COUNTLESS LIVES WITH YOUR DEVOTION TO PURIFYING WATER FOR HUMAN AND WILDLIFE CONSUMPTION!";
    gameOverPanel.querySelector(".game-over-card").style.borderColor = "#32d061";
    score += TANK_FULL_BONUS;
    finalScore.textContent = score;
  } else {
    endPanelTitle.textContent = "GAME OVER";
    endPanelMessage.textContent = "Too much pollution reached the reservoir.";
    gameOverPanel.querySelector(".game-over-card").style.borderColor = "#ff5b64";
  }

  gameOverPanel.classList.remove("hidden");
}

function initializeAudio() {
  if (audioCtx) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioCtx = new AudioContextClass();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.95;
  masterGain.connect(audioCtx.destination);

  oceanGain = audioCtx.createGain();
  oceanGain.gain.value = 0.0;

  oceanFilter = audioCtx.createBiquadFilter();
  oceanFilter.type = "lowpass";
  oceanFilter.frequency.value = 700;
  oceanFilter.Q.value = 0.3;

  const bufferSize = audioCtx.sampleRate * 3;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.55;
  }

  oceanSource = audioCtx.createBufferSource();
  oceanSource.buffer = noiseBuffer;
  oceanSource.loop = true;

  oceanSource.connect(oceanFilter);
  oceanFilter.connect(oceanGain);
  oceanGain.connect(masterGain);

  oceanSource.start(0);
}

function resumeAmbientSound() {
  if (!audioCtx || !oceanGain) return;

  oceanGain.gain.cancelScheduledValues(audioCtx.currentTime);
  oceanGain.gain.setValueAtTime(oceanGain.gain.value, audioCtx.currentTime);
  oceanGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.25);

  scheduleSeagull();
}

function pauseAmbientSound() {
  if (gullTimeoutId) {
    clearTimeout(gullTimeoutId);
    gullTimeoutId = null;
  }

  if (!audioCtx || !oceanGain) return;

  oceanGain.gain.cancelScheduledValues(audioCtx.currentTime);
  oceanGain.gain.setValueAtTime(oceanGain.gain.value, audioCtx.currentTime);
  oceanGain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.2);
}

function scheduleSeagull() {
  if (!running || !audioCtx) return;

  const delay = 2800 + Math.random() * 4200;
  gullTimeoutId = setTimeout(() => {
    if (running) {
      playSeagullSound();
      scheduleSeagull();
    }
  }, delay);
}

function playTone(type, frequency, duration, volume, secondFrequency = null) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  if (secondFrequency !== null) {
    osc.frequency.linearRampToValueAtTime(secondFrequency, now + duration);
  }

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + duration);
}

function playSeagullSound() {
  if (!audioCtx) return;

  playTone("sine", 980, 0.14, 0.025, 1320);
  setTimeout(() => playTone("sine", 1240, 0.12, 0.022, 900), 90);
  setTimeout(() => playTone("sine", 880, 0.15, 0.02, 1280), 180);
}

function playSplashSound() {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  const noiseBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.35), audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 650;
  bandpass.Q.value = 0.75;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.24, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.33);

  noiseSource.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(masterGain);

  noiseSource.start(audioCtx.currentTime);
  noiseSource.stop(audioCtx.currentTime + 0.35);

  playTone("triangle", 420, 0.18, 0.05, 150);
}

function playBigSplashSound() {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  const noiseBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.7), audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;

  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 900;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.42, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

  source.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(masterGain);

  source.start(now);
  source.stop(now + 0.7);

  playTone("triangle", 210, 0.22, 0.08, 120);
  setTimeout(() => playTone("sine", 340, 0.18, 0.05, 180), 60);
}

function playCollectSound() {
  if (!audioCtx) return;
  playTone("sine", 740, 0.1, 0.05, 980);
}

function playMissSound() {
  if (!audioCtx) return;
  playTone("square", 220, 0.22, 0.04, 140);
}

function playWinSound() {
  if (!audioCtx) return;
  playTone("triangle", 660, 0.16, 0.07, 990);
  setTimeout(() => playTone("triangle", 880, 0.18, 0.07, 1320), 140);
  setTimeout(() => playTone("triangle", 1100, 0.24, 0.08, 1540), 280);
}

function bindButton(button, handler) {
  if (!button) return;
  button.addEventListener("click", handler);
}

bindButton(startBtn, startGame);
bindButton(pauseBtn, pauseGame);
bindButton(resetBtn, resetGame);
bindButton(desktopStartBtn, startGame);
bindButton(desktopPauseBtn, pauseGame);
bindButton(desktopResetBtn, resetGame);
bindButton(playAgainBtn, resetGame);

bindButton(easyBtn, () => setDifficulty("easy"));
bindButton(normalBtn, () => setDifficulty("normal"));
bindButton(hardBtn, () => setDifficulty("hard"));

window.addEventListener("resize", () => {
  updateDisplays();
});

setDifficulty("easy");
showMessage("Select a difficulty, then press START to protect the reservoir.");
