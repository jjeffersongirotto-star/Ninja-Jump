// --- Power-ups: ALL tuning lives here ---
// Placed rarely, only in the calm breather between two rooms (never inside or next to hazards).
const POWERUPS = {
  fromMeters: 150,            // none below this altitude
  everyRooms: [3, 5],         // rooms between two power-ups (random in this range)
  weights: { magnet: 0.4, shield: 0.35, rocket: 0.25 }, // never the same type twice in a row
  pickupRadius: 18,           // item radius for the pickup test (+ NINJA_R)
  // MAGNET: coins within `radius` px fly to him for `frames` (60 = 1 s); pull speed grows to `speed` px/frame.
  magnet: { frames: 480, radius: 170, speed: 9 },
  // SHIELD: absorbs ONE fatal hit (bubble breaks); then `graceFrames` of immunity to fatal hazards so he
  // can get away. Lasts until used. Picking another one while shielded does nothing extra (no stacking).
  shield: { graceFrames: 60, bounce: 4 },
  // ROCKET: automatic ascent at `speed` px/frame for `frames`, passing through every hazard (no collisions,
  // elastics ignored). The last `easeFrames` slow down to `releaseVy`. If he would come out overlapping a
  // hazard's area it keeps rising slowly (up to `extendMax` frames) until clear, then releases him going up
  // gently with the softer post-bump gravity (HAZARDS.bumpFloat) so there is time to draw an elastic.
  // Super jump: a rocket picked during a super jump replaces it (spin ends, no stacking); no super jump can
  // start during a rocket (elastics are ignored while it flies). The short-elastic streak is kept.
  rocket: { frames: 150, speed: 10.5, easeFrames: 26, releaseVy: 5, extendMax: 90, clearMargin: 40 }
};
