// --- Game modes and rotating missions ---
// gameMode: 'normal' | 'daily' (same level for everybody each day + 3 missions) | 'noelastic' (wall jumps and stomps only).
// Every run also records "distance at 60 s" (time attack, local top-10 ranking). Day/week come from the device date.
const MODE_TA_SECONDS = 60;
const RANKING_SIZE = 10;
const DAILY_REWARD = 100, WEEKLY_REWARD = 300;
const NOELASTIC_JUMP = { vy: 13.5, vx: 8.5, coyote: 12, buffer: 10 };
const LS_RANKING = 'ninjaJump_ranking60';
const LS_DAILY = 'ninjaJump_daily_v2';
const LS_WEEKLY = 'ninjaJump_weekly_v2';
let gameMode = 'normal';
let taDist = -1;                // metres reached when the 60 s ran out (-1 = not yet)
let modeHudShown = '';
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
// Daily: 3 different missions inside ONE daily-mode run, picked from the date
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
function dailySeed() { return dayNumber() * 7919 + 11; }

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
  if (frame % 6 !== 0) return;
  let txt = '';
  if (gameMode === 'normal') txt = taDist >= 0 ? '⏱ ' + taDist + ' m' : '⏱ ' + (MODE_TA_SECONDS - Math.floor(runMission.frames / 60));
  else if (gameMode === 'daily') txt = '📅 Desafio diário';
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

// End of a run: ranking, mission progress and coin rewards. Returns lines for the game-over screen.
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
  let paid = 0;
  const reward = (label, coins) => { paid += coins; lines.push('✅ ' + label + ' +' + coins + ' 🪙'); };
  if (gameMode === 'daily') {
    const s = dailyState();
    for (const mi of dailyMissionsFor(s.day)) {
      const v = Math.floor(MODE_STATS[mi.stat].now());
      if (v > (s.best[mi.stat] || 0)) s.best[mi.stat] = v;
      if (!s.done[mi.id] && (s.best[mi.stat] || 0) >= mi.goal) { s.done[mi.id] = 1; reward('Missão do dia: ' + mi.text, DAILY_REWARD); }
    }
    store.set(LS_DAILY, JSON.stringify(s));
  }
  const w = weeklyState();
  for (const mi of weeklyMissionsFor(w.week)) {
    const st = MODE_STATS[mi.stat], v = Math.floor(st.now());
    w.prog[mi.id] = st.run ? Math.max(w.prog[mi.id] || 0, v) : (w.prog[mi.id] || 0) + v;
    if (!w.done[mi.id] && w.prog[mi.id] >= mi.goal) { w.done[mi.id] = 1; reward('Missão da semana: ' + mi.text, WEEKLY_REWARD); }
  }
  store.set(LS_WEEKLY, JSON.stringify(w));
  if (paid) addWallet(paid);
  return lines;
}

// --- No-elastic mode: a tap jumps when standing on the ground / a platform, hugging a wall, or just after a stomp ---
function noElasticTap(x) { // a tap a few frames before landing is remembered
  if (!ninja || ninja.dead || state !== 'playing' || paused) return;
  ninja.tapBuf = NOELASTIC_JUMP.buffer; ninja.tapX = x;
  tryNoElasticJump();
}
function tryNoElasticJump() {
  if (!(ninja.tapBuf > 0) || !(ninja.jumpT > 0)) return;
  ninja.tapBuf = 0;
  let dir = ninja.tapX < ninja.x ? -1 : 1;
  if (ninja.wallT > 0) dir = ninja.wallDir; // kick off the wall he just touched
  ninja.vy = -NOELASTIC_JUMP.vy;
  ninja.vx = dir * NOELASTIC_JUMP.vx;
  ninja.jumpT = 0; ninja.wallT = 0;
  ninja.floatT = 0;
  ninja.spinning = 0;
  ninjaPose.launch = 1;
  ninjaPose.crouch = Math.max(ninjaPose.crouch, 0.6);
  burst(ninja.x, ninja.y + NINJA_R, '#ffffff', 6, 2.2);
  beep(520, 0.06, 'triangle', 0.06);
}
function noElasticTick() {
  if (gameMode !== 'noelastic' || ninja.dead) return;
  if (ninja.jumpT > 0) ninja.jumpT--;
  if (ninja.wallT > 0) ninja.wallT--;
  if (ninja.tapBuf > 0) ninja.tapBuf--;
  const onGround = groundY && ninja.vy > -4 && ninja.y + NINJA_R >= groundY - 60 && groundY - camera.y <= H; // also during the little idle hop
  if (onGround) ninja.jumpT = NOELASTIC_JUMP.coyote;
  if (ninja.x <= NINJA_R + 1 || ninja.x >= W - NINJA_R - 1) {
    ninja.jumpT = NOELASTIC_JUMP.coyote; ninja.wallT = NOELASTIC_JUMP.coyote;
    ninja.wallDir = ninja.x < W / 2 ? 1 : -1;
  }
  tryNoElasticJump();
}
