// --- Game modes and rotating missions ---
// gameMode: 'normal' | 'noelastic' (wall jumps and stomps only).
// Normal runs record distance at 60 s; mission periods follow the device date.
const MODE_TA_SECONDS = 60;
const RANKING_SIZE = 10;
const DAILY_REWARD = 100, WEEKLY_REWARD = 300;
// vy: strong jump (crosses the screen); weak: share of vy/vx used when nothing was tapped; coyote: frames a contact stays valid
const NOELASTIC_JUMP = { dashSpeed: 12, dashMax: 70, climbSpeed: 4.2, grace: 14, stamDrain: 1 / 130, stamRegen: 1 / 200, stamRegenGround: 1 / 70, stamResume: 0.4, wallZone: 70, vy: 15.5, weak: 0.6, weakVx: 4, maxVx: 11, minVx: 2.5, coyote: 12, cooldown: 10 };
const LS_RANKING = 'ninjaJump_ranking60';
const LS_DAILY = 'ninjaJump_daily_v2';
const LS_WEEKLY = 'ninjaJump_weekly_v2';
let gameMode = 'normal';
let taDist = -1;                // metres reached when the 60 s ran out (-1 = not yet)
let modeHudShown = '';
let modeCompletionLines = [];
const modeRun = { kills: 0, blueKills: 0, ufoKills: 0, powerups: 0, chainMax: 0, bossHits: 0, fireKills: 0 };

function dayNumber() { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
function weekNumber() { return Math.floor((dayNumber() + 3) / 7); } // weeks start on Monday (1970-01-01 was a Thursday)

// Stats a mission can ask for. run: best single run | cum: added up over runs (weekly) or counted inside the run (daily)
const MODE_STATS = {
  meters:     { run: true, now: () => bestHeight,          text: g => 'Chegue a ' + g + ' m numa partida' },
  coins:      { run: true, now: () => runCoins,            text: g => 'Junte ' + g + ' moedas numa partida' },
  runSeconds: { run: true, now: () => runMission.frames / 60, text: g => 'Sobreviva ' + g + ' s numa partida' },
  totalRunSeconds: { now: () => runMission.frames / 60, text: g => 'Sobreviva por ' + g + ' segundos no total' },
  chain:      { run: true, now: () => modeRun.chainMax,    text: g => 'Faça uma corrente de combos x' + g },
  wallKicks:  { run: true, now: () => debugStats.wallKicks, text: g => 'Dê ' + g + ' chutes na parede numa partida' },
  dist60:     { run: true, now: () => taDist >= 0 ? taDist : bestHeight, text: g => 'Chegue a ' + g + ' m em 60 segundos' },
  kills:      { now: () => modeRun.kills,      text: g => 'Derrote ' + g + ' inimigos' },
  blueKills:  { now: () => modeRun.blueKills,  text: g => 'Derrote ' + g + ' pássaros azuis' },
  ufoKills:   { now: () => modeRun.ufoKills,   text: g => 'Derrote ' + g + ' discos voadores' },
  powerups:   { now: () => modeRun.powerups,   text: g => 'Pegue ' + g + ' itens' },
  bossHits:   { now: () => modeRun.bossHits,   text: g => 'Acerte o chefão ' + g + ' vezes na cabeça' },
  fireKills:  { now: () => modeRun.fireKills,  text: g => 'Queime ' + g + ' inimigos com o elástico de fogo' },
  runs:       { now: () => 1,                  text: g => 'Jogue ' + g + ' partidas' },
  totalMeters: { now: () => bestHeight,        text: g => 'Acumule ' + g + ' m somando as partidas' },
  totalCoins: { now: () => runCoins,           text: g => 'Acumule ' + g + ' moedas somando as partidas' },
  wallTotal:  { now: () => debugStats.wallKicks, text: g => 'Dê ' + g + ' chutes na parede somando as partidas' }
};
// Goals in each group are ordered from difficulty level 1 to 4; groups with 3 goals have no level 4.
const WEEKLY_GROUPS = [
  ['totalMeters', [5000, 7000, 9000, 12000]],
  ['totalCoins', [800, 1000, 1200, 1500]],
  ['totalRunSeconds', [500, 600, 700]],
  ['chain', [2, 3, 4, 5]],
  ['wallTotal', [150, 250, 350, 500]],
  ['dist60', [900, 1000, 1100, 1200]],
  ['kills', [15, 20, 40, 80]],
  ['blueKills', [10, 15, 30, 60]],
  ['wallKicks', [20, 35, 40, 50]],
  ['ufoKills', [3, 4, 6, 10]],
  ['powerups', [10, 18, 35, 60]],
  ['bossHits', [5, 7, 9, 12]],
  ['fireKills', [3, 5, 8, 10]],
  ['runs', [10, 15, 20, 25]],
  ['meters', [1300, 1500, 1600]],
  ['coins', [120, 140, 160]],
  ['runSeconds', [80, 90, 100]]
];
const WEEKLY_MISSIONS = [];
for (const group of WEEKLY_GROUPS) {
  const stat = group[0], goals = group[1], text = MODE_STATS[stat].text;
  for (let i = 0; i < goals.length; i++) {
    WEEKLY_MISSIONS.push({ id: WEEKLY_MISSIONS.length, stat: stat, goal: goals[i], level: i + 1, text: text(goals[i]) });
  }
}
function weeklyMissionsFor(week) {
  // The weekly seed keeps the random set identical for everyone throughout the week.
  const rng = mulberry32(week * 2654435 + 29);
  return [4, 3, 1, 2].map(level => {
    const choices = WEEKLY_MISSIONS.filter(mi => mi.level === level);
    return choices[Math.floor(rng() * choices.length)];
  });
}
// Daily: 3 different mission categories, picked from the date.
const DAILY_POOL = [
  ['meters', [800, 900, 1000]], ['coins', [60, 70, 80]], ['runSeconds', [40, 50, 60]], ['chain', [2, 3]],
  ['wallKicks', [15, 20, 25]], ['kills', [3, 5, 8]], ['blueKills', [2, 4, 6]], ['powerups', [5, 7, 10]]
];
function dailyMissionsFor(day) {
  const rng = mulberry32(day * 2654435 + 17), pool = DAILY_POOL.slice(), out = [];
  for (let k = 0; k < 3; k++) {
    const fam = pool.splice(Math.floor(rng() * pool.length), 1)[0], goal = fam[1][Math.floor(rng() * fam[1].length)];
    out.push({ id: k, stat: fam[0], goal: goal, text: MODE_STATS[fam[0]].text(goal).replace(' numa partida', '') });
  }
  return out;
}
function loadJson(key) { try { const v = JSON.parse(store.get(key) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
function dailyState() {
  let s = loadJson(LS_DAILY);
  if (!s || s.day !== dayNumber()) s = { day: dayNumber(), best: {}, done: {} };
  return s;
}
function weeklyState() {
  let s = loadJson(LS_WEEKLY);
  if (!s || s.week !== weekNumber()) s = { week: weekNumber(), prog: {}, done: {} };
  return s;
}
function loadRanking() {
  const r = loadJson(LS_RANKING);
  return Array.isArray(r) ? r.filter(e => e && +e.m >= 0).slice(0, RANKING_SIZE) : [];
}

function modesResetRun() {
  modeRun.kills = 0; modeRun.blueKills = 0; modeRun.ufoKills = 0; modeRun.powerups = 0;
  modeRun.chainMax = 0; modeRun.bossHits = 0; modeRun.fireKills = 0;
  modeCompletionLines = [];
  taDist = -1;
  modeHudShown = '';
}
function modesKill(hz) {
  modeRun.kills++;
  if (hz.type === 'ufo') modeRun.ufoKills++;
  else if (hz.type === 'flyer' && hz.color !== 'red') modeRun.blueKills++;
}

// Every frame while playing: the 60 s mark and the small timer under the progress bar
function modesTick() {
  if (taDist < 0 && runMission.frames >= MODE_TA_SECONDS * 60) taDist = Math.floor(bestHeight);
  if (frame % 10 === 0) updateModeMissions(false);
  if (frame % 6 !== 0) return;
  let txt = '';
  if (gameMode === 'normal') txt = taDist >= 0 ? '⏱ ' + taDist + ' m' : '⏱ ' + (MODE_TA_SECONDS - Math.floor(runMission.frames / 60));
  else if (gameMode === 'noelastic') txt = '🧗 Sem elástico';
  if (txt === modeHudShown) return;
  modeHudShown = txt;
  const el = document.getElementById('modeHud');
  if (!el) return;
  el.textContent = txt;
  el.classList.toggle('active', !!txt);
}
function modesHideHud() {
  modeHudShown = '';
  const el = document.getElementById('modeHud');
  if (el) { el.textContent = ''; el.classList.remove('active'); }
}

function completeModeMission(period, mi, reward) {
  const label = period === 'day' ? 'Missão diária' : 'Missão semanal';
  const line = '✅ ' + label + ': ' + mi.text + ' +' + reward + ' 🪙';
  modeCompletionLines.push(line);
  addWallet(reward);
  showMissionToast('🎯 ' + label + ' concluída: ' + mi.text + ' · +' + reward + ' moedas');
}
function updateModeMissions(finalize) {
  const d = dailyState();
  let dailyChanged = false;
  for (const mi of dailyMissionsFor(d.day)) {
    const v = Math.floor(MODE_STATS[mi.stat].now());
    const best = Math.max(d.best[mi.stat] || 0, v);
    if (finalize && best > (d.best[mi.stat] || 0)) { d.best[mi.stat] = best; dailyChanged = true; }
    if (!d.done[mi.id] && best >= mi.goal) {
      d.best[mi.stat] = best;
      d.done[mi.id] = 1;
      dailyChanged = true;
      completeModeMission('day', mi, DAILY_REWARD);
    }
  }
  if (finalize || dailyChanged) store.set(LS_DAILY, JSON.stringify(d));

  const w = weeklyState();
  let weeklyChanged = false;
  for (const mi of weeklyMissionsFor(w.week)) {
    if (w.done[mi.id]) continue;
    if (!finalize && mi.stat === 'runs') continue;
    const st = MODE_STATS[mi.stat], current = Math.floor(st.now());
    const previous = w.prog[mi.id] || 0;
    const next = st.run ? Math.max(previous, current) : previous + current;
    if (finalize || next >= mi.goal) { w.prog[mi.id] = next; weeklyChanged = true; }
    if (next >= mi.goal) {
      w.done[mi.id] = 1;
      weeklyChanged = true;
      completeModeMission('week', mi, WEEKLY_REWARD);
    }
  }
  if (finalize || weeklyChanged) store.set(LS_WEEKLY, JSON.stringify(w));
}

// End of a run: save the ranking and any progress not already completed live.
function modesEndRun() {
  const lines = [];
  if (gameMode === 'normal') {
    const m = taDist >= 0 ? taDist : Math.floor(bestHeight);
    if (m > 0) {
      const rank = loadRanking();
      rank.push({ m: m, d: dayNumber() });
      rank.sort((a, b) => b.m - a.m);
      store.set(LS_RANKING, JSON.stringify(rank.slice(0, RANKING_SIZE)));
      const pos = rank.slice(0, RANKING_SIZE).findIndex(e => e.m === m && e.d === dayNumber());
      lines.push('⏱ Em 60 s: ' + m + ' m' + (pos >= 0 ? ' (ranking: ' + (pos + 1) + 'º)' : ''));
    }
  }
  updateModeMissions(true);
  lines.push.apply(lines, modeCompletionLines);
  modeCompletionLines = [];
  return lines;
}

// --- No-elastic mode: while airborne a tap sets where the next jump goes; touching a surface (ground, platform,
// wall, stomped enemy) jumps by itself toward it. No tap = a weaker jump to the opposite side. The first jump waits for a tap. ---
function noElasticTap(x, y) {
  if (!ninja || ninja.dead || state !== 'playing' || paused) return;
  ninja.aimX = x; ninja.aimY = y + camera.y; ninja.holdX = x;
  // a tap while the feet touch a structure, or just after leaving it, launches toward the tapped point
  const J = NOELASTIC_JUMP;
  if (ninja.neIdle) { ninja.jumpT = J.coyote; noElasticJump(); }
  else if (ninja.jumpT > 0 || frame - ninja.lastJ <= J.grace) { ninja.jumpT = J.coyote; ninja.neCd = 0; noElasticJump(); }
}
function noElasticJump() {
  const J = NOELASTIC_JUMP;
  const g = GRAVITY_BASE * difficultyAt(worldToMeters(ninja.y)).gravityScale;
  const travel = 2 * J.vy / g * 0.84; // horizontal reach per unit of vx over the whole flight (drag included)
  let vy, vx;
  ninja.dash = 0;
  if (ninja.aimX !== null && ninja.wallT > 0 && Math.abs(ninja.aimX - (ninja.wallDir > 0 ? 0 : W)) < NOELASTIC_JUMP.wallZone) ninja.aimX = null;
  if (ninja.aimX !== null) {
    // straight, fast dash to the tapped point; gravity only returns once he gets there (then the arc starts)
    const tx = ninja.aimX, ty = Math.min(ninja.aimY, ninja.y - 60);
    const dx = tx - ninja.x, dy = ty - ninja.y, d = Math.hypot(dx, dy) || 1;
    vx = dx / d * J.dashSpeed; vy = dy / d * J.dashSpeed;
    ninja.dash = Math.min(J.dashMax, Math.ceil(d / J.dashSpeed));
  } else {
    const dir = ninja.wallT > 0 ? ninja.wallDir : -ninja.neDir;
    vx = dir * J.weakVx;
    vy = -J.vy * J.weak;
  }
  ninja.vy = vy; ninja.vx = vx; ninja.lastJ = frame;
  ninja.neDir = vx < 0 ? -1 : 1;
  ninja.aimX = null; ninja.neIdle = false;
  ninja.jumpT = 0; ninja.wallT = 0; ninja.climb = 0; ninja.neCd = J.cooldown;
  ninja.floatT = 0;
  ninja.spinning = 0;
  ninjaPose.launch = 1;
  ninjaPose.crouch = Math.max(ninjaPose.crouch, 0.6);
  burst(ninja.x, ninja.y + NINJA_R, '#ffffff', 6, 2.2);
  beep(520, 0.06, 'triangle', 0.06);
}
// Letting go while climbing a wall: diagonal jump toward the opposite wall
function noElasticRelease() {
  if (!ninja) return;
  ninja.holdX = null;
  if (ninja.climb) {
    ninja.aimX = ninja.wallDir > 0 ? W - NINJA_R : NINJA_R;
    ninja.aimY = ninja.y - 260;
    noElasticJump();
  }
}
function noElasticTick() {
  if (gameMode !== 'noelastic' || ninja.dead) return;
  const J = NOELASTIC_JUMP;
  if (ninja.jumpT > 0) ninja.jumpT--;
  if (ninja.wallT > 0) ninja.wallT--;
  if (ninja.neCd > 0) ninja.neCd--;
  // only real supports count: the ground itself (no floating zone), platforms/stomps (set by hazards) and the side walls
  const onGround = groundY && ninja.vy >= -1 && ninja.y + NINJA_R >= groundY - 3 && groundY - camera.y <= H;
  if (onGround) ninja.jumpT = J.coyote;
  const left = ninja.x <= NINJA_R + 1, right = ninja.x >= W - NINJA_R - 1;
  if (left || right) {
    ninja.wallT = J.coyote;
    ninja.wallDir = left ? 1 : -1;
    // holding the screen at the wall edge: run up the wall
    if (ninja.exh && ninja.stam >= J.stamResume) ninja.exh = false;
    if (ninja.holdX !== null && !ninja.exh && (left ? ninja.holdX < J.wallZone : ninja.holdX > W - J.wallZone)) {
      ninja.stam -= J.stamDrain;
      if (ninja.stam <= 0) { ninja.stam = 0; ninja.exh = true; ninja.climb = 0; ninja.holdX = null; ninja.aimX = null; return; }
      ninja.facing = left ? -1 : 1;
      ninja.climb = 1; ninja.dash = 0; ninja.aimX = null;
      ninja.vy = -J.climbSpeed; ninja.vx = left ? -1 : 1; ninja.floatT = 0;
      return;
    }
    ninja.jumpT = J.coyote;
  }
  if (ninja.climb) ninja.climb = 0;
  if (ninja.stam < 1) {
    ninja.stam = Math.min(1, ninja.stam + (onGround ? J.stamRegenGround : J.stamRegen));
    if (ninja.exh && ninja.stam >= J.stamResume) ninja.exh = false;
  }
  if (ninja.jumpT > 0 && ninja.neCd <= 0 && !ninja.neIdle) noElasticJump();
}
