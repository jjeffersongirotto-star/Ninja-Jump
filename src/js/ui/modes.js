// --- Modes menu: start a mode, 60 s ranking, daily/weekly missions ---
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
function refreshModesInfo() {
  const el = document.getElementById('modesInfo');
  if (!el) return;
  const d = dailyState(), n = Object.keys(d.done).length;
  el.textContent = 'Desafio diário: mesma fase para todos hoje · missões de hoje ' + n + '/3 (+' + DAILY_REWARD + ' 🪙 cada). ' +
    'Sem elástico: só pulos (toque) na parede, no chão, nas plataformas e nos inimigos.';
}
function renderRanking() {
  const box = document.getElementById('rankingList');
  if (!box) return;
  box.innerHTML = '';
  const rank = loadRanking();
  if (!rank.length) { box.appendChild(modeRow('Ainda sem partidas', '—', false)); return; }
  rank.forEach(function (e, i) { box.appendChild(modeRow((i + 1) + 'º', e.m + ' m', i === 0)); });
}
function renderMissions() {
  const box = document.getElementById('missionsList');
  if (!box) return;
  box.innerHTML = '';
  const d = dailyState(), w = weeklyState();
  const h1 = document.createElement('h4'); h1.textContent = 'Desafio diário (jogue o modo diário) · ' + DAILY_REWARD + ' 🪙 cada';
  box.appendChild(h1);
  for (const mi of dailyMissionsFor(d.day)) {
    const cur = Math.min(mi.goal, Math.floor(d.best[mi.stat] || 0));
    box.appendChild(modeRow(mi.text, d.done[mi.id] ? '✅' : cur + '/' + mi.goal, !!d.done[mi.id]));
  }
  const h2 = document.createElement('h4'); h2.textContent = 'Missões da semana · ' + WEEKLY_REWARD + ' 🪙 cada';
  box.appendChild(h2);
  for (const mi of weeklyMissionsFor(w.week)) {
    const cur = Math.min(mi.goal, Math.floor(w.prog[mi.id] || 0));
    box.appendChild(modeRow(mi.text, w.done[mi.id] ? '✅' : cur + '/' + mi.goal, !!w.done[mi.id]));
  }
}
