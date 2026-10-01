// --- Physics constants (base; scaled by difficulty) ---
const GRAVITY_BASE = 0.36;
const NINJA_R = 16;
const ELASTIC_MIN = 36;
const BASE_IMPULSE = 19.5;
// Max drawn length: one third of the screen width (never below a usable minimum on tiny screens).
// The finger can keep dragging, but the line stops growing at this length.
const ELASTIC_MAX_FRAC = 1 / 3;
const ELASTIC_MAX_MIN_PX = 90;
function elasticMaxLen() { return Math.max(ELASTIC_MAX_MIN_PX, W * ELASTIC_MAX_FRAC); }
// Power curve over the allowed range (t = 0 shortest .. 1 longest): full power SHORT_ELASTIC_POWER for
// the shortest SHORT_PLATEAU_T of the range (a finger rarely hits the exact minimum, so "short" lines
// of ~36-45 px all get the full reward), then a smooth fall to LONG_ELASTIC_POWER at the longest line.
const SHORT_ELASTIC_POWER = 1.15;
const SHORT_PLATEAU_T = 0.1;
const LONG_ELASTIC_POWER = 0.42;
const ELASTIC_CURVE = 1.3;
// Short lines drawn with a finger come out tilted by accident and lose height: their launch direction
// is pulled toward straight up by up to SHORT_STRAIGHTEN (shortest line), fading to 0 at SHORT_ELASTIC_T.
const SHORT_STRAIGHTEN = 0.5;
function elasticT(rawLen) {
  const maxLen = elasticMaxLen();
  return Math.max(0, Math.min(1, (rawLen - ELASTIC_MIN) / (maxLen - ELASTIC_MIN)));
}
function elasticPower(rawLen) {
  const t = Math.max(0, (elasticT(rawLen) - SHORT_PLATEAU_T) / (1 - SHORT_PLATEAU_T));
  return LONG_ELASTIC_POWER + (SHORT_ELASTIC_POWER - LONG_ELASTIC_POWER) * Math.pow(1 - t, ELASTIC_CURVE);
}
// Super jump: SUPER_STREAK short elastics in a row -> the last of them launches a super jump.
// "Short" = the shortest SHORT_ELASTIC_T of the allowed range (about 80%+ on the % indicator).
const SHORT_ELASTIC_T = 0.4;
const SUPER_STREAK = 10;
const SUPER_JUMP_MULT = 1.6;               // x the normal impulse of that same elastic
const SUPER_JUMP_MIN = BASE_IMPULSE * 1.35; // floor so every super jump feels big
const SUPER_SPIN_TURNS_PER_SEC = 3.5;      // spin speed at launch; slows to 0 at the top
// Wall kick (visual only): min horizontal speed into a wall, and pose duration in frames
const WALL_KICK_MIN_SPEED = 0.8;
const WALL_KICK_FRAMES = 22;
const METERS_PER_PX = 0.08;
// Start of a run: the ninja stands on the ground doing little idle hops until the first elastic.
// The ground only exists at the bottom of the world, while it is still on screen (the camera never comes back down).
const GROUND_FRAC = 0.9;       // ground top at this fraction of the screen height when the run starts
const GROUND_HOP_VY = 8.6;     // idle hop speed (about 115 px high)
