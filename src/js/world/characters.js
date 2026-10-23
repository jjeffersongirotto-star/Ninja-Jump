// --- Per-frame character abilities that are not just a multiplier (tuning: CHARACTER_ABILITIES) ---
// Ninja Relâmpago Sombrio: short teleport; Monge Imã: weak coin pull; Kunoichi do Tempo: one slow-motion.
const SLOWMO_FRAMES = 150;    // game updates the slow motion lasts
const SLOWMO_SCALE = 0.4;     // speed of the game while it lasts
const SLOWMO_DANGER_PX = 70;  // a deadly obstacle this close (or a fall this deep) triggers it
let slowMoT = 0;

function timeScale() { return slowMoT > 0 && state === 'playing' ? SLOWMO_SCALE : 1; }

function teleportReady() {
  const every = abilityValue('teleportEvery', 0);
  return every > 0 && !!ninja && !ninja.dead && ninja.tpT >= every;
}
function doTeleport() {
  const dist = abilityValue('teleportDist', 170);
  let dx = ninja.vx, dy = ninja.vy, len = Math.hypot(dx, dy);
  if (len < 1) { dx = 0; dy = -1; len = 1; }
  const ox = ninja.x, oy = ninja.y;
  ninja.x = Math.max(NINJA_R, Math.min(W - NINJA_R, ninja.x + dx / len * dist));
  ninja.y += dy / len * dist;
  ninja.tpT = 0;
  ninja.invulnT = Math.max(ninja.invulnT, 28); // passes through whatever it lands in
  ninja.still = 0; ninja.stillX = ninja.x; ninja.stillY = ninja.y;
  burst(ox, oy, '#a58bff', 14, 4);
  burst(ninja.x, ninja.y, '#ffffff', 10, 3);
  rings.push({ x: ninja.x, y: ninja.y, r: 10, life: 0.7, color: '#a58bff' });
  beep(1250, 0.07, 'sawtooth', 0.05);
}
function dangerNear() {
  if (ninja.y - camera.y > H - 110 && ninja.vy > 2) return true;
  for (const hz of hazards) {
    if (!hz.alive || !hz.fatal) continue;
    const r = Math.max(hz.r || 0, hz.rx || 0, hz.ry || 0, 14);
    if (Math.hypot(ninja.x - hz.x, ninja.y - hz.y) < NINJA_R + r + SLOWMO_DANGER_PX) return true;
  }
  return false;
}
function updateCharacterAbilities() {
  if (ninja.dead) return;
  if (slowMoT > 0) slowMoT--;
  if (abilityValue('teleportEvery', 0) > 0) {
    ninja.tpT++;
    if (teleportReady() && !(elastic && elastic.phase === 'stretching') && ninja.rocketT <= 0) doTeleport();
  }
  if (abilityValue('slowMoOnce', false) && !ninja.slowUsed && dangerNear()) {
    ninja.slowUsed = true;
    slowMoT = SLOWMO_FRAMES;
    rings.push({ x: ninja.x, y: ninja.y, r: 14, life: 0.9, color: '#ffe9a8' });
    beep(300, 0.25, 'sine', 0.06);
  }
}
// Monge Imã: coins inside the radius drift toward the ninja (always on, weaker than the magnet power-up)
function monkPull(c) {
  const rad = abilityValue('coinPull', 0);
  if (rad <= 0) return;
  const dx = ninja.x - c.x, dy = ninja.y - c.y, d = Math.hypot(dx, dy);
  if (d > rad || d < 1) return;
  const k = Math.min(1, (1.5 + 3 * (1 - d / rad)) / d);
  c.x += dx * k; c.y += dy * k;
}
