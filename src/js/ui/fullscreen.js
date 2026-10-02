// --- Fullscreen button (top-right corner: menu, game and pause) ---
// Four diagonal arrows pointing OUT = enter fullscreen; pointing IN = leave it.
// Once the player turns it on, the game stays fullscreen: if the browser drops it on its own
// (system back gesture, app switch), the icon flips back and the next tap on the game re-enters
// (browsers only allow fullscreen from a tap). Only the minimize button turns it off for good.
// Hidden where it makes no sense: no Fullscreen API (iPhone Safari), installed app already in
// fullscreen/standalone mode, Android WebView (APK), iframes that block fullscreen.
const LS_FULLSCREEN = 'ninjaJump_fullscreen';  // '1' = player wants fullscreen
const fsBtn = document.getElementById('fsBtn');
let fsWanted = false;
let fsAvailable = false;

function fsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}
function fsSupported() {
  const de = document.documentElement;
  if (!de || !(de.requestFullscreen || de.webkitRequestFullscreen)) return false;
  // false inside iframes without allowfullscreen
  if (document.fullscreenEnabled === false || (document.fullscreenEnabled === undefined && document.webkitFullscreenEnabled === false)) return false;
  return true;
}
function fsPointless() {
  if (fsElement()) return false; // our own fullscreen also matches (display-mode: fullscreen)
  try {
    if (window.matchMedia && (window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: standalone)').matches)) return true;
  } catch (e) {}
  if (navigator.standalone === true) return true;
  return /; wv\)/.test(navigator.userAgent || ''); // Android WebView (APK): already fullscreen
}
function enterFullscreen() {
  const de = document.documentElement;
  let p = null;
  try {
    if (de.requestFullscreen) p = de.requestFullscreen({ navigationUI: 'hide' });
    else if (de.webkitRequestFullscreen) p = de.webkitRequestFullscreen();
  } catch (e) { logErr('fullscreen', e); }
  const lock = function () {
    try {
      if (window.screen && screen.orientation && typeof screen.orientation.lock === 'function') {
        const l = screen.orientation.lock('portrait');
        if (l && typeof l.catch === 'function') l.catch(function () {});
      }
    } catch (e) {}
  };
  if (p && typeof p.then === 'function') p.then(lock, function (err) { logErr('fullscreen', err); refreshFsBtn(); });
  else setTimeout(lock, 300);
}
function exitFullscreen() {
  try {
    const p = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen ? document.webkitExitFullscreen() : null);
    if (p && typeof p.catch === 'function') p.catch(function () {});
  } catch (e) {}
}
function refreshFsBtn() {
  if (!fsBtn) return;
  fsAvailable = fsSupported() && !fsPointless();
  const root = document.documentElement;
  if (fsAvailable) { fsBtn.classList.remove('hidden'); root.classList.add('fs-avail'); }
  else { fsBtn.classList.add('hidden'); root.classList.remove('fs-avail'); }
  const on = !!fsElement();
  if (on) fsBtn.classList.add('on'); else fsBtn.classList.remove('on');
  fsBtn.setAttribute('aria-label', on ? 'Sair da tela cheia' : 'Tela cheia');
  fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function onFsTap() {
  if (fsElement()) {
    fsWanted = false;
    store.set(LS_FULLSCREEN, '0');
    exitFullscreen();
  } else {
    fsWanted = true;
    store.set(LS_FULLSCREEN, '1');
    enterFullscreen();
  }
}
// The browser left fullscreen on its own but the player never minimized: next tap re-enters
function onAnyTapForFs(e) {
  if (!fsWanted || !fsAvailable || fsElement()) return;
  if (e && e.target && e.target.closest && e.target.closest('#fsBtn')) return;
  enterFullscreen();
}
// Size changes (entering/leaving fullscreen, address bar, keyboard): browsers report the new
// size a little late on some phones, so measure again shortly after.
let fsResizeTimers = [];
function scheduleResize() {
  for (let i = 0; i < fsResizeTimers.length; i++) clearTimeout(fsResizeTimers[i]);
  fsResizeTimers = [];
  try { resize(); } catch (e) { logErr('resize', e); }
  [80, 250, 600].forEach(function (ms) {
    fsResizeTimers.push(setTimeout(function () { try { resize(); } catch (e) {} }, ms));
  });
}
function onFsChange() {
  refreshFsBtn();
  scheduleResize();
}
function bindFullscreen() {
  fsWanted = store.get(LS_FULLSCREEN) === '1';
  if (fsBtn) {
    fsBtn.addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); onFsTap(); }, false);
    // touch-action none on the button: no pan/zoom starting from it, the click still fires
    fsBtn.addEventListener('touchmove', function (e) { e.preventDefault(); }, ACTIVE);
  }
  document.addEventListener('fullscreenchange', onFsChange, false);
  document.addEventListener('webkitfullscreenchange', onFsChange, false);
  // pointerup / touchend count as a user tap for requestFullscreen (pointerdown on touch does not)
  if (window.PointerEvent) document.addEventListener('pointerup', onAnyTapForFs, true);
  else document.addEventListener('touchend', onAnyTapForFs, true);
  if (window.visualViewport && window.visualViewport.addEventListener) {
    window.visualViewport.addEventListener('resize', scheduleResize, false);
  }
  try {
    const mq = window.matchMedia && window.matchMedia('(display-mode: fullscreen)');
    if (mq && mq.addEventListener) mq.addEventListener('change', refreshFsBtn);
    else if (mq && mq.addListener) mq.addListener(refreshFsBtn);
  } catch (e) {}
  refreshFsBtn();
}
