// --- HUD, game over and start of a run ---
// HUD: touch the DOM only when a value actually changes (it used to be rewritten every frame)
const hudShown = { meters: -1, coins: -1, width: '', bg: '' };
function resetHudCache() { hudShown.meters = -1; hudShown.coins = -1; hudShown.width = ''; hudShown.bg = ''; }
// Progress toward the NEXT scenery (Colinas -> Montanhas -> ...); full after the last one
function themeProgress(m) {
  let i = 0;
  while (i < BANDS.length - 1 && m >= BANDS[i + 1].at) i++;
  if (i >= BANDS.length - 1) return 1;
  return Math.max(0, Math.min(1, (m - BANDS[i].at) / (BANDS[i + 1].at - BANDS[i].at)));
}
function updateHud(meters) {
  if (bestHeight !== hudShown.meters) { hudShown.meters = bestHeight; metersVal.textContent = String(bestHeight); }
  if (runCoins !== hudShown.coins) { hudShown.coins = runCoins; coinsHud.textContent = '🪙 ' + runCoins; }
  const width = (Math.round(themeProgress(meters) * 1000) / 10) + '%';
  if (width !== hudShown.width) { hudShown.width = width; progressBar.style.width = width; }
  const bg = 'linear-gradient(90deg, ' + atmosCache.accent + ', ' + atmosCache.elastic + ')';
  if (bg !== hudShown.bg) { hudShown.bg = bg; progressBar.style.background = bg; }
}

let streakShown = -1;
function updateStreakHud() {
  const n = state === 'playing' ? shortStreak : 0;
  if (n === streakShown || !streakEl) return;
  streakShown = n;
  for (let i = 0; i < streakPips.length; i++) {
    if (i < n) streakPips[i].classList.add('on'); else streakPips[i].classList.remove('on');
  }
  if (n > 0) streakEl.classList.add('active'); else streakEl.classList.remove('active');
}

// End of a run (game over or "Sair"): save records and bank the coins
function endRun() {
  shortStreak = 0;
  updateStreakHud();
  stopCountdown();
  paused = false;
  drawing = null;
  addWallet(runCoins);
  try { missionEndRun(); } catch (e) { logErr('missions', e); }
  metersEl.classList.remove('active');
  progressEl.classList.remove('active');
  hud.classList.remove('active');
  return saveRecords(bestHeight, runCoins);
}

function gameOver() {
  state = 'gameover';
  const isNew = endRun();
  showScreen('main');
  goStats.style.display = 'block';
  recordsBox.style.display = 'block';
  overlaySub.style.display = 'none';
  goMeters.textContent = bestHeight + ' m';
  goCoins.textContent = String(runCoins);
  newRec.style.display = isNew ? 'block' : 'none';
  const gu = document.getElementById('goUnlock');
  if (gu) {
    gu.textContent = runMission.unlocked.length ? '🎉 Novo personagem liberado: ' + runMission.unlocked.join(', ') + '!' : '';
    gu.style.display = runMission.unlocked.length ? 'block' : 'none';
  }
  hideUnlockToast(); // the game-over screen lists them instead
  playBtn.textContent = 'Jogar de novo';
  titleEl.textContent = 'Fim de jogo';
  beep(150, 0.2, 'sawtooth', 0.08);
  beep(100, 0.3, 'square', 0.06);
}

function startPlay() {
  ensureAudio();
  resetGame();
  state = 'playing';
  missionResetRun();
  streakShown = -1;
  resetHudCache();
  lastThemeName = '';
  updateStreakHud();
  paused = false;
  stopCountdown();
  showScreen(null);
  metersEl.classList.add('active');
  progressEl.classList.add('active');
  hud.classList.add('active');
  resetMainMenu();
  beep(523, 0.08, 'sine', 0.08);
  beep(784, 0.1, 'sine', 0.06);
}

function resetMainMenu() {
  titleEl.textContent = 'Ninja Jump';
  goStats.style.display = 'none';
  overlaySub.style.display = 'block';
  recordsBox.style.display = 'block';
  playBtn.textContent = 'Jogar';
}
