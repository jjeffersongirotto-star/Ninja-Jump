// --- Hazards & difficulty progression: ALL tuning lives here ---
// Stage thresholds are in meters. Each stage adds something new; earlier types keep
// appearing later (mixed). Every hazard row always keeps a free gap of at least
// minGapNinjaWidths x the ninja's width (2 x NINJA_R), counting moving hazards' full sweep.
const HAZARDS = {
  calmUntil: 80,                 // opening stretch: no hazards at all (coins only)
  stages: {
    platformLeft: 80,            // first platforms, sticking out of the left wall
    platformAnySide: 160,        // platforms now also on the right wall
    platformBoth: 240,           // platforms on both walls with a gap between them (+ floating ones)
    flyersBlue: 330,             // blue winged flyers: bump like a platform (not fatal)
    flyersRed: 420,              // red winged flyers: touching = game over
    spikes: 500,                 // small spike structures: touching = game over
    movingFlyers: 600,           // flyers start moving (blue birds: sine wave; red bats: patrol)
    divingBats: 660,             // some red bats dive at the ninja (always after a ~0.5 s warning)
    aliens: 720,                 // UFOs with aliens that teleport nearby (blue = bump, red = fatal)
    saws: 900,                   // spinning saws (fatal) and sliding platforms
    maxDifficulty: 1600          // every ramp below is capped from here on
  },
  // Per-type behaviour: false = bump (lose momentum, recoverable), true = game over.
  // Swap blueFlyer/redFlyer here if the owner wants the opposite meaning.
  fatal: { platform: false, blueFlyer: false, redFlyer: true, spikes: true, saw: true, blueUfo: false, redUfo: true },
  minGapNinjaWidths: 3,
  rowSpacing: [30, 17],          // m between hazard rows (start -> max difficulty)
  clusterRows: [3, 5],           // hazard rows per cluster before a calm breather
  breather: [36, 22],            // m of calm (coins only) after each cluster (start -> max)
  platformWidth: [0.3, 0.44],    // single wall platform, fraction of screen width (start -> max)
  platformThickness: 16,
  bothGap: [130, 175],           // px gap between the two wall platforms
  redShare: [0.3, 0.5],          // share of red among flyers/UFOs (start -> max)
  twoFlyerChance: [0.25, 0.55],  // chance a flyer row has two flyers
  movingShare: [0.45, 0.8],      // share of flyers that move (from movingFlyers on)
  moveSpeed: [0.6, 1.6],         // px/frame peak side-to-side speed (movingFlyers -> max)
  moveRange: [35, 95],           // px half-sweep of moving flyers (movingFlyers -> max)
  ufoRange: [40, 110],           // px half-sweep of UFO drift (aliens -> max)
  coinChance: 0.65,              // chance a hazard row gets a coin line in/near its gap
  shieldOnSuperJump: true,       // spikes/saws can't kill during a super jump: smashed instead (fairness)
  // During a super jump: platforms are intangible, blue flyers/UFOs are defeated (+stomp.coins),
  // red ones are knocked aside at `knockSpeed` px/frame (slowing down) and can't touch him for `knockCool` frames.
  superJump: { knockSpeed: 9, knockCool: 30 },
  // After a non-fatal bump the fall is a little gentler for a moment (more time to draw a new elastic):
  // gravity x `gravity` right after the hit, blending back to normal over `frames`; fall speed capped at
  // `maxFall` px/frame during that window. Normal gravity is unchanged otherwise.
  bumpFloat: { frames: 40, gravity: 0.7, maxFall: 9.5 },
  // Head bonks (hitting a solid from below): each bonk in a row pushes him down harder (1st light,
  // 2nd stronger, 3rd+ strongest) so he can't stay stuck under a platform. The count resets after a
  // jump with no bonk, or after `resetFrames` without bonking.
  bonk: { pushDown: [1.2, 3.4, 6.2], resetFrames: 240 },
  // Falling onto a platform from above: it turns intangible (he drops straight through). It becomes
  // solid again when a new elastic is drawn with him fully below it. If he is still inside it when an
  // elastic is drawn or touched, the elastic snaps in the middle (`snapFrames` animation).
  ghostPlatform: { snapFrames: 20, margin: 4 },  // looks the same as a solid platform
  // Head stomp: landing on a flyer/UFO from above (moving down faster than `minDown`, contact within
  // ~60 degrees of straight down: upward contact component >= `zone`). Blue: defeated, +`coins`, rebound
  // `blueImpulse`. Red: NOT defeated, just rebound `redImpulse` and he survives. Spikes/saws: always fatal.
  // Upper-half hit (blue only, `upperHalf`): touching a blue flyer/UFO anywhere from its vertical middle up
  // defeats it too, from any direction (side, rising from below at an angle). Coming down: stomp rebound;
  // otherwise he keeps his momentum. Lower-half contacts keep the bump. Every defeat gives +`coins`.
  stomp: { blueImpulse: 8.5, redImpulse: 7.5, minDown: 0.5, zone: 0.5, coins: 10, poofFrames: 22, upperHalf: true },
  // Rooms (hand-built obstacle patterns, see world/rooms.js): the generator places one room at a time,
  // with a calm breather (coins only, `breather` m) between rooms. A room's difficulty (1-3) is allowed
  // once the altitude ramp reaches `roomDiffAt[d-1]` (0..1 of the ramp from platformLeft to maxDifficulty);
  // higher difficulties are picked less often (`roomDiffWeight`). No room repeats within `roomNoRepeat` rooms.
  // `classicWeight`: weight of a "classic" room made of 2-3 loose random rows (keeps the old mix alive).
  rooms: { roomDiffAt: [0, 0.3, 0.65], roomDiffWeight: [1, 0.8, 0.55], roomNoRepeat: 3, classicWeight: 0.6,
    minRowGap: 13, hintCoins: 0.8 },
  // Enemy personalities. Every sudden move is announced `warn` frames before (60 frames = 1 s).
  enemies: {
    // blue birds that move fly in a sine wave: up/down `amp` px while gliding side to side
    birdWave: { amp: 18, freq: 0.055 },
    // red bats (from stages.divingBats): when the ninja passes within `triggerX` px sideways and between
    // `triggerBelow` px under the bat, it warns (shakes, "!", dashed line to the target), then dives toward
    // where he WAS when the warning started, clamped to `maxDx`/`maxDy` px (that box counts for the gap rule),
    // holds, flies back, and rests `cool` frames. Only while the bat is fully on screen.
    batDive: { chance: [0.35, 0.6], triggerX: 150, triggerBelow: [20, 300], warn: 32, dive: 20, hold: 8,
      back: 42, cool: 150, maxDx: 80, maxDy: 120 },
    // UFOs: hover, then every `every` frames teleport to another spot inside their area (range x bob);
    // a ghost outline marks the destination `warn` frames before. Never onto the ninja.
    ufoTeleport: { every: [150, 230], warn: 34 }
  },
  // Anti-stuck safeguard: overlapping a solid for `embedFrames` frames, or moving less than `minMove` px
  // for `frames` frames while free (not pinned on an elastic) -> pushed out and falls free for `ghostFrames`.
  antiStuck: { frames: 20, minMove: 3, embedFrames: 3, ghostFrames: 18 }
};
