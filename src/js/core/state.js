// --- Game state (shared by every file) ---
let state = 'menu';
let ninja, camera, elastic, drawing;
let hazards = [], coins = [], particles = [];
let powerups = [];     // power-up items in the world (see world/powerups.js)
let runCoins = 0, bestHeight = 0, maxHeightReached = 0;
let shake = 0, stretch = 0, stretchDir = 0;
let lastThemeName = '';
let spawner = null;    // hazard/coin row generator (see createSpawner)
let hazardsOn = true;
let bounceCooldown = 0;
let frame = 0;
let lastTime = 0;
let atmosCache = null;
let shortStreak = 0;   // consecutive bounces on short elastics
let rings = [];        // shockwave rings (super jump)
let floaters = [];     // '+10' coin pop after defeating an enemy
let groundY = 0, originY = 0; // world y of the ground top / of meter 0 (fixed per run)
// Per-run counters (reset at the start of every run by resetDebugStats)
function freshDebugStats() {
  return { bounces: 0, supers: 0, wallKicks: 0, superFrame: -1, last: null, hits: {}, deaths: 0, deathBy: null, shieldBreaks: 0,
    stomps: { blue: 0, red: 0 }, upperHits: 0, pushOuts: 0, unsticks: 0, groundHops: 0, maxEmbedded: 0,
    bonks: 0, ghostPlatforms: 0, snaps: 0, expired: 0, fallBounces: 0,
    powerups: { magnet: 0, shield: 0, rocket: 0 }, shieldSaves: 0, rocketExtend: 0, combos: {}, comboKills: 0, comboDrops: 0, dives: 0, teleports: 0, magnetCoins: 0 };
}
const debugStats = freshDebugStats();
function resetDebugStats() {
  const f = freshDebugStats();
  for (const k in debugStats) if (!(k in f)) delete debugStats[k];
  for (const k in f) debugStats[k] = f[k];
}

// Parallax scenery seeds (stable)
let hillsFar = [], hillsNear = [], mountains = [], trees = [], cloudLayer = [], planets = [];
