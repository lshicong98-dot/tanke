const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const enemiesEl = document.getElementById("enemies");
const levelEl = document.getElementById("level");
const bulletCountEl = document.getElementById("bulletCount");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartBtn = document.getElementById("restartBtn");
const rotateHint = document.getElementById("rotateHint");

const WORLD = {
  w: canvas.width,
  h: canvas.height,
  tile: 30,
};

const DIRS = {
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  down: { x: 0, y: 1, angle: Math.PI / 2 },
  left: { x: -1, y: 0, angle: Math.PI },
  right: { x: 1, y: 0, angle: 0 },
};

const ENEMY_TYPES = {
  light: { size: 24, speedBase: 150, speedRange: 30, hp: 1, fireBase: 500, fireRange: 200, score: 80, color: "#ef5350", barrel: "#ffcdd2", label: "轻坦" },
  heavy: { size: 32, speedBase: 60, speedRange: 20, hp: 3, fireBase: 800, fireRange: 400, score: 150, color: "#8d6e63", barrel: "#d7ccc8", label: "重坦" },
  boss:  { size: 40, speedBase: 40, speedRange: 15, hp: 8, fireBase: 400, fireRange: 300, score: 500, color: "#6a1b9a", barrel: "#ce93d8", label: "Boss" },
};

const LEVEL_CONFIG = [
  null, // 索引 0 不用
  {
    // 第1关 - 简单
    enemiesToWin: 10,
    spawnInterval: 2000,
    maxEnemies: 4,
    lightChance: 1.0,
    heavyChance: 0,
    bossChance: 0,
    playerSpeed: 220,
    enemySpeedMul: 0.8,
  },
  {
    // 第2关 - 中等
    enemiesToWin: 15,
    spawnInterval: 1600,
    maxEnemies: 5,
    lightChance: 0.7,
    heavyChance: 0.3,
    bossChance: 0,
    playerSpeed: 230,
    enemySpeedMul: 1.0,
  },
  {
    // 第3关 - 较难
    enemiesToWin: 20,
    spawnInterval: 1300,
    maxEnemies: 6,
    lightChance: 0.45,
    heavyChance: 0.45,
    bossChance: 0.10,
    playerSpeed: 240,
    enemySpeedMul: 1.1,
  },
  {
    // 第4关 - 困难
    enemiesToWin: 25,
    spawnInterval: 1000,
    maxEnemies: 7,
    lightChance: 0.25,
    heavyChance: 0.55,
    bossChance: 0.20,
    playerSpeed: 250,
    enemySpeedMul: 1.2,
  },
  {
    // 第5关 - 终极
    enemiesToWin: 30,
    spawnInterval: 700,
    maxEnemies: 8,
    lightChance: 0.1,
    heavyChance: 0.6,
    bossChance: 0.30,
    playerSpeed: 260,
    enemySpeedMul: 1.35,
  },
];

const keys = new Set();
let gameOver = false;
let score = 0;
let lives = 3;
let level = 1;
let enemiesDefeated = 0;
let enemiesToWin = 30;
let spawnTimer = 0;
let enemySpawnInterval = 1800;
let lastTime = 0;
let bossActive = false;

const walls = [];
const bullets = [];
const enemies = [];
const explosions = [];
const powerUps = [];

const base = {
  x: WORLD.w / 2,
  y: WORLD.h - 28,
  w: 70,
  h: 34,
  hp: 5,
  maxHp: 5,
};

const player = {
  x: WORLD.w / 2,
  y: WORLD.h - 70,
  size: 28,
  speed: 220,
  dir: "up",
  cooldown: 0,
  fireRate: 260,
  invincible: 0,
  bulletCount: 1,
};

function resetGame() {
  gameOver = false;
  score = 0;
  lives = 3;
  level = 1;
  enemiesDefeated = 0;
  bossActive = false;
  spawnTimer = 0;
  bullets.length = 0;
  enemies.length = 0;
  explosions.length = 0;
  powerUps.length = 0;
  walls.length = 0;

  player.x = WORLD.w / 2;
  player.y = WORLD.h - 70;
  player.dir = "up";
  player.cooldown = 0;
  player.invincible = 1200;
  player.fireRate = 260;
  player.bulletCount = 1;

  base.hp = base.maxHp;

  applyLevelConfig();
  buildWalls();
  updateHud();
  hideOverlay();
}

function applyLevelConfig() {
  const cfg = LEVEL_CONFIG[level];
  enemiesToWin = cfg.enemiesToWin;
  enemySpawnInterval = cfg.spawnInterval;
  player.speed = cfg.playerSpeed;
}

function buildWalls() {
  const T = 30;
  const COLS = 30;
  const ROWS = 20;

  // 0=空 1=砖墙 2=钢墙
  const maps = {
    1: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    2: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    3: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    4: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,0,0],
      [0,0,1,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
      [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    5: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,2,2,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,2,2,0,0],
      [0,0,2,2,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,2,2,0,0],
      [0,0,0,0,0,0,1,1,0,0,0,0,2,2,0,0,2,2,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,0,0,0,0,2,2,0,0,2,2,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
      [0,0,1,1,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
  };

  const map = maps[level] || maps[1];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = map[r][c];
      if (cell === 0) continue;
      walls.push({
        x: c * T + T / 2,
        y: r * T + T / 2,
        w: T - 2,
        h: T - 2,
        kind: cell === 2 ? "steel" : "brick",
        hp: cell === 2 ? 999 : 2,
      });
    }
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  enemiesEl.textContent = String(enemies.length);
  if (bulletCountEl) {
    bulletCountEl.textContent = String(player.bulletCount);
  }
  if (levelEl) {
    levelEl.textContent = `${level} (${enemiesDefeated}/${enemiesToWin})`;
  }
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function pickEnemyType() {
  const cfg = LEVEL_CONFIG[level];
  const roll = Math.random();
  if (roll < cfg.bossChance && !bossActive) return "boss";
  if (roll < cfg.bossChance + cfg.heavyChance) return "heavy";
  return "light";
}

function spawnEnemy() {
  const x = 40 + Math.random() * (WORLD.w - 80);
  const dir = Math.random() > 0.5 ? "down" : "left";
  const type = pickEnemyType();
  const t = ENEMY_TYPES[type];
  if (type === "boss") bossActive = true;

  const speedMul = LEVEL_CONFIG[level].enemySpeedMul;

  enemies.push({
    x,
    y: 40,
    size: t.size,
    speed: (t.speedBase + Math.random() * t.speedRange) * speedMul,
    dir,
    cooldown: t.fireBase + Math.random() * t.fireRange,
    turnTimer: 400 + Math.random() * 900,
    type,
    hp: t.hp,
    maxHp: t.hp,
  });
}

function maybeDropPowerUp(x, y) {
  if (Math.random() > 0.2) return;
  const types = ["repair", "rapid", "shield"];
  const type = types[(Math.random() * types.length) | 0];
  powerUps.push({
    x,
    y,
    r: 10,
    type,
    life: 9000,
  });
}

function shoot(owner, x, y, dir, speed) {
  const count = owner === "player" ? player.bulletCount : 1;
  const spreadAngle = 0.12; // 约 7 度
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
    const angle = DIRS[dir].angle + offset * spreadAngle;
    bullets.push({
      owner,
      x,
      y,
      r: 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1800,
    });
  }
}

function rectHit(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}

function tankRect(tank) {
  return { x: tank.x, y: tank.y, w: tank.size, h: tank.size };
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.has("ArrowUp") || keys.has("w")) {
    dy -= 1;
    player.dir = "up";
  }
  if (keys.has("ArrowDown") || keys.has("s")) {
    dy += 1;
    player.dir = "down";
  }
  if (keys.has("ArrowLeft") || keys.has("a")) {
    dx -= 1;
    player.dir = "left";
  }
  if (keys.has("ArrowRight") || keys.has("d")) {
    dx += 1;
    player.dir = "right";
  }

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  const next = {
    x: player.x + dx * player.speed * dt,
    y: player.y + dy * player.speed * dt,
    w: player.size,
    h: player.size,
  };

  next.x = Math.max(player.size / 2, Math.min(WORLD.w - player.size / 2, next.x));
  next.y = Math.max(player.size / 2, Math.min(WORLD.h - player.size / 2, next.y));

  const blocked = walls.some((w) => rectHit(next, { x: w.x, y: w.y, w: w.w, h: w.h }));
  if (!blocked) {
    player.x = next.x;
    player.y = next.y;
  }

  player.cooldown -= dt * 1000;
  player.invincible -= dt * 1000;

  if (keys.has(" ") && player.cooldown <= 0) {
    player.cooldown = player.fireRate;
    shoot("player", player.x, player.y, player.dir, 420);
  }
}

function moveEnemies(dt) {
  for (const enemy of enemies) {
    enemy.turnTimer -= dt * 1000;
    enemy.cooldown -= dt * 1000;

    if (enemy.turnTimer <= 0) {
      const options = ["up", "down", "left", "right"];
      enemy.dir = options[(Math.random() * options.length) | 0];
      enemy.turnTimer = 500 + Math.random() * 1200;
    }

    const nx = enemy.x + DIRS[enemy.dir].x * enemy.speed * dt;
    const ny = enemy.y + DIRS[enemy.dir].y * enemy.speed * dt;
    const next = { x: nx, y: ny, w: enemy.size, h: enemy.size };

    const out =
      nx < enemy.size / 2 ||
      nx > WORLD.w - enemy.size / 2 ||
      ny < enemy.size / 2 ||
      ny > WORLD.h - enemy.size / 2;

    const blocked = walls.some((w) => rectHit(next, { x: w.x, y: w.y, w: w.w, h: w.h }));
    const enemyBlocked = enemies.some((other) => {
      if (other === enemy) return false;
      return rectHit(next, { x: other.x, y: other.y, w: other.size, h: other.size });
    });

    if (out || blocked) {
      const options = ["up", "down", "left", "right"].filter((d) => d !== enemy.dir);
      enemy.dir = options[(Math.random() * options.length) | 0];
    } else if (enemyBlocked) {
      // 被敌人挡住时换方向，但给冷却防止疯狂乱窜
      const options = ["up", "down", "left", "right"];
      enemy.dir = options[(Math.random() * options.length) | 0];
      enemy.turnTimer = 300 + Math.random() * 400;
    } else {
      enemy.x = nx;
      enemy.y = ny;
    }

    if (enemy.cooldown <= 0) {
      enemy.cooldown = 700 + Math.random() * 900;
      shoot("enemy", enemy.x, enemy.y, enemy.dir, 300);
    }
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    if (!b) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt * 1000;

    if (b.life <= 0 || b.x < 0 || b.x > WORLD.w || b.y < 0 || b.y > WORLD.h) {
      bullets.splice(i, 1);
      continue;
    }

    let hitWall = false;
    for (let wi = walls.length - 1; wi >= 0; wi -= 1) {
      const w = walls[wi];
      if (
        b.x > w.x - w.w / 2 &&
        b.x < w.x + w.w / 2 &&
        b.y > w.y - w.h / 2 &&
        b.y < w.y + w.h / 2
      ) {
        if (w.kind !== "steel") {
          w.hp -= 1;
          if (w.hp <= 0) {
            walls.splice(wi, 1);
          }
        }
        bullets.splice(i, 1);
        hitWall = true;
        break;
      }
    }
    if (hitWall) continue;

    if (b.owner === "player") {
      for (let ei = enemies.length - 1; ei >= 0; ei -= 1) {
        const e = enemies[ei];
        if (
          b.x > e.x - e.size / 2 &&
          b.x < e.x + e.size / 2 &&
          b.y > e.y - e.size / 2 &&
          b.y < e.y + e.size / 2
        ) {
          e.hp -= 1;
          if (e.hp <= 0) {
            enemies.splice(ei, 1);
            if (e.type === "boss") bossActive = false;
            const exMax = e.type === "boss" ? 500 : e.type === "heavy" ? 380 : 320;
            explosions.push({ x: e.x, y: e.y, t: 0, max: exMax });
            if (e.type !== "boss") maybeDropPowerUp(e.x, e.y);
            const tInfo = ENEMY_TYPES[e.type] || ENEMY_TYPES.light;
            score += tInfo.score;
            enemiesDefeated += 1;
            if (enemiesDefeated >= enemiesToWin) {
              if (level >= 5) {
                gameOver = true;
                showOverlay("🎉 恭喜通关", `你征服了全部 5 关！最终得分: ${score}`);
              } else {
                advanceLevel();
                break;
              }
            }
            updateHud();
          }
          bullets.splice(i, 1);
          break;
        }
      }
    } else if (player.invincible <= 0) {
      if (
        b.x > player.x - player.size / 2 &&
        b.x < player.x + player.size / 2 &&
        b.y > player.y - player.size / 2 &&
        b.y < player.y + player.size / 2
      ) {
        bullets.splice(i, 1);
        explosions.push({ x: player.x, y: player.y, t: 0, max: 420 });
        lives -= 1;
        player.bulletCount = 1;
        player.invincible = 1800;
        player.x = WORLD.w / 2;
        player.y = WORLD.h - 70;
        updateHud();

        if (lives <= 0) {
          gameOver = true;
          showOverlay("游戏结束", `最终得分: ${score}`);
        }
      }
    }

    if (b.owner === "enemy") {
      if (
        b.x > base.x - base.w / 2 &&
        b.x < base.x + base.w / 2 &&
        b.y > base.y - base.h / 2 &&
        b.y < base.y + base.h / 2
      ) {
        bullets.splice(i, 1);
        base.hp -= 1;
        explosions.push({ x: b.x, y: b.y, t: 0, max: 260 });
        updateHud();
        if (base.hp <= 0) {
          gameOver = true;
          showOverlay("基地被摧毁", `最终得分: ${score}`);
        }
      }
    }
  }

  // 子弹对冲：玩家子弹与敌方子弹相撞时抵消
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    for (let j = i - 1; j >= 0; j -= 1) {
      const a = bullets[i];
      const b = bullets[j];
      if (!a || !b || a.owner === b.owner) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.r + b.r) {
        explosions.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0, max: 200 });
        bullets.splice(i, 1);
        bullets.splice(j, 1);
        i -= 1; // 跳过已删除的两个元素
        break;
      }
    }
  }
}

function updatePowerUps(dt) {
  for (let i = powerUps.length - 1; i >= 0; i -= 1) {
    const p = powerUps[i];
    p.life -= dt * 1000;
    if (p.life <= 0) {
      powerUps.splice(i, 1);
      continue;
    }

    const hitPlayer =
      p.x > player.x - player.size / 2 &&
      p.x < player.x + player.size / 2 &&
      p.y > player.y - player.size / 2 &&
      p.y < player.y + player.size / 2;

    if (hitPlayer) {
      if (p.type === "repair") {
        lives += 1;
      } else if (p.type === "rapid") {
        player.bulletCount += 1;
      } else if (p.type === "shield") {
        player.invincible = Math.max(player.invincible, 2600);
      }
      score += 50;
      powerUps.splice(i, 1);
      updateHud();
    }
  }
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    explosions[i].t += dt * 1000;
    if (explosions[i].t >= explosions[i].max) {
      explosions.splice(i, 1);
    }
  }
}

function drawTank(tank, color, barrelColor) {
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(DIRS[tank.dir].angle);

  ctx.fillStyle = color;
  ctx.fillRect(-tank.size / 2, -tank.size / 2, tank.size, tank.size);

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-tank.size / 2 - 4, -tank.size / 2, 4, tank.size);
  ctx.fillRect(tank.size / 2, -tank.size / 2, 4, tank.size);

  ctx.fillStyle = barrelColor;
  ctx.fillRect(0, -4, tank.size / 2 + 10, 8);

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.w; x += WORLD.tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.h);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.h; y += WORLD.tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.w, y);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);

  const bg = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  bg.addColorStop(0, "#2f4f2f");
  bg.addColorStop(1, "#1f3520");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  drawGrid();

  ctx.fillStyle = base.hp > 2 ? "#90caf9" : "#ef9a9a";
  ctx.fillRect(base.x - base.w / 2, base.y - base.h / 2, base.w, base.h);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeRect(base.x - base.w / 2, base.y - base.h / 2, base.w, base.h);
  ctx.fillStyle = "#0d1b2a";
  ctx.fillRect(base.x - 20, base.y - 6, 40, 12);

  for (const w of walls) {
    if (w.kind === "steel") {
      ctx.fillStyle = "#90a4ae";
      ctx.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
    } else {
      ctx.fillStyle = w.hp === 2 ? "#8d6e63" : "#a1887f";
      ctx.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
    }
  }

  for (const b of bullets) {
    ctx.fillStyle = b.owner === "player" ? "#ffe066" : "#ff8a80";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of powerUps) {
    if (p.type === "repair") ctx.fillStyle = "#81c784";
    if (p.type === "rapid") ctx.fillStyle = "#ffd54f";
    if (p.type === "shield") ctx.fillStyle = "#4fc3f7";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of enemies) {
    const tInfo = ENEMY_TYPES[e.type] || ENEMY_TYPES.light;
    drawTank(e, tInfo.color, tInfo.barrel);
  }

  if (player.invincible > 0) {
    ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 80) * 0.2;
  }
  drawTank(player, "#42a5f5", "#bbdefb");
  ctx.globalAlpha = 1;

  for (const ex of explosions) {
    const p = ex.t / ex.max;
    const radius = 8 + p * 28;
    ctx.fillStyle = `rgba(255, ${180 - p * 120}, 0, ${1 - p})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function advanceLevel() {
  level += 1;
  lives += 2; // 每关奖励两条命
  enemiesDefeated = 0;
  bossActive = false;
  spawnTimer = 0;
  bullets.length = 0;
  enemies.length = 0;
  explosions.length = 0;
  powerUps.length = 0;
  walls.length = 0;

  player.x = WORLD.w / 2;
  player.y = WORLD.h - 70;
  player.dir = "up";
  player.cooldown = 0;
  player.invincible = 1200;

  base.hp = base.maxHp;

  applyLevelConfig();
  buildWalls();
  updateHud();
}

function tick(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0);
  lastTime = ts;

  if (!gameOver) {
    movePlayer(dt);
    moveEnemies(dt);
    updateBullets(dt);
    updatePowerUps(dt);
    updateExplosions(dt);

    // 敌人碰撞伤害
    if (player.invincible <= 0) {
      for (let ei = enemies.length - 1; ei >= 0; ei -= 1) {
        const enemy = enemies[ei];
        if (rectHit(tankRect(player), tankRect(enemy))) {
          // 玩家受伤
          explosions.push({ x: player.x, y: player.y, t: 0, max: 420 });
          lives -= 1;
          player.bulletCount = 1;
          player.invincible = 1800;
          player.x = WORLD.w / 2;
          player.y = WORLD.h - 70;
          updateHud();
          if (lives <= 0) {
            gameOver = true;
            showOverlay("游戏结束", `最终得分: ${score}`);
            break;
          }
          // 敌人也死亡
          const exMax = enemy.type === "boss" ? 500 : enemy.type === "heavy" ? 380 : 320;
          explosions.push({ x: enemy.x, y: enemy.y, t: 0, max: exMax });
          if (enemy.type !== "boss") maybeDropPowerUp(enemy.x, enemy.y);
          const tInfo = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.light;
          score += tInfo.score;
          enemiesDefeated += 1;
          if (enemy.type === "boss") bossActive = false;
          enemies.splice(ei, 1);
          if (enemiesDefeated >= enemiesToWin) {
            if (level >= 5) {
              gameOver = true;
              showOverlay("🎉 恭喜通关", `你征服了全部 5 关！最终得分: ${score}`);
            } else {
              advanceLevel();
            }
          }
          updateHud();
          break;
        }
      }
    }

    spawnTimer += dt * 1000;
    if (spawnTimer >= enemySpawnInterval) {
      spawnTimer = 0;
      if (enemies.length < LEVEL_CONFIG[level].maxEnemies) {
        spawnEnemy();
        updateHud();
      }
    }
  }

  render();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }

  if (key === "r") {
    resetGame();
    return;
  }

  keys.add(key);
});

window.addEventListener("keyup", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.delete(key);
});

// ── 虚拟按键（触摸 / 鼠标） ──
(function setupVirtualControls() {
  const map = {
    ArrowUp: "w",
    ArrowDown: "s",
    ArrowLeft: "a",
    ArrowRight: "d",
    " ": " ",
  };

  const holdTimers = {};

  function press(key) {
    if (holdTimers[key]) clearTimeout(holdTimers[key]);
    keys.add(key);
  }
  function release(key) {
    // 保持至少 200ms，让游戏循环能检测到
    holdTimers[key] = setTimeout(() => {
      keys.delete(key);
      delete holdTimers[key];
    }, 200);
  }

  document.querySelectorAll(".ctrl-btn").forEach((btn) => {
    const raw = btn.dataset.key || "";
    const mapped = map[raw] || raw;

    const start = (e) => {
      e.preventDefault();
      btn.classList.add("pressed");
      press(mapped);
    };
    const end = (e) => {
      e.preventDefault();
      btn.classList.remove("pressed");
      release(mapped);
    };

    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointercancel", end);
    btn.addEventListener("pointerleave", end);
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", end);
    btn.addEventListener("touchstart", start, { passive: false });
    btn.addEventListener("touchend", end);
    btn.addEventListener("touchcancel", end);
  });
})();

// ── 防止移动端页面滚动/缩放 ──
document.addEventListener("touchmove", (e) => {
  if (e.target === canvas || e.target.closest(".game-wrap") || e.target.closest(".controls")) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener("gesturestart", (e) => {
  if (e.target === canvas || e.target.closest(".game-wrap")) {
    e.preventDefault();
  }
});

// ── 移动端竖屏提示横屏游玩（用宽高比判断，避免 orientation 误判） ──
(function setupRotateHint() {
  if (!rotateHint) return;

  const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (!isTouchDevice) {
    rotateHint.classList.add("hidden");
    return;
  }

  const updateRotateHint = () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    rotateHint.classList.toggle("hidden", isLandscape);
  };

  updateRotateHint();
  window.addEventListener("resize", updateRotateHint);
  window.addEventListener("orientationchange", updateRotateHint);
})();

restartBtn.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(tick);
