"use strict";

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#game-overlay");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const overlayButton = document.querySelector("#overlay-button");
const scoreElement = document.querySelector("#score");
const linesElement = document.querySelector("#lines");
const statusElement = document.querySelector("#status");
const pauseButton = document.querySelector("#pause-button");
const cancelButton = document.querySelector("#cancel-button");
const musicToggleButton = document.querySelector("#music-toggle");
const musicVolumeSlider = document.querySelector("#music-volume");
const musicVolumeValue = document.querySelector("#volume-value");
const musicStatus = document.querySelector("#music-status");

const COLUMNS = 10;
const ROWS = 20;
const CELL_SIZE = 30;
const SHAPES = [
  { color: "#49dbe8", matrix: [[1, 1, 1, 1]] },
  { color: "#608bff", matrix: [[1, 0, 0], [1, 1, 1]] },
  { color: "#ffad58", matrix: [[0, 0, 1], [1, 1, 1]] },
  { color: "#bb83ff", matrix: [[0, 1, 0], [1, 1, 1]] },
  { color: "#55d69a", matrix: [[0, 1, 1], [1, 1, 0]] },
  { color: "#ff6d91", matrix: [[1, 1, 0], [0, 1, 1]] },
  { color: "#f1d45c", matrix: [[1, 1], [1, 1]] }
];
const LINE_POINTS = [0, 100, 300, 500, 800];
const MUSIC_MEASURE_SECONDS = 6.4;
const MUSIC_CHORDS = [
  [130.81, 196.00, 261.63, 329.63],
  [110.00, 164.81, 220.00, 261.63],
  [87.31, 130.81, 174.61, 220.00],
  [98.00, 146.83, 196.00, 246.94]
];
const MUSIC_MELODIES = [
  [523.25, 659.25],
  [493.88, 587.33],
  [440.00, 523.25],
  [392.00, 493.88]
];

let board = createBoard();
let currentPiece = null;
let bag = [];
let score = 0;
let clearedLines = 0;
let gameState = "ready";
let lastFrameTime = 0;
let dropAccumulator = 0;
let lineClearEffects = [];
let musicEnabled = true;
let musicActive = false;
let musicGeneration = 0;
let musicChordIndex = 0;
let musicTimer = null;
let audioContext = null;
let musicBus = null;
let musicInput = null;
let delayNode = null;
let feedbackGain = null;
let wetGain = null;
const activeVoices = new Set();

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
}

function refillBag() {
  bag = SHAPES.map((_, index) => index);
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
}

function spawnPiece() {
  if (bag.length === 0) refillBag();
  const shape = SHAPES[bag.pop()];
  currentPiece = {
    color: shape.color,
    matrix: shape.matrix.map((row) => row.slice()),
    x: Math.floor((COLUMNS - shape.matrix[0].length) / 2),
    y: 0
  };

  if (hasCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
    finishGame();
  }
}

function hasCollision(matrix, offsetX, offsetY) {
  return matrix.some((row, rowIndex) => row.some((cell, columnIndex) => {
    if (!cell) return false;
    const x = offsetX + columnIndex;
    const y = offsetY + rowIndex;
    return x < 0 || x >= COLUMNS || y >= ROWS || (y >= 0 && board[y][x] !== null);
  }));
}

function movePiece(deltaX, deltaY) {
  if (!currentPiece || gameState !== "playing") return false;
  if (hasCollision(currentPiece.matrix, currentPiece.x + deltaX, currentPiece.y + deltaY)) {
    if (deltaY > 0) lockPiece();
    return false;
  }
  currentPiece.x += deltaX;
  currentPiece.y += deltaY;
  return true;
}

function rotatePiece() {
  if (!currentPiece || gameState !== "playing") return;
  const matrix = currentPiece.matrix;
  const rotated = matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex]).reverse()
  );
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!hasCollision(rotated, currentPiece.x + kick, currentPiece.y)) {
      currentPiece.matrix = rotated;
      currentPiece.x += kick;
      return;
    }
  }
}

function lockPiece() {
  currentPiece.matrix.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (!cell) return;
      const boardY = currentPiece.y + rowIndex;
      if (boardY < 0) {
        finishGame();
        return;
      }
      board[boardY][currentPiece.x + columnIndex] = currentPiece.color;
    });
  });
  if (gameState !== "playing") return;
  clearFullLines();
  spawnPiece();
  render();
}

function clearFullLines() {
  const clearedRows = [];
  board = board.filter((row, rowIndex) => {
    if (row.every((cell) => cell !== null)) {
      clearedRows.push({ row: row.slice(), rowIndex });
      return false;
    }
    return true;
  });
  while (board.length < ROWS) board.unshift(Array(COLUMNS).fill(null));
  const removed = clearedRows.length;
  if (removed > 0) {
    createLineClearEffects(clearedRows);
    score += LINE_POINTS[removed] * (Math.floor(clearedLines / 10) + 1);
    clearedLines += removed;
    updateScore();
  }
}

function createLineClearEffects(clearedRows) {
  const startedAt = performance.now();
  for (const { row, rowIndex } of clearedRows) {
    const particles = [];
    row.forEach((color, columnIndex) => {
      for (let count = 0; count < 3; count += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 105;
        particles.push({
          x: (columnIndex + 0.5) * CELL_SIZE,
          y: (rowIndex + 0.5) * CELL_SIZE,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed - 30,
          size: 1.5 + Math.random() * 2.5,
          color
        });
      }
    });
    lineClearEffects.push({ rowIndex, startedAt, duration: 720, particles });
  }
}

function hardDrop() {
  if (gameState !== "playing" || !currentPiece) return;
  let distance = 0;
  while (!hasCollision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y += 1;
    distance += 1;
  }
  score += distance * 2;
  updateScore();
  lockPiece();
}

function startGame() {
  board = createBoard();
  bag = [];
  score = 0;
  clearedLines = 0;
  lineClearEffects = [];
  gameState = "playing";
  dropAccumulator = 0;
  lastFrameTime = 0;
  updateScore();
  statusElement.textContent = "进行中";
  updateGameActions();
  overlay.hidden = true;
  spawnPiece();
  render();
  if (gameState === "playing") startMusic();
  else silenceMusic(musicEnabled ? "本局音乐已停止" : "音乐已关闭");
}

function togglePause() {
  if (gameState === "playing") {
    gameState = "paused";
    statusElement.textContent = "已暂停";
    overlayKicker.textContent = "星际时间暂停";
    overlayTitle.textContent = "游戏已暂停";
    overlayCopy.textContent = "棋盘和当前方块已保留，准备好后可以继续。";
    overlayButton.textContent = "继续游戏";
    overlay.hidden = false;
    pauseMusic();
  } else if (gameState === "paused") {
    gameState = "playing";
    statusElement.textContent = "进行中";
    overlay.hidden = true;
    lastFrameTime = 0;
    startMusic();
  } else {
    return;
  }
  updateGameActions();
  render();
}

function cancelGame() {
  if (gameState !== "playing" && gameState !== "paused") return;
  const confirmed = window.confirm("确定要结束本局并清空当前进度吗？\n选择“取消”可保留进度并继续游戏。");
  lastFrameTime = 0;
  if (!confirmed) return;

  silenceMusic(musicEnabled ? "开始游戏后播放" : "音乐已关闭");
  board = createBoard();
  currentPiece = null;
  bag = [];
  score = 0;
  clearedLines = 0;
  lineClearEffects = [];
  dropAccumulator = 0;
  gameState = "ready";
  statusElement.textContent = "待开始";
  updateScore();
  updateGameActions();
  showReadyOverlay();
  render();
}

function showReadyOverlay() {
  overlayKicker.textContent = "准备好了吗？";
  overlayTitle.textContent = "开始你的旅程";
  overlayCopy.textContent = "移动方块，填满整行，看看你能获得多少分。";
  overlayButton.textContent = "开始游戏";
  overlay.hidden = false;
}

function updateGameActions() {
  const isActive = gameState === "playing" || gameState === "paused";
  pauseButton.disabled = !isActive;
  cancelButton.disabled = !isActive;
  pauseButton.textContent = gameState === "paused" ? "继续" : "暂停";
}

function setMusicStatus(message) {
  musicStatus.textContent = message;
}

function updateMusicVolume() {
  const volume = Number(musicVolumeSlider.value);
  musicVolumeValue.textContent = `${volume}%`;
  if (musicBus && audioContext && audioContext.state !== "closed" && musicActive) {
    musicBus.gain.setTargetAtTime(volume * 0.0065, audioContext.currentTime, 0.12);
  }
}

function updateMusicToggle() {
  musicToggleButton.textContent = musicEnabled ? "背景音乐：开" : "背景音乐：关";
  musicToggleButton.setAttribute("aria-pressed", String(musicEnabled));
}

function createAudioGraph() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error("此浏览器不支持 Web Audio API");

  audioContext = new AudioContextConstructor();
  musicBus = audioContext.createGain();
  musicBus.gain.value = 0;

  const dryGain = audioContext.createGain();
  dryGain.gain.value = 0.82;
  musicInput = dryGain;
  delayNode = audioContext.createDelay(1.5);
  delayNode.delayTime.value = 0.68;
  feedbackGain = audioContext.createGain();
  feedbackGain.gain.value = 0.16;
  wetGain = audioContext.createGain();
  wetGain.gain.value = 0.24;

  dryGain.connect(musicBus);
  dryGain.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  delayNode.connect(wetGain);
  wetGain.connect(musicBus);
  musicBus.connect(audioContext.destination);
}

function playTone(frequency, startTime, duration, volume, waveform) {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const voice = { oscillator, envelope, stopTime: startTime + duration };

  oscillator.type = waveform;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(volume, startTime + Math.min(1.8, duration * 0.35));
  envelope.gain.setValueAtTime(volume, startTime + duration * 0.68);
  envelope.gain.exponentialRampToValueAtTime(0.0001, voice.stopTime);
  oscillator.connect(envelope);
  envelope.connect(musicInput);
  oscillator.onended = () => {
    activeVoices.delete(voice);
    oscillator.disconnect();
    envelope.disconnect();
  };
  activeVoices.add(voice);
  oscillator.start(startTime);
  oscillator.stop(voice.stopTime);
}

function stopActiveVoices() {
  const now = audioContext && audioContext.state !== "closed" ? audioContext.currentTime : 0;
  for (const voice of activeVoices) {
    voice.oscillator.onended = null;
    if (audioContext && audioContext.state !== "closed" && now < voice.stopTime) {
      voice.oscillator.stop(now);
    }
    voice.oscillator.disconnect();
    voice.envelope.disconnect();
  }
  activeVoices.clear();
}

function scheduleMusicMeasure() {
  const now = audioContext.currentTime;
  const chord = MUSIC_CHORDS[musicChordIndex % MUSIC_CHORDS.length];
  const melody = MUSIC_MELODIES[musicChordIndex % MUSIC_MELODIES.length];
  const chordVolumes = [0.11, 0.075, 0.06, 0.045];

  chord.forEach((frequency, index) => {
    playTone(frequency, now, MUSIC_MEASURE_SECONDS + 0.65, chordVolumes[index], "sine");
  });
  playTone(melody[0], now + 1.25, 2.8, 0.075, "sine");
  playTone(melody[1], now + 3.8, 2.4, 0.06, "sine");
  musicChordIndex += 1;
}

function failMusic(error) {
  musicGeneration += 1;
  musicActive = false;
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  stopActiveVoices();
  if (musicBus && audioContext && audioContext.state !== "closed") {
    musicBus.gain.cancelScheduledValues(audioContext.currentTime);
    musicBus.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
  }
  setMusicStatus("音频不可用");
  console.warn("背景音乐无法播放，游戏仍可继续：", error);
}

async function startMusic() {
  if (!musicEnabled || gameState !== "playing" || musicActive) return;
  musicActive = true;
  const generation = ++musicGeneration;

  try {
    if (!audioContext || audioContext.state === "closed") createAudioGraph();
    await audioContext.resume();
    if (generation !== musicGeneration || !musicEnabled || gameState !== "playing") return;

    updateMusicVolume();
    scheduleMusicMeasure();
    musicTimer = window.setInterval(() => {
      if (generation !== musicGeneration || !musicActive || gameState !== "playing") return;
      try {
        scheduleMusicMeasure();
      } catch (error) {
        failMusic(error);
      }
    }, MUSIC_MEASURE_SECONDS * 1000);
    setMusicStatus("播放中");
  } catch (error) {
    if (generation === musicGeneration) failMusic(error);
  }
}

function silenceMusic(statusMessage) {
  musicGeneration += 1;
  musicActive = false;
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  stopActiveVoices();
  if (musicBus && audioContext && audioContext.state !== "closed") {
    musicBus.gain.cancelScheduledValues(audioContext.currentTime);
    musicBus.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
  }
  if (statusMessage) setMusicStatus(statusMessage);
}

function pauseMusic() {
  silenceMusic(musicEnabled ? "已暂停" : "音乐已关闭");
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  updateMusicToggle();
  if (!musicEnabled) {
    silenceMusic("音乐已关闭");
  } else if (gameState === "playing") {
    startMusic();
  } else if (gameState === "paused") {
    setMusicStatus("继续游戏时播放");
  } else {
    setMusicStatus("开始游戏后播放");
  }
}

function handleOverlayButton() {
  if (gameState === "paused") {
    togglePause();
  } else {
    startGame();
  }
}

function finishGame() {
  gameState = "over";
  currentPiece = null;
  silenceMusic(musicEnabled ? "本局音乐已停止" : "音乐已关闭");
  statusElement.textContent = "已结束";
  updateGameActions();
  overlayKicker.textContent = "本次旅程结束";
  overlayTitle.textContent = "再来一局？";
  overlayCopy.textContent = `本局得分：${score} 分 · 消除 ${clearedLines} 行`;
  overlayButton.textContent = "重新开始";
  overlay.hidden = false;
  render();
}

function updateScore() {
  scoreElement.textContent = String(score).padStart(6, "0");
  linesElement.textContent = String(clearedLines);
}

function drawCell(x, y, color, ghost) {
  const left = x * CELL_SIZE;
  const top = y * CELL_SIZE;
  if (ghost) {
    context.fillStyle = "rgba(151, 196, 255, 0.09)";
    context.fillRect(left + 2, top + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    context.strokeStyle = "rgba(180, 214, 255, 0.38)";
    context.lineWidth = 1;
    context.strokeRect(left + 2.5, top + 2.5, CELL_SIZE - 5, CELL_SIZE - 5);
    return;
  }

  context.fillStyle = color;
  context.fillRect(left + 1.5, top + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
  context.fillStyle = "rgba(255, 255, 255, 0.2)";
  context.fillRect(left + 3, top + 3, CELL_SIZE - 6, 3);
  context.strokeStyle = "rgba(226, 245, 255, 0.3)";
  context.lineWidth = 1;
  context.strokeRect(left + 2, top + 2, CELL_SIZE - 4, CELL_SIZE - 4);
}

function drawPiece(piece, ghost) {
  piece.matrix.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const x = piece.x + columnIndex;
      const y = piece.y + rowIndex;
      if (cell && y >= 0) drawCell(x, y, piece.color, ghost);
    });
  });
}

function drawLineClearEffects(timestamp) {
  lineClearEffects = lineClearEffects.filter((effect) => timestamp - effect.startedAt < effect.duration);
  for (const effect of lineClearEffects) {
    const progress = Math.max(0, Math.min(1, (timestamp - effect.startedAt) / effect.duration));
    const rowTop = effect.rowIndex * CELL_SIZE;
    const flash = Math.sin(progress * Math.PI) * (1 - progress);
    const sweepX = progress * (canvas.width + 90) - 45;

    context.save();
    context.globalAlpha = flash * 0.75;
    context.fillStyle = "#b9f4ff";
    context.fillRect(0, rowTop + 1, canvas.width, CELL_SIZE - 2);

    const beam = context.createLinearGradient(sweepX - 45, 0, sweepX + 45, 0);
    beam.addColorStop(0, "rgba(255, 255, 255, 0)");
    beam.addColorStop(0.5, "rgba(225, 251, 255, 0.95)");
    beam.addColorStop(1, "rgba(117, 220, 255, 0)");
    context.globalAlpha = 1 - progress;
    context.fillStyle = beam;
    context.fillRect(sweepX - 45, rowTop, 90, CELL_SIZE);

    const seconds = (timestamp - effect.startedAt) / 1000;
    for (const particle of effect.particles) {
      const x = particle.x + particle.velocityX * seconds;
      const y = particle.y + particle.velocityY * seconds + 90 * seconds * seconds;
      context.globalAlpha = (1 - progress) * 0.9;
      context.fillStyle = particle.color;
      context.shadowBlur = 9;
      context.shadowColor = particle.color;
      context.fillRect(x, y, particle.size, particle.size);
    }
    context.restore();
  }
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#081322";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(131, 165, 208, 0.07)";
  context.lineWidth = 1;
  for (let column = 0; column <= COLUMNS; column += 1) {
    context.beginPath();
    context.moveTo(column * CELL_SIZE + 0.5, 0);
    context.lineTo(column * CELL_SIZE + 0.5, canvas.height);
    context.stroke();
  }
  for (let row = 0; row <= ROWS; row += 1) {
    context.beginPath();
    context.moveTo(0, row * CELL_SIZE + 0.5);
    context.lineTo(canvas.width, row * CELL_SIZE + 0.5);
    context.stroke();
  }

  board.forEach((row, rowIndex) => {
    row.forEach((color, columnIndex) => {
      if (color) drawCell(columnIndex, rowIndex, color, false);
    });
  });

  if (currentPiece && gameState === "playing") {
    let ghostY = currentPiece.y;
    while (!hasCollision(currentPiece.matrix, currentPiece.x, ghostY + 1)) ghostY += 1;
    drawPiece({ ...currentPiece, y: ghostY }, true);
    drawPiece(currentPiece, false);
  }

  drawLineClearEffects(performance.now());
}

function gameLoop(timestamp) {
  const elapsed = lastFrameTime === 0 ? 0 : timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  if (gameState === "playing") {
    dropAccumulator += elapsed;
    const dropInterval = Math.max(100, 650 - Math.floor(clearedLines / 10) * 55);
    while (dropAccumulator >= dropInterval && gameState === "playing") {
      movePiece(0, 1);
      dropAccumulator -= dropInterval;
    }
    render();
  }
  requestAnimationFrame(gameLoop);
}

function handleAction(action) {
  if (gameState !== "playing") return;
  if (action === "left") movePiece(-1, 0);
  if (action === "right") movePiece(1, 0);
  if (action === "down" && movePiece(0, 1)) {
    score += 1;
    updateScore();
  }
  if (action === "rotate") rotatePiece();
  if (action === "drop") hardDrop();
  render();
}

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }
  const actions = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    " ": "drop"
  };
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    handleAction(action);
  } else if (event.key === "Enter" && gameState !== "playing") {
    startGame();
  }
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

overlayButton.addEventListener("click", handleOverlayButton);
pauseButton.addEventListener("click", togglePause);
cancelButton.addEventListener("click", cancelGame);
musicToggleButton.addEventListener("click", toggleMusic);
musicVolumeSlider.addEventListener("input", updateMusicVolume);
document.querySelector("#restart-button").addEventListener("click", startGame);

updateMusicToggle();
updateMusicVolume();
render();
requestAnimationFrame(gameLoop);
