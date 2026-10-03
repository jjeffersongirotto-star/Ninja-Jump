// --- Mission tracking: lifetime stats (saved) + this run's counters; unlocks mission characters ---
// Read-only hooks from the game (they never change gameplay): structure hits, elastic launches, kills,
// and a check every few frames. Config in config/missions.js.
const LS_STATS = 'ninjaJump_stats';
const RUN_STATS = ['fall', 'meters', 'wallKicks', 'coins', 'sameHits', 'ufoKills'];
let lifeStats = null;
function loadLifeStats() {
  let s = null;
  try { s = JSON.parse(store.get(LS_STATS) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  const n = (v) => Math.max(0, +v || 0);
  const best = s.best && typeof s.best === 'object' ? s.best : {};
  lifeStats = { runs: n(s.runs), totalMeters: n(s.totalMeters), blueBirds: n(s.blueBirds), nightRuns: n(s.nightRuns), ufoKills: n(s.ufoKills), best: {} };
  for (const k of RUN_STATS) lifeStats.best[k] = n(best[k]);
  // records that existed before the missions count too
  lifeStats.best.meters = Math.max(lifeStats.best.meters, n(store.get(LS_METERS)));
  lifeStats.best.coins = Math.max(lifeStats.best.coins, n(store.get(LS_COINS)));
  return lifeStats;
}
function saveLifeStats() { if (lifeStats) store.set(LS_STATS, JSON.stringify(lifeStats)); }
function stats() { return lifeStats || loadLifeStats(); }

const runMission = { fall: 0, sameHits: 0, ufoKills: 0, apexY: 0, streakId: null, streakN: 0, launched: false, night: false, unlocked: [] };
let hazardUid = 0;
function missionResetRun() {
  runMission.fall = 0; runMission.sameHits = 0; runMission.ufoKills = 0;
  runMission.apexY = ninja ? ninja.y : 0;
  runMission.streakId = null; runMission.streakN = 0; runMission.launched = false;
  runMission.night = false; runMission.unlocked = [];
  hideUnlockToast();
}
function runValue(stat) {
  if (stat === 'meters') return bestHeight;
  if (stat === 'wallKicks') return debugStats.wallKicks;
  if (stat === 'coins') return runCoins;
  return runMission[stat] || 0;
}
// Progress shown in the menu: lifetime total, or the best single run (including the one being played)
function missionProgress(sk, live) {
  const M = sk.mission, s = stats();
  let cur = M.scope === 'life' ? (s[M.stat] || 0) : Math.max(s.best[M.stat] || 0, live ? runValue(M.stat) : 0);
  cur = Math.floor(cur);
  return { cur: Math.min(cur, M.goal), goal: M.goal, done: cur >= M.goal };
}
function missionCheck(live) {
  let owned = null;
  for (const sk of SKINS) {
    if (!sk.mission) continue;
    if (!owned) owned = ownedSkins();
    if (owned[sk.id]) continue;
    if (missionProgress(sk, live).done) { missionUnlock(sk); owned = null; }
  }
}
function missionUnlock(sk) {
  const list = (store.get(LS_SKINS) || '').split(',').filter(Boolean);
  if (list.indexOf(sk.id) < 0) list.push(sk.id);
  store.set(LS_SKINS, list.join(','));
  saveLifeStats();
  runMission.unlocked.push(sk.name);
  showUnlockToast(sk);
  beep(784, 0.08, 'sine', 0.07);
  beep(1175, 0.14, 'triangle', 0.06);
}

// '37/150', '18/30 m' (per-run goals: the best run so far)
function missionProgressText(sk, mp, short) {
  const M = sk.mission, u = M.unit || '';
  const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const v = fmt(mp.cur) + '/' + fmt(mp.goal) + u;
  if (short) return v;
  return (M.scope === 'run' ? 'Melhor partida: ' : 'Progresso: ') + v;
}

// --- hooks called by the game ---
function missionHit(id) { // a structure was hit (wall kick, or a fresh bump on a platform / obstacle)
  if (state !== 'playing') return;
  if (id === runMission.streakId) {
    if (!runMission.launched) return; // same structure again without an elastic in between: ignored
    runMission.streakN++;
  } else {
    runMission.streakId = id;
    runMission.streakN = 1;
  }
  runMission.launched = false;
  if (runMission.streakN > runMission.sameHits) runMission.sameHits = runMission.streakN;
}
function missionLaunch() { // elastic launch: ends a fall (measured from the top of the jump)
  if (state !== 'playing') return;
  runMission.launched = true;
  const fall = (ninja.y - runMission.apexY) * METERS_PER_PX;
  if (fall > runMission.fall) runMission.fall = fall;
  runMission.apexY = ninja.y;
}
function missionKill(hz) {
  if (state !== 'playing') return;
  if (hz.type === 'ufo') { runMission.ufoKills++; stats().ufoKills++; }
  else if (hz.type === 'flyer' && hz.color !== 'red') stats().blueBirds++;
}
function missionTick() { // every frame while playing: cheap; full check every 10 frames
  if (ninja.vy < 0 && !ninja.dead) runMission.apexY = ninja.y; // still rising: the fall starts at the top
  if (frame % 10 !== 0) return;
  if (!runMission.night && bestHeight >= MISSION_NIGHT_M) { runMission.night = true; stats().nightRuns++; }
  missionCheck(true);
}
// End of a run: bank the run into the lifetime stats, then a last check (lifetime goals finish here)
function missionEndRun() {
  const s = stats();
  for (const k of RUN_STATS) { const v = Math.floor(runValue(k)); if (v > s.best[k]) s.best[k] = v; }
  s.totalMeters += bestHeight;
  s.runs++;
  saveLifeStats();
  missionCheck(false);
}

// --- "Novo personagem liberado" notice (in game; also listed on the game-over screen) ---
let toastTimer = 0;
function showUnlockToast(sk) {
  const el = document.getElementById('unlockToast');
  if (!el) return;
  el.textContent = '🎉 Novo personagem liberado: ' + sk.name + '!';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideUnlockToast, 3600);
}
function hideUnlockToast() {
  const el = document.getElementById('unlockToast');
  if (el) el.classList.remove('show');
}
