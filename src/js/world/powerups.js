// --- Power-ups in the world: pickup and effects (tuning: config/powerups.js) ---
const POWER_NAMES = { magnet: 'Ímã!', shield: 'Escudo!', rocket: 'Foguete!' };

function pickupPowerups() {
  if (!powerups.length || ninja.dead) return;
  for (const p of powerups) {
    if (p.taken) continue;
    if (Math.hypot(ninja.x - p.x, ninja.y - p.y) < NINJA_R + p.r) applyPowerup(p);
  }
}
function applyPowerup(p) {
  p.taken = true;
  debugStats.powerups[p.type]++;
  const col = p.type === 'magnet' ? '#ff6b6b' : (p.type === 'shield' ? '#7fe3ff' : '#ffb347');
  burst(p.x, p.y, col, 14, 3.4);
  burst(p.x, p.y, '#ffffff', 8, 2.4);
  rings.push({ x: p.x, y: p.y, r: 10, life: 0.6, color: col });
  floaters.push({ x: p.x + 8, y: p.y - 22, life: 56, text: POWER_NAMES[p.type], color: col, noCoin: true });
  beep(660, 0.07, 'triangle', 0.07);
  beep(990, 0.08, 'triangle', 0.06);
  beep(1320, 0.12, 'sine', 0.05);
  if (p.type === 'magnet') ninja.magnetT = POWERUPS.magnet.frames;
  else if (p.type === 'shield') { ninja.shield = true; ninja.shieldPop = 1; }
  else if (p.type === 'rocket') startRocket();
}

// ROCKET: replaces a super jump in progress (no stacking); elastics are ignored while it flies
function startRocket() {
  ninja.rocketT = POWERUPS.rocket.frames;
  ninja.rocketExt = 0;
  ninja.superSpin = false;
  ninja.spinAngle = 0;
  ninja.spinning = 0;
  ninja.floatT = 0;
  ninja.ghost = 0;
  elastic = null;
  shake = Math.max(shake, 4);
  beep(180, 0.25, 'sawtooth', 0.05);
}
// One frame of rocket flight (replaces gravity). Returns nothing; updates position/velocity.
function rocketStep() {
  const RK = POWERUPS.rocket, r = ninja.rocketT;
  const target = r > RK.easeFrames ? -RK.speed : -(RK.releaseVy + (RK.speed - RK.releaseVy) * (r / RK.easeFrames));
  ninja.vy += (target - ninja.vy) * 0.25;
  ninja.vx *= 0.9;
  ninja.x += ninja.vx;
  ninja.y += ninja.vy;
  if (r <= 1) {
    // never drop him inside a hazard's area: keep rising slowly until clear
    if (!rocketClear() && ninja.rocketExt < RK.extendMax) { ninja.rocketExt++; debugStats.rocketExtend++; rocketSteer(); return; }
    ninja.rocketT = 0;
    ninja.vy = -RK.releaseVy;
    ninja.floatT = HAZARDS.bumpFloat.frames; // gentle fall afterwards: time to draw an elastic
    ninja.stillX = ninja.x; ninja.stillY = ninja.y; ninja.still = 0;
    burst(ninja.x, ninja.y + NINJA_R, '#ffd27f', 10, 2.5);
    beep(520, 0.1, 'sine', 0.05);
  } else ninja.rocketT--;
  if (particles.length < 230) {
    for (let i = 0; i < 2; i++) {
      particles.push({ x: ninja.x + (Math.random() - 0.5) * 8, y: ninja.y + NINJA_R + 6, vx: (Math.random() - 0.5) * 1.4,
        vy: 2.5 + Math.random() * 2, life: 18 + Math.random() * 10, max: 28, size: 3 + Math.random() * 3,
        color: Math.random() < 0.5 ? '#ffd27f' : (Math.random() < 0.5 ? '#ff7a3d' : 'rgba(255,255,255,0.8)') });
    }
  }
}
// While extending: drift sideways toward the nearest free column (the guaranteed gap) at his height
function rocketSteer() {
  const M = POWERUPS.rocket.clearMargin, R = NINJA_R, iv = [];
  for (const hz of hazards) {
    if (!hz.alive || hz.dying) continue;
    const up = (hz.vh || 20) + (hz.bobAmp || 0) + R + M, down = up + (hz.diveY || 0);
    if (ninja.y > hz.oy - up && ninja.y < hz.oy + down) {
      const hw = (hz.vw || 20) + (hz.range || 0) + (hz.diveX || 0) + R + 6;
      iv.push([hz.ox - hw, hz.ox + hw]);
    }
  }
  if (!iv.length) return;
  iv.sort((a, b) => a[0] - b[0]);
  let cur = R, best = null;
  const consider = (a, b) => {
    if (b - a < 2) return;
    const x = Math.max(a, Math.min(ninja.x, b));
    if (best === null || Math.abs(x - ninja.x) < Math.abs(best - ninja.x)) best = x;
  };
  for (const v of iv) { consider(cur, v[0]); cur = Math.max(cur, v[1]); }
  consider(cur, W - R);
  if (best !== null) ninja.x += Math.max(-3, Math.min(3, best - ninja.x));
}
// Is he clear of every hazard's full area (sweep, wave, dive box, teleport area) + a margin?
function rocketClear() {
  const M = POWERUPS.rocket.clearMargin, R = NINJA_R;
  for (const hz of hazards) {
    if (!hz.alive || hz.dying) continue;
    const hw = (hz.vw || 20) + (hz.range || 0) + (hz.diveX || 0) + R + 6;
    const up = (hz.vh || 20) + (hz.bobAmp || 0) + R + M, down = up + (hz.diveY || 0);
    if (Math.abs(ninja.x - hz.ox) < hw && ninja.y > hz.oy - up && ninja.y < hz.oy + down) return false;
  }
  return true;
}

// SHIELD: absorbs one fatal hit; the bubble bursts and he gets a moment of immunity to fatal hazards
function breakShield(hz) {
  const SH = POWERUPS.shield;
  ninja.shield = false;
  ninja.invulnT = SH.graceFrames;
  debugStats.shieldSaves++;
  countHit(hz.kind + ':shield');
  if (hazardContact(hz, ninja.x, ninja.y)) {
    const p = pushOut(hz, ninja.x, ninja.y);
    ninja.x = p.x; ninja.y = p.y;
  }
  let dx = ninja.x - hz.x, dy = ninja.y - hz.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  ninja.vx = dx * SH.bounce;
  ninja.vy = Math.min(dy * SH.bounce, ninja.vy < 0 ? ninja.vy * 0.5 : 0);
  ninja.floatT = HAZARDS.bumpFloat.frames;
  if ((hz.type === 'flyer' || hz.type === 'ufo') && !hz.dv) knockAside(hz);
  else hz.cool = Math.max(hz.cool, SH.graceFrames);
  if (hz.dv && hz.dv.st !== 'idle') { hz.dv.st = 'back'; hz.dv.t = 0; } // diving bat bounces off and flies back
  hz.hit = 1;
  shake = Math.max(shake, 7);
  // bubble shards
  for (let i = 0; i < 16 && particles.length < 240; i++) {
    const a = (i / 16) * Math.PI * 2;
    particles.push({ x: ninja.x + Math.cos(a) * 24, y: ninja.y + Math.sin(a) * 24, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2 - 0.5,
      life: 26, max: 26, size: 2.6, color: i % 2 ? '#bff4ff' : 'rgba(255,255,255,0.9)' });
  }
  rings.push({ x: ninja.x, y: ninja.y, r: 22, life: 0.8, color: '#9eeeff' });
  rings.push({ x: ninja.x, y: ninja.y, r: 12, life: 0.55, color: '#ffffff' });
  beep(1200, 0.06, 'triangle', 0.07);
  beep(600, 0.12, 'sine', 0.06);
  beep(300, 0.16, 'triangle', 0.05);
}

// MAGNET: coins nearby fly to him
function magnetPull(c) {
  const MG = POWERUPS.magnet;
  const dx = ninja.x - c.x, dy = ninja.y - c.y, d = Math.hypot(dx, dy);
  if (d > MG.radius || d < 1) return;
  if (!c.pulled) { c.pulled = true; debugStats.magnetCoins++; }
  const spd = 2 + MG.speed * (1 - d / MG.radius);
  const k = Math.min(1, spd / d);
  c.x += dx * k;
  c.y += dy * k;
}
function tickPowerTimers() {
  if (ninja.magnetT > 0) ninja.magnetT--;
  if (ninja.invulnT > 0) ninja.invulnT--;
  if (ninja.shieldPop > 0) ninja.shieldPop = Math.max(0, ninja.shieldPop - 0.05);
}
