// --- Power-ups: ALL tuning lives here ---
// Placed rarely, only in the calm breather between two rooms (never inside or next to hazards).
const POWERUPS = {
  fromMeters: 150,            // none below this altitude
  everyRooms: [3, 6],         // rooms between two power-ups (random in this range)
  // Combo pair: sometimes a power-up spot gets TWO different items on the same trail (the lower one first,
  // the rocket always on top so he flies through the second one). With the longer gap above, the average
  // number of items per room only goes from 0.25 to ~0.28 (+11%).
  pairChance: 0.25,
  pairs: [[['shield', 'rocket'], 0.3], [['magnet', 'rocket'], 0.3], [['shield', 'magnet'], 0.2], [['magnet', 'shield'], 0.2]],
  weights: { magnet: 0.4, shield: 0.35, rocket: 0.25 }, // never the same type twice in a row
  pickupRadius: 18,           // item radius for the pickup test (+ NINJA_R)
  // MAGNET: coins within `radius` px fly to him for `frames` (60 = 1 s); pull speed grows to `speed` px/frame.
  magnet: { frames: 600, radius: 170, speed: 9 },
  // SHIELD: absorbs ONE fatal hit (bubble breaks); then `graceFrames` of immunity to fatal hazards so he
  // can get away. Lasts until used. Picking another one while shielded does nothing extra (no stacking).
  shield: { graceFrames: 60, bounce: 4 },
  // ROCKET: automatic ascent at `speed` px/frame for `frames`, passing through every hazard (no collisions,
  // elastics ignored). The last `easeFrames` slow down to `releaseVy`. If he would come out overlapping a
  // hazard's area it keeps rising slowly (up to `extendMax` frames) until clear, then releases him going up
  // gently with the softer post-bump gravity (HAZARDS.bumpFloat) so there is time to draw an elastic.
  // Super jump: a rocket picked during a super jump replaces it (spin ends, no stacking); no super jump can
  // start during a rocket (elastics are ignored while it flies). The short-elastic streak is kept.
  rocket: { frames: 150, speed: 10.5, easeFrames: 26, releaseVy: 5, extendMax: 90, clearMargin: 40 },
  // COMBOS: two effects active at the same time (rocket and super jump never overlap: the rocket replaces it).
  // Each combo shows its name once when it starts and a coloured aura while it lasts.
  combos: {
    // magnet + rocket: magnet radius x radiusMult and pull speed x speedMult during the climb
    magnetRocket: { label: 'Foguete Magnético!', color: '#ff5ad1', radiusMult: 2.3, speedMult: 1.6 },
    // magnet + super jump: magnet radius x radiusMult and pull speed x speedMult during the super-jump ascent
    // (he climbs up to ~35 px/frame, faster than any pull: coins in range are also carried along with him)
    magnetSuper: { label: 'Super Ímã!', color: '#ff9de2', radiusMult: 1.7, speedMult: 2.2 },
    // shield + rocket: rams flyers/UFOs on the way (red ones too): defeated, +HAZARDS.stomp.coins each.
    // The shield is NOT used up; spikes/saws are still just flown through.
    shieldRocket: { label: 'Aríete Blindado!', color: '#ffd23f' },
    // shield + super jump: red flyers/UFOs are defeated (+coins) instead of knocked aside; shield kept
    shieldSuper: { label: 'Super Aríete!', color: '#fff27a' },
    // magnet + shield: every enemy defeated drops `dropCoins` extra coins (pulled in by the magnet); a red
    // enemy that breaks the shield is defeated (+coins, and the drop) instead of only knocked aside
    magnetShield: { label: 'Escudo Imantado!', color: '#b88bff', dropCoins: 4, dropSpread: 26 },
    // all three at once (magnet + shield + rocket / super jump): every effect above together
    triple: { label: 'Combo Triplo!', color: '#ffffff' }
  }
};
