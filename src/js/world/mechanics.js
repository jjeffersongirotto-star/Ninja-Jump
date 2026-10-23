// --- Extra mechanics: kill chain, boss every 2000 m, fire elastic (all tuning at the top) ---
const CHAIN_MAX = 5;          // coin multiplier cap (x2, x3 ... x5)
const CHAIN_LAUNCHES = 2;     // elastic launches in a row without a kill end the chain (so does touching the ground)
const BOSS = { everyM: 2000, hp: 3, r: 46, coins: 400, ahead: 430, hitCool: 36, speed: 0.021 };
const FIRE = { chance: 0.18, coins: 20, burnReach: 8, targetsWanted: 2, targetCool: 40 }; // chance = share of items that are the fire elastic
let boss = null, nextBossM = BOSS.everyM, fireTargetCd = 0;
let chainShown = -1, chainEl = null;

// --- Kill chain ---
function chainKill() {
  ninja.chain = (ninja.chain || 0) + 1;
  ninja.chainLaunches = 0;
  if (ninja.chain > modeRun.chainMax) modeRun.chainMax = ninja.chain;
  return Math.min(CHAIN_MAX, ninja.chain);
}
function chainReset() { if (ninja) { ninja.chain = 0; ninja.chainLaunches = 0; } }
function chainOnLaunch() {
  if (!ninja.chain) return;
  if (++ninja.chainLaunches >= CHAIN_LAUNCHES) chainReset();
}
function updateChainHud() {
  const n = ninja && !ninja.dead && ninja.chain >= 1 ? Math.min(CHAIN_MAX, ninja.chain + 1) : 0;
  const shown = n >= 2 ? n : 0;
  if (shown === chainShown) return;
  chainShown = shown;
  if (!chainEl) chainEl = document.getElementById('chainHud');
  if (!chainEl) return;
  chainEl.textContent = shown ? 'x' + shown : '';
  chainEl.classList.toggle('active', shown > 0);
}

// --- Boss ---
function bossRadius() { return BOSS.r; }
function updateBoss(meters) {
  if (!boss) {
    if (meters >= nextBossM && !ninja.dead) {
      nextBossM += BOSS.everyM;
      const y = ninja.y - BOSS.ahead;
      boss = { x: W / 2, y: y, oy: y, t: 0, hp: BOSS.hp, flash: 0, cool: 0, dying: 0, r: BOSS.r };
    }
    return;
  }
  const b = boss;
  b.t++;
  if (b.flash > 0) b.flash--;
  if (b.cool > 0) b.cool--;
  if (b.dying > 0) { if (--b.dying <= 0) boss = null; return; }
  b.x = W / 2 + Math.sin(b.t * BOSS.speed) * (W / 2 - b.r - 12);
  b.y = b.oy + Math.sin(b.t * 0.045) * 14;
  if (b.y - camera.y > H + 140) { boss = null; return; }
  if (ninja.dead || b.cool > 0 || ninja.rocketT > 0) return;
  const dx = ninja.x - b.x, dy = ninja.y - b.y;
  if (Math.hypot(dx, dy) >= NINJA_R + b.r) return;
  const head = (ninja.vy > 0 && ninja.y < b.y - b.r * 0.25) || superActive();
  b.cool = BOSS.hitCool;
  if (head) bossHit(b);
  else { // touching the sides or from below only shoves him away (never fatal)
    ninja.vx = (dx < 0 ? -1 : 1) * 5;
    ninja.vy = dy < 0 ? -4 : 5;
    ninja.floatT = 0;
    shake = Math.max(shake, 5);
    beep(200, 0.08, 'square', 0.05);
  }
}
function bossHit(b) {
  b.hp--;
  modeRun.bossHits++;
  b.flash = 14;
  ninja.vy = -14;
  ninja.vx = (ninja.x < b.x ? -1 : 1) * 2.5;
  ninja.y = Math.min(ninja.y, b.y - b.r - NINJA_R + 4);
  ninja.floatT = HAZARDS.bumpFloat.frames;
  elastic = null; drawing = null;
  shake = Math.max(shake, 9);
  burst(b.x, b.y - b.r * 0.6, '#ffffff', 14, 4);
  fxSparks(b.x, b.y - b.r * 0.6, '#ffd36a', 10, 6);
  beep(240, 0.1, 'square', 0.07);
  if (b.hp > 0) return;
  b.dying = 50;
  const earned = awardRunCoins(BOSS.coins);
  floaters.push({ x: b.x, y: b.y - b.r, life: 90, text: '+' + earned });
  for (let i = 0; i < 24; i++) burst(b.x + (Math.random() - 0.5) * b.r * 1.6, b.y + (Math.random() - 0.5) * b.r, '#ffd54a', 1, 5);
  rings.push({ x: b.x, y: b.y, r: 20, life: 1, color: '#ffd54a' });
  shake = 16;
  beep(523, 0.1, 'triangle', 0.08); beep(784, 0.14, 'triangle', 0.08); beep(1047, 0.2, 'sine', 0.07);
}

// --- Fire elastic ---
function isEnemy(hz) { return hz.alive && !hz.dying && (hz.type === 'flyer' || hz.type === 'ufo'); }
function segDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1, l2 = vx * vx + vy * vy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / l2)) : 0;
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}
function burnWithElastic() {
  const e = elastic;
  if (!e || !e.fire || e.phase === 'snapped') return;
  if (frame % 3 === 0) {
    const t = Math.random();
    fxSparks(e.x1 + (e.x2 - e.x1) * t, e.y1 + (e.y2 - e.y1) * t, '#ff8a2a', 2, 2.5);
  }
  for (const hz of hazards) {
    if (!isEnemy(hz)) continue;
    const r = hz.r || Math.max(hz.rx || 0, hz.ry || 0);
    if (segDist(hz.x, hz.y, e.x1, e.y1, e.x2, e.y2) > r + FIRE.burnReach) continue;
    defeatEnemy(hz, FIRE.coins, false);
    modeRun.fireKills++;
    burst(hz.x, hz.y, '#ff7a1f', 14, 4);
    fxSparks(hz.x, hz.y, '#ffd36a', 8, 5);
  }
}
// While he holds the fire elastic there must be something to aim at on screen
function ensureFireTargets() {
  if (!ninja.fireElastic) return;
  if (fireTargetCd > 0) { fireTargetCd--; return; }
  let seen = 0;
  const top = camera.y + 60, bottom = camera.y + H - 150;
  for (const hz of hazards) if (isEnemy(hz) && hz.y > top && hz.y < bottom) seen++;
  if (seen >= FIRE.targetsWanted) return;
  fireTargetCd = FIRE.targetCool;
  for (let tries = 0; tries < 10; tries++) {
    const x = 70 + Math.random() * Math.max(10, W - 140);
    const y = camera.y + H * (0.22 + Math.random() * 0.3);
    let clear = true;
    for (const hz of hazards) if (hz.alive && Math.hypot(hz.x - x, hz.y - y) < 110) { clear = false; break; }
    if (!clear) continue;
    hazards.push(makeHazard(mkFlyer(x, 'blue', { range: 50, speed: 1.1 }, 0), y));
    return;
  }
}

function updateMechanics(meters) {
  if (ninja.y >= groundY - NINJA_R - 4) chainReset();
  updateBoss(meters);
  burnWithElastic();
  ensureFireTargets();
  updateChainHud();
}
function resetMechanics() {
  boss = null; nextBossM = BOSS.everyM; fireTargetCd = 0; chainShown = -1;
}
