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
// Elastic lifetime: an elastic the ninja has NOT landed on snaps after this many game frames
// (60 frames = 1 s; the game runs at a fixed 60 updates/s). Applies to every idle elastic, also at the
// ground start. Once he lands on it (stretching/launching) it stays and is removed right after the launch.
// The last ELASTIC_WARN_FRAMES it flickers and thins so the snap doesn't come out of nowhere.
const ELASTIC_LIFETIME = 90;      // 1.5 s
const ELASTIC_WARN_FRAMES = 24;   // 0.4 s
// Fall energy: landing on an elastic while falling fast gives a bigger bounce (the lower the elastic is
// below where he started falling, the faster he arrives). Energy-style, like a real trampoline:
//   launch = sqrt(L0^2 + FALL_ENERGY_GAIN * max(0, speedIn^2 - FALL_ENERGY_FREE_SPEED^2))
// where L0 = the usual launch speed of that elastic (length-based: shorter = higher, unchanged) and
// speedIn = speed INTO the band (perpendicular). GAIN 1 would give back exactly the height of the fall;
// a bit more than 1 makes a deliberate long fall slightly rewarding (never a huge exploit).
// Capped at FALL_BOUNCE_MAX_MULT x L0. FALL_ENERGY_FREE_SPEED ~ a normal short drop (about 110 px at base
// gravity), so everyday bounces are exactly as before.
// Super jump: the fall bonus does NOT stack with it (a super jump uses whichever is bigger), and a fall
// bounce counts for the short-elastic streak like any other bounce (the streak is about line length).
const FALL_ENERGY_FREE_SPEED = 9;
const FALL_ENERGY_GAIN = 1.25;
const FALL_BOUNCE_MAX_MULT = 1.5;
// Sag of the elastic under the ninja: deeper for faster landings (px), up to ELASTIC_SAG_MAX
const ELASTIC_SAG_BASE = 12;
const ELASTIC_SAG_PER_SPEED = 1.35;
const ELASTIC_SAG_FALL_EXTRA = 1.2;  // extra px per px/frame above FALL_ENERGY_FREE_SPEED (fast landings only)
const ELASTIC_SAG_MAX = 50;          // was 32 (reached at ~15 px/frame); now long falls sink visibly deeper
// Touch dead zones (screen px): a touch that STARTS this close to the bottom/top edge doesn't draw
// (that is where Android's navigation/notification gestures live). The real size is the larger of this
// and the device's safe-area inset. Lines are also kept out of these bands while dragging.
const TOUCH_DEAD_BOTTOM = 28;
const TOUCH_DEAD_TOP = 24;
// Wall kick (visual only): min horizontal speed into a wall, and pose duration in frames
const WALL_KICK_MIN_SPEED = 0.8;
const WALL_KICK_FRAMES = 22;
const METERS_PER_PX = 0.08;
// Start of a run: the ninja stands on the ground doing little idle hops until the first elastic.
// The ground only exists at the bottom of the world, while it is still on screen (the camera never comes back down).
const GROUND_FRAC = 0.9;       // ground top at this fraction of the screen height when the run starts
const GROUND_HOP_VY = 8.6;     // idle hop speed (about 115 px high)
