// --- Start choices, 60 s ranking and daily/weekly missions ---
function startMode(mode) {
  if (state === 'playing') return;
  const t = nowMs();
  if (t - lastStartAt < 500) return;
  lastStartAt = t;
  try {
    gameMode = mode;
    startPlay();
  } catch (err) {
    logErr('startMode', err);
    fatal(err && err.message ? err.message : err);
  }
}
function modeRow(text, val, done) {
  const row = document.createElement('div');
  row.className = 'mode-row' + (done ? ' done' : '');
  const a = document.createElement('span'), b = document.createElement('span');
  a.textContent = text; b.className = 'val'; b.textContent = val;
  row.appendChild(a); row.appendChild(b);
  return row;
}
let rankingModeTab = 'normal';
function setRankingMode(mode) {
  rankingModeTab = mode;
  renderRanking();
}
function renderRanking() {
  const box = document.getElementById('rankingList');
  if (!box) return;
  box.innerHTML = '';
  const normal = rankingModeTab === 'normal';
  const rank = normal ? loadRanking() : loadNoElasticRanking();
  const info = document.getElementById('rankingInfo');
  if (info) info.textContent = normal
    ? 'Distância alcançada em 60 segundos de partida normal (neste aparelho).'
    : 'Melhores distâncias no modo sem elástico (neste aparelho).';
  document.querySelectorAll('#rankingTabs .chip').forEach(function (tab) {
    const active = tab.dataset.mode === rankingModeTab;
    tab.classList.toggle('on', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (!rank.length) { box.appendChild(modeRow('Ainda sem partidas', '—', false)); return; }
  rank.forEach(function (e, i) { box.appendChild(modeRow((i + 1) + 'º', e.m + ' m', i === 0)); });
}
function renderMissions() {
  const box = document.getElementById('missionsList');
  if (!box) return;
  box.innerHTML = '';
  const d = dailyState(), w = weeklyState();
  const h1 = document.createElement('h4'); h1.textContent = 'Missões diárias · ' + DAILY_REWARD + ' 🪙 cada';
  box.appendChild(h1);
  for (const mi of dailyMissionsFor(d.day)) {
    const cur = Math.min(mi.goal, Math.floor(d.best[mi.stat] || 0));
    box.appendChild(modeRow(mi.text, d.done[mi.id] ? '✅' : cur + '/' + mi.goal, !!d.done[mi.id]));
  }
  const h2 = document.createElement('h4'); h2.textContent = 'Missões semanais · ' + WEEKLY_REWARD + ' 🪙 cada';
  box.appendChild(h2);
  for (const mi of weeklyMissionsFor(w.week)) {
    const cur = Math.min(mi.goal, Math.floor(w.prog[mi.id] || 0));
    box.appendChild(modeRow('Nível ' + mi.level + ' · ' + mi.text, w.done[mi.id] ? '✅' : cur + '/' + mi.goal, !!w.done[mi.id]));
  }
}
