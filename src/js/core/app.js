// --- Installable app (PWA) ---
// When the game is served over https (GitHub Pages), a service worker (sw.js) keeps it working
// offline and the browser can install it as an app. Opened as a plain file (WhatsApp, file manager)
// none of this runs and the game works as before.
const installBtn = document.getElementById('installBtn');
const installHint = document.getElementById('installHint');
let installPrompt = null; // Android/desktop Chrome: deferred "install" prompt

function isStandalone() {
  try {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  } catch (e) { return false; }
}
function isIos() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isServed() {
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}
function refreshInstallBtn() {
  if (!installBtn) return;
  const show = !isStandalone() && (!!installPrompt || (isIos() && isServed()));
  if (show) installBtn.classList.remove('hidden'); else installBtn.classList.add('hidden');
  if (!show && installHint) installHint.classList.add('hidden');
}
function onInstallTap() {
  if (installPrompt) {
    const p = installPrompt;
    installPrompt = null;
    try {
      p.prompt();
      if (p.userChoice && typeof p.userChoice.then === 'function') p.userChoice.then(refreshInstallBtn, refreshInstallBtn);
    } catch (e) { logErr('install', e); }
    refreshInstallBtn();
  } else if (installHint) {
    installHint.classList.toggle('hidden'); // iPhone/iPad: Safari has no install prompt, show how to do it
  }
}
function bindApp() {
  if (installBtn) {
    installBtn.addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); onInstallTap(); }, false);
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installPrompt = e;
    refreshInstallBtn();
  });
  window.addEventListener('appinstalled', function () { installPrompt = null; refreshInstallBtn(); });
  refreshInstallBtn();
  // not inside the Android app's WebView (it serves the game from its own assets, there is no sw.js)
  if ('serviceWorker' in navigator && isServed() && !/; wv\)/.test(navigator.userAgent || '')) {
    navigator.serviceWorker.register('sw.js').catch(function (err) { logErr('service worker', err); });
  }
}
