// --- Screen size, scenery seeds, new run, meters <-> world coordinates ---
// Responsive / scalable layout (same game on phones, tablets and computers):
// - Play column: a portrait phone uses the whole screen; wider screens (tablet in landscape, computer)
//   get a centered portrait column at most PLAY_MAX_ASPECT wide, with the sides painted in the scenery colors.
// - Scale: the game's logical height is kept between UI_MIN_H and UI_MAX_H; outside that range the whole
//   game AND the menus/HUD are scaled up or down, so a tall monitor shows the same game as a phone, just bigger.
//   W and H are always the LOGICAL size; `dpr` includes the scale (canvas pixels stay = screen pixels).
const PLAY_MAX_ASPECT = 0.66;
const UI_MIN_H = 560, UI_MAX_H = 900;
let uiScale = 1, colLeft = 0, colWidth = 0;
// Adaptive quality (keeps 60 FPS on weak phones): while playing, if frames keep arriving slower than
// QUALITY_SLOW_MS on average, the canvas resolution drops one step (sharpness first, smoothness wins).
// Never below 1 canvas pixel per CSS pixel; starts again from full quality when the page reloads.
const QUALITY_STEPS = [1, 0.8, 0.64, 0.5];
const QUALITY_SLOW_MS = 18.2;        // ~55 FPS
const QUALITY_VERY_SLOW_MS = 22;     // ~45 FPS
const QUALITY_WINDOW = 90;           // frames per measurement window (1.5 s at 60 FPS)
let qualityLevel = 0;
let resizeRetries = 0;
function resize() {
  const rawDpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const devDpr = Math.max(Math.min(rawDpr, 1), rawDpr * QUALITY_STEPS[qualityLevel]); // adaptive quality
  const de = document.documentElement || {};
  // Some WebViews report 0 before first layout: fall back to other sizes and retry
  const vw = window.innerWidth || de.clientWidth || (window.screen && window.screen.width) || 0;
  const vh = window.innerHeight || de.clientHeight || (window.screen && window.screen.height) || 0;
  if ((!window.innerWidth || !window.innerHeight) && resizeRetries < 20) {
    resizeRetries++;
    setTimeout(resize, 100);
  }
  colWidth = Math.min(vw, Math.round(vh * PLAY_MAX_ASPECT)) || vw;
  colLeft = Math.max(0, Math.floor((vw - colWidth) / 2));
  uiScale = vh > UI_MAX_H ? vh / UI_MAX_H : (vh > 0 && vh < UI_MIN_H ? vh / UI_MIN_H : 1);
  W = Math.round(colWidth / uiScale);
  H = Math.round(vh / uiScale);
  dpr = devDpr * uiScale;
  canvas.width = Math.floor(colWidth * devDpr);
  canvas.height = Math.floor(vh * devDpr);
  canvas.style.width = colWidth + 'px';
  canvas.style.height = vh + 'px';
  canvas.style.left = colLeft + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutUi();
  sideKey = '';
  refreshRotateHint();
  if (hillsFar.length === 0 && W > 0) seedScenery();
  try { buildCoinSprite(); } catch (e) { coinSprite = null; }
}

// The HTML layer (HUD, menus) follows the play column and the same scale
const uiEl = document.getElementById('ui');
function layoutUi() {
  if (!uiEl) return;
  const st = uiEl.style;
  st.left = colLeft + 'px';
  st.right = 'auto';
  st.bottom = 'auto';
  st.width = W + 'px';
  st.height = H + 'px';
  const tf = uiScale === 1 ? '' : 'scale(' + uiScale + ')';
  st.transform = tf;
  st.webkitTransform = tf;
}
// Sides of the play column (wide screens): a darker version of the current sky
let sideKey = '';
function paintSides(at) {
  if (colWidth >= (window.innerWidth || colWidth) || !at) return;
  const key = at.sky.join(',');
  if (key === sideKey) return;
  sideKey = key;
  try {
    document.body.style.background = 'linear-gradient(180deg, ' + shadeHex(at.sky[0], -0.55) + ', ' +
      shadeHex(at.sky[1], -0.6) + ' 60%, ' + shadeHex(at.sky[2], -0.65) + ')';
  } catch (e) {}
}
// Phone held sideways (short landscape screen): ask to turn it upright and pause the run
const rotateEl = document.getElementById('rotateHint');
function refreshRotateHint() {
  if (!rotateEl) return;
  const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
  const sideways = vw > vh && vh < 500 && isTouchDevice();
  if (sideways) {
    rotateEl.classList.add('active');
    if (state === 'playing' && !paused) pauseGame();
  } else rotateEl.classList.remove('active');
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
