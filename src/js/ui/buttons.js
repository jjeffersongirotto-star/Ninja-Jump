// --- Buttons, menus and page bindings ---
// Jogar: click + touchend, guarded so one tap never starts twice
let lastStartAt = -1e9;
function onPlayTap(e) {
  if (e) {
    if (e.type === 'touchend') { try { e.preventDefault(); } catch (err) {} }
    try { e.stopPropagation(); } catch (err) {}
  }
  if (state === 'playing') return;
  const t = nowMs();
  if (t - lastStartAt < 500) return;
  lastStartAt = t;
  try {
    startPlay();
  } catch (err) {
    logErr('startPlay', err);
    fatal(err && err.message ? err.message : err);
  }
}
function bindPlayButton() {
  playBtn.addEventListener('click', onPlayTap, false);
  playBtn.addEventListener('touchend', onPlayTap, ACTIVE);
}
function onBtn(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); fn(); }, false);
}
function bindMenus() {
  onBtn('charsBtn', function () { pendingBuy = null; charsMsg.textContent = ''; showScreen('chars'); });
  onBtn('optionsBtn', function () { optionsBack = 'main'; showScreen('options'); });
  onBtn('pauseOptionsBtn', function () { optionsBack = 'pause'; showScreen('options'); });
  onBtn('resumeBtn', resumeWithCountdown);
  onBtn('quitBtn', quitToMenu);
  onBtn('soundToggle', toggleSound);
  onBtn('audioBtn', function () { showScreen('audio'); });
  onBtn('controlsBtn', function () { showScreen('controls'); });
  onBtn('ctlAuto', toggleControlsAuto);
  onBtn('ctlSwitch', function () { pickControls(controlMode === 'touch' ? 'mouse' : 'touch'); });
  onBtn('ctlTouch', function () { pickControls('touch'); });
  onBtn('ctlMouse', function () { pickControls('mouse'); });
  onBtn('pauseBtn', function () {
    if (paused && countdownTimer) pauseGame(); // pressed again during the countdown: back to the pause menu
    else if (!paused) pauseGame();
  });
  const backs = document.querySelectorAll('[data-back]');
  for (let i = 0; i < backs.length; i++) backs[i].addEventListener('click', function (e) { e.stopPropagation(); goBack(); }, false);
  // Leaving the app/tab mid-run pauses it
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'playing' && !(paused && !countdownTimer)) pauseGame();
  }, false);
}

function bindResize() {
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
  // fullscreenchange / visualViewport resize: see ui/fullscreen.js (scheduleResize)
}
