// --- Power-ups in the world: pickup and effects (tuning: config/powerups.js) ---
function timedPowerupFrames(frames) {
  return Math.round(frames * abilityValue('powerupDuration', 1));
}

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
  modeRun.powerups++;
  const col = p.type === 'magnet' ? '#ff6b6b' : (p.type === 'shield' ? '#7fe3ff' : (p.type === 'fire' ? '#ff7a1f' : '#ffb347'));
  burst(p.x, p.y, col, 14, 3.4);
  burst(p.x, p.y, '#ffffff', 8, 2.4);
  rings.push({ x: p.x, y: p.y, r: 10, life: 0.6, color: col });
  beep(660, 0.07, 'triangle', 0.07);
  beep(990, 0.08, 'triangle', 0.06);
  beep(1320, 0.12, 'sine', 0.05);
  if (p.type === 'magnet') ninja.magnetT = timedPowerupFrames(POWERUPS.magnet.frames);
  else if (p.type === 'shield') { ninja.shield = true; ninja.shieldPop = 1; }
  else if (p.type === 'fire') ninja.fireElastic = true;
  else if (p.type === 'rocket') startRocket();
}

// ROCKET: replaces a super jump in progress (no stacking); elastics are ignored while it flies
function startRocket() {
  ninja.rocketT = timedPowerupFrames(POWERUPS.rocket.frames);
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
  rocketCoinSteer();
  const hug = rocketWallHug(r);
  ninja.x += ninja.vx;
  const wm = hug ? NINJA_R : NINJA_R + RK.coinSteer.wallMargin;
  if (ninja.x < wm) { ninja.x = wm; if (ninja.vx < 0) ninja.vx = 0; }
  if (ninja.x > W - wm) { ninja.x = W - wm; if (ninja.vx > 0) ninja.vx = 0; }
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
        color: Math.random() < 0.5 ? '#ffd27f' : (Math.random() < 0.5 ? '#ff7a3d' : '#fff1c9'), fire: FX.glow });
    }
  }
}
// Flight planner: marks every screen column a hazard's full area (sweep, wave, dive box + the ninja's radius
// + a margin) blocks at each height step over the next `avoidAhead` px, then works backwards from the horizon to
// find which columns he can still reach sideways (at most maxVx px per frame) without ever touching one.
// Returns { n, steps, colW, step, depth } or null when nothing is ahead (fly freely).
function rocketPlan() {
  const CS = POWERUPS.rocket.coinSteer, R = NINJA_R, M = CS.avoidMargin;
  const step = 10, colW = 2, steps = Math.ceil(CS.avoidAhead / step), n = Math.ceil(W / colW) + 1;
  const blocked = new Uint8Array((steps + 1) * n);
  let any = false;
  for (const hz of hazards) {
    if (!hz.alive || hz.dying) continue;
    const up = (hz.vh || 20) + (hz.bobAmp || 0) + R + M, down = up + (hz.diveY || 0);
    // one extra height step on each side: the plan is redone every frame and must never flip at a band's edge
    const s0 = Math.max(0, Math.ceil((ninja.y - (hz.oy + down)) / step) - 1), s1 = Math.min(steps, Math.floor((ninja.y - (hz.oy - up)) / step) + 1);
    if (s0 > s1) continue;
    const hw = (hz.vw || 20) + (hz.range || 0) + (hz.diveX || 0) + R + M;
    const c0 = Math.max(0, Math.ceil((hz.ox - hw) / colW)), c1 = Math.min(n - 1, Math.floor((hz.ox + hw) / colW));
    for (let s = s0; s <= s1; s++) for (let c = c0; c <= c1; c++) blocked[s * n + c] = 1;
    any = true;
  }
  if (!any) return null;
  const lo = Math.ceil((R + CS.wallMargin) / colW), hi = Math.floor((W - R - CS.wallMargin) / colW);
  const climb = Math.max(2, -ninja.vy), reach = Math.max(1, Math.floor(CS.avoidVx * 0.9 * step / climb / colW)); // columns he can shift per height step (planned with 10% to spare)
  // depth[s][c] = how many height steps he survives from column c at step s (= steps: all the way). When every
  // way is blocked he still takes the one that lasts longest (the margin is not a hit yet).
  const depth = new Uint8Array((steps + 1) * n);
  for (let c = lo; c <= hi; c++) depth[steps * n + c] = steps;
  for (let s = steps - 1; s >= 0; s--) {
    for (let c = lo; c <= hi; c++) {
      if (blocked[s * n + c]) { depth[s * n + c] = s; continue; }
      let b = 0;
      for (let d = -reach; d <= reach; d++) {
        const k = c + d;
        if (k >= lo && k <= hi && depth[(s + 1) * n + k] > b) b = depth[(s + 1) * n + k];
      }
      depth[s * n + c] = b;
    }
  }
  return { n: n, steps: steps, colW: colW, step: step, depth: depth, lo: lo, hi: hi, reach: reach };
}
// Is this spot (x, `dy` px above him) on a column he can pass through safely?
function rocketPlanOk(plan, x, dy) {
  if (!plan) return true;
  const s = Math.round(dy / plan.step);
  if (s > plan.steps) return true;
  const c = Math.max(plan.lo, Math.min(plan.hi, Math.round(x / plan.colW)));
  return plan.depth[Math.max(0, s) * plan.n + c] === plan.steps;
}
// Coin auto-path: aim for the nearest coin ahead that can still be reached, but never through a hazard:
// the flight planner picks the sideways move toward it that keeps every later column escapable.
function rocketCoinSteer() {
  const CS = POWERUPS.rocket.coinSteer, climb = Math.max(2, -ninja.vy);
  const pickR = NINJA_R + 14; // coin pickup distance (NINJA_R + coin r + 4)
  const plan = rocketPlan();
  let best = null, bestDy = 1e9;
  for (const c of coins) {
    if (c.collected) continue;
    const dy = ninja.y - c.y; // > 0: above him
    if (dy < -CS.behind || dy > CS.lookahead) continue;
    if (!rocketPlanOk(plan, c.x, dy)) continue; // behind an obstacle: not reachable safely
    const dx = Math.abs(c.x - ninja.x);
    // reachable before he passes it: side distance he can cover while climbing up to it (+ pickup radius)
    if (dx - pickR > CS.maxVx * Math.max(0, dy) / climb + 4) continue;
    if (dy < bestDy) { bestDy = dy; best = c; }
  }
  let want = null;
  if (best) {
    const left = Math.max(1, bestDy / climb); // frames until he reaches its height
    want = Math.max(-CS.maxVx, Math.min(CS.maxVx, (best.x - ninja.x) / left));
  } else if (!plan) want = ninja.vx * 0.9;
  ninja.rocketCoin = best;
  if (plan) {
    // sideways move for the next step: the safe column nearest to where he wants to be
    const c0 = Math.round(ninja.x / plan.colW), goal = best ? best.x : ninja.x;
    let pick = null, pickDepth = -1;
    for (let d = -plan.reach; d <= plan.reach; d++) {
      const k = c0 + d;
      if (k < plan.lo || k > plan.hi) continue;
      const dp = plan.depth[plan.n + k];
      if (dp > pickDepth || (dp === pickDepth && Math.abs(k * plan.colW - goal) < Math.abs(pick * plan.colW - goal))) { pick = k; pickDepth = dp; }
    }
    if (pick !== null) {
      const tx = pick * plan.colW;
      want = Math.max(-CS.avoidVx, Math.min(CS.avoidVx, (tx - ninja.x) * climb / plan.step));
    } else want = 0;
    ninja.vx = want; // safety first: follow the plan exactly
    return;
  }
  ninja.vx += (want - ninja.vx) * (best ? CS.accel : 1);
}
// No-elastic mode: over its last `wallFrames` the rocket glides to the nearest side wall (when the way is clear of
// hazards) and ends flush against it, so he can keep wall-jumping. Returns the wall x it is heading to, or null.
function rocketWallHug(r) {
  if (gameMode !== 'noelastic') return null;
  const RK = POWERUPS.rocket;
  if (r > RK.wallFrames) return null;
  const R = NINJA_R, wx = ninja.x < W / 2 ? R : W - R;
  for (const hz of hazards) {
    if (!hz.alive || hz.dying) continue;
    const hw = (hz.vw || 20) + (hz.range || 0) + (hz.diveX || 0) + R + 6;
    const up = (hz.vh || 20) + (hz.bobAmp || 0) + R + RK.clearMargin, down = up + (hz.diveY || 0);
    if (hz.oy + down < ninja.y - 220 || hz.oy - up > ninja.y + 20) continue;
    if (wx > hz.ox - hw && wx < hz.ox + hw) return null;
  }
  const d = wx - ninja.x;
  ninja.vx = Math.max(-RK.wallVx, Math.min(RK.wallVx, d));
  return wx;
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
  ninja.invulnT = timedPowerupFrames(SH.graceFrames);
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
  const magnetCombo = ninja.magnetT > 0 && (hz.type === 'flyer' || hz.type === 'ufo');
  if (magnetCombo) { // magnet + shield combo: the bubble pops on it and takes it down, coins burst out
    debugStats.comboKills++;
    countHit(hz.kind + ':shieldKill');
    defeatEnemy(hz);
    dropComboCoins(hz);
  } else if ((hz.type === 'flyer' || hz.type === 'ufo') && !hz.dv) knockAside(hz);
  else hz.cool = Math.max(hz.cool, SH.graceFrames);
  if (!magnetCombo && hz.dv && hz.dv.st !== 'idle') { hz.dv.st = 'back'; hz.dv.t = 0; } // diving bat bounces off and flies back
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
  const MG = POWERUPS.magnet, rad = magnetRadius();
  const dx = ninja.x - c.x, dy = ninja.y - c.y, d = Math.hypot(dx, dy);
  if (d > rad || d < 1) return;
  if (!c.pulled) { c.pulled = true; debugStats.magnetCoins++; }
  const C = POWERUPS.combos;
  const spd = (2 + MG.speed * (1 - d / rad)) * (ninja.rocketT > 0 ? C.magnetRocket.speedMult : (ninja.superSpin ? C.magnetSuper.speedMult : 1));
  const k = Math.min(1, spd / d);
  c.x += dx * k;
  c.y += dy * k;
  if (ninja.superSpin && ninja.rocketT <= 0) { c.x += ninja.vx; c.y += ninja.vy; } // super magnet: carried along, he can't outrun them
}
// --- Combos (tuning: POWERUPS.combos) ---
function comboFlags() {
  const sup = !!(ninja.superSpin && !ninja.dead);
  return { m: ninja.magnetT > 0, s: !!ninja.shield, r: ninja.rocketT > 0, u: sup };
}
// Which combo is active now; effects use the flags directly.
function activeCombo() {
  if (!ninja || ninja.dead) return '';
  const f = comboFlags(), boost = f.r || f.u;
  if (f.m && f.s && boost) return 'triple';
  if (f.s && f.r) return 'shieldRocket';
  if (f.m && f.r) return 'magnetRocket';
  if (f.s && f.u) return 'shieldSuper';
  if (f.m && f.u) return 'magnetSuper';
  if (f.m && f.s) return 'magnetShield';
  return '';
}
function comboRams() { return !!(ninja.shield && (ninja.rocketT > 0 || (ninja.superSpin && !ninja.dead))); }
function comboDrops() { return ninja.magnetT > 0 && !!ninja.shield; }
function updateCombo() {
  const id = activeCombo();
  if (id && id !== ninja.combo) {
    const C = POWERUPS.combos[id];
    debugStats.combos[id] = (debugStats.combos[id] || 0) + 1;
    rings.push({ x: ninja.x, y: ninja.y, r: 14, life: 0.8, color: C.color });
    rings.push({ x: ninja.x, y: ninja.y, r: 26, life: 0.6, color: '#ffffff' });
    burst(ninja.x, ninja.y, C.color, 14, 3.5);
    beep(784, 0.07, 'triangle', 0.07);
    beep(1175, 0.08, 'triangle', 0.06);
    beep(1568, 0.14, 'sine', 0.05);
    ninja.comboT = 0;
  }
  ninja.combo = id;
  if (id) ninja.comboT++;
}
// Rocket + shield: ram flyers/UFOs along this frame's path (spikes/saws are still flown through)
function rocketRam(x0, y0) {
  const steps = Math.max(1, Math.ceil(Math.hypot(ninja.x - x0, ninja.y - y0) / 4));
  for (const hz of hazards) {
    if (!hz.alive || hz.dying > 0 || (hz.type !== 'flyer' && hz.type !== 'ufo')) continue;
    if (Math.abs(hz.y - ninja.y) > 90) continue;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (hazardContact(hz, x0 + (ninja.x - x0) * t, y0 + (ninja.y - y0) * t)) { comboDefeat(hz); break; }
    }
  }
}
// An enemy defeated by a combo ram (red ones too)
function comboDefeat(hz) {
  debugStats.comboKills++;
  countHit(hz.kind + ':ram');
  shake = Math.max(shake, 5);
  const C = POWERUPS.combos[ninja.combo] || POWERUPS.combos.shieldRocket;
  rings.push({ x: hz.x, y: hz.y, r: 8, life: 0.6, color: C.color });
  defeatEnemy(hz);
}
// Magnet + shield: a defeated enemy bursts into extra coins (the magnet pulls them in)
function dropComboCoins(hz) {
  const MS = POWERUPS.combos.magnetShield;
  for (let i = 0; i < MS.dropCoins; i++) {
    const a = (i / MS.dropCoins) * Math.PI * 2 + 0.4;
    coins.push({ x: hz.x + Math.cos(a) * MS.dropSpread, y: hz.y + Math.sin(a) * MS.dropSpread, r: 10, collected: false,
      sparkle: Math.random() * Math.PI * 2, drop: true });
  }
  debugStats.comboDrops += MS.dropCoins;
}
function magnetRadius() {
  if (STRESS.on) return W + H; // stress test: every coin on screen
  const C = POWERUPS.combos;
  return POWERUPS.magnet.radius * (ninja.rocketT > 0 ? C.magnetRocket.radiusMult : (ninja.superSpin ? C.magnetSuper.radiusMult : 1));
}
function tickPowerTimers() {
  if (ninja.magnetT > 0) ninja.magnetT--;
  if (ninja.invulnT > 0) ninja.invulnT--;
  if (ninja.shieldPop > 0) ninja.shieldPop = Math.max(0, ninja.shieldPop - 0.05);
}

// --- Ninja Raposa: auto-throws a shuriken at the nearest blue enemy in range (cooldown); a hit defeats it ---
function updateShurikens() {
  const SK = abilityValue('shuriken', null);
  if (ninjaShurikenCd > 0) ninjaShurikenCd--;
  if (SK && !ninja.dead && ninjaShurikenCd <= 0) {
    let best = null, bd = SK.range;
    for (const hz of hazards) {
      if (!hz.alive || hz.dying > 0 || hz.ghost || hz.fatal || hz.color === 'red') continue;
      if (hz.type !== 'flyer' && hz.type !== 'ufo') continue;
      if (hz.y < camera.y || hz.y > camera.y + H) continue;
      const d = Math.hypot(hz.x - ninja.x, hz.y - ninja.y);
      if (d < bd && !shurikens.some(s => s.target === hz)) { bd = d; best = hz; }
    }
    if (best) {
      const a = Math.atan2(best.y - ninja.y, best.x - ninja.x);
      shurikens.push({ x: ninja.x, y: ninja.y, vx: Math.cos(a) * SK.speed, vy: Math.sin(a) * SK.speed, rot: 0, life: 60, target: best });
      ninjaShurikenCd = SK.cooldown;
      beep(1400, 0.04, 'triangle', 0.04);
    }
  }
  for (let i = shurikens.length - 1; i >= 0; i--) {
    const s = shurikens[i], t = s.target;
    if (t && t.alive && !(t.dying > 0)) { // light homing so a moving bird is still hit
      const a = Math.atan2(t.y - s.y, t.x - s.x), sp = Math.hypot(s.vx, s.vy);
      s.vx += (Math.cos(a) * sp - s.vx) * 0.25; s.vy += (Math.sin(a) * sp - s.vy) * 0.25;
    }
    s.x += s.vx; s.y += s.vy; s.rot += 0.5; s.life--;
    if (t && t.alive && !(t.dying > 0) && Math.hypot(t.x - s.x, t.y - s.y) < (t.r || t.rx || 14) + 6) {
      debugStats.shurikenKills = (debugStats.shurikenKills || 0) + 1;
      countHit(t.kind + ':shuriken');
      defeatEnemy(t);
      shurikens.splice(i, 1);
      continue;
    }
    if (s.life <= 0 || (t && (!t.alive || t.dying > 0))) shurikens.splice(i, 1);
  }
}
