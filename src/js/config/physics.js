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
// Power curve over the allowed range (t = 0 shortest .. 1 longest): the longest line gives
// LONG_ELASTIC_POWER of the max, sizes in between ramp smoothly (more than the old 1/len curve),
// and the very shortest lines get a small extra bonus on top (MIN_ELASTIC_BONUS).
const LONG_ELASTIC_POWER = 0.42;
const ELASTIC_CURVE = 1.4;
const MIN_ELASTIC_BONUS = 0.08;
function elasticT(rawLen) {
  const maxLen = elasticMaxLen();
  return Math.max(0, Math.min(1, (rawLen - ELASTIC_MIN) / (maxLen - ELASTIC_MIN)));
}
function elasticPower(rawLen) {
  const t = elasticT(rawLen);
  const base = LONG_ELASTIC_POWER + (1 - LONG_ELASTIC_POWER) * Math.pow(1 - t, ELASTIC_CURVE);
  return base * (1 + MIN_ELASTIC_BONUS * (1 - smoothstep(0, 0.12, t)));
}
// Super jump: SUPER_STREAK short elastics in a row -> the last of them launches a super jump.
// "Short" = the shortest SHORT_ELASTIC_T of the allowed range (about 64%+ on the % indicator).
const SHORT_ELASTIC_T = 0.4;
const SUPER_STREAK = 5;
const SUPER_JUMP_MULT = 1.7;               // x the normal impulse of that same elastic
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
