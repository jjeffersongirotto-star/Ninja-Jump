// --- Screen size, scenery seeds, new run, meters <-> world coordinates ---
let resizeRetries = 0;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const de = document.documentElement || {};
  // Some WebViews report 0 before first layout: fall back to other sizes and retry
  W = window.innerWidth || de.clientWidth || (window.screen && window.screen.width) || 0;
  H = window.innerHeight || de.clientHeight || (window.screen && window.screen.height) || 0;
  if ((!window.innerWidth || !window.innerHeight) && resizeRetries < 20) {
    resizeRetries++;
    setTimeout(resize, 100);
  }
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (hillsFar.length === 0 && W > 0) seedScenery();
  try { buildCoinSprite(); } catch (e) { coinSprite = null; }
}

function seedScenery() {
  hillsFar = [];
  hillsNear = [];
  mountains = [];
  trees = [];
  cloudLayer = [];
  planets = [];

  // Far hills — wide soft mounds
  for (let i = -2; i < 14; i++) {
    hillsFar.push({
      x: i * (W * 0.35) + Math.random() * 40,
      w: W * 0.45 + Math.random() * W * 0.2,
      h: 60 + Math.random() * 50,
      phase: Math.random() * 10
    });
  }
  // Near hills
  for (let i = -2; i < 12; i++) {
    hillsNear.push({
      x: i * (W * 0.4) + Math.random() * 60,
      w: W * 0.5 + Math.random() * W * 0.15,
      h: 80 + Math.random() * 70,
      phase: Math.random() * 10
    });
  }
  // Mountains (horizon)
  for (let i = -1; i < 10; i++) {
    mountains.push({
      x: i * (W * 0.3) + Math.random() * 50,
      w: 120 + Math.random() * 180,
      h: 90 + Math.random() * 140,
      peak: 0.35 + Math.random() * 0.3
    });
  }
  // Trees
  for (let i = 0; i < 28; i++) {
    trees.push({
      x: (i / 28) * W * 3 + Math.random() * 40,
      h: 35 + Math.random() * 45,
      w: 14 + Math.random() * 10,
      layer: Math.random()
    });
  }
  // Clouds
  for (let i = 0; i < 18; i++) {
    cloudLayer.push({
      x: Math.random() * W * 2,
      y: 0.08 + Math.random() * 0.45,
      s: 28 + Math.random() * 50,
      speed: 0.15 + Math.random() * 0.35,
      layer: Math.random()
    });
  }
  // Planets for space
  for (let i = 0; i < 5; i++) {
    planets.push({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.5,
      r: 18 + Math.random() * 40,
      color: ['#c4a8ff', '#ff9ecd', '#8ec5ff', '#ffa07a', '#a0e7e5'][i % 5],
      ring: Math.random() > 0.6
    });
  }
}

function resetGame() {
  groundY = Math.round(H * GROUND_FRAC);
  // meter 0 = top of the idle hop, so hopping on the ground always reads 0 m
  const hopApex = GROUND_HOP_VY * GROUND_HOP_VY / (2 * GRAVITY_BASE * difficultyAt(0).gravityScale);
  originY = groundY - NINJA_R - hopApex;
  ninja = {
    x: W / 2,
    y: groundY - NINJA_R,   // standing on the ground; the first frame starts the idle hops
    vx: 0,
    vy: 0,
    facing: 1,
    spinning: 0,
    superSpin: false, spinAngle: 0, spinRate0: 0, spinV0: 1,
    dead: false, deathSpin: 0,
    floatT: 0, ghost: 0, still: 0, stillX: W / 2, stillY: groundY - NINJA_R, embedded: 0,
    bonks: 0, bonkedSinceLaunch: false, bonkT: 0
  };
  resetDebugStats();
  camera = { y: 0 };
  elastic = null;
  drawing = null;
  hazards = [];
  coins = [];
  particles = [];
  runCoins = 0;
  bestHeight = 0;
  maxHeightReached = 0;
  shake = 0;
  stretch = 0;
  lastThemeName = '';
  spawner = createSpawner(Math.random); // rows start at 25 m
  bounceCooldown = 0;
  shortStreak = 0;
  rings = [];
  floaters = [];
  ninjaPose.wallKick = 0;
  updateStreakHud();
  seedScenery();
  spawnAhead();
}

function worldToMeters(worldY) {
  const startY = originY || H * 0.55;
  return Math.max(0, (startY - worldY) * METERS_PER_PX);
}

function metersToWorld(m) {
  const startY = originY || H * 0.55;
  return startY - m / METERS_PER_PX;
}
