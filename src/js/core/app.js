// --- Installable app (PWA) ---
// When the game is served over https (GitHub Pages), a service worker (sw.js) keeps it working
// offline and the browser can install it as an app. Opened as a plain file (WhatsApp, file manager)
// none of this runs and the game works as before.
const installBtn = document.getElementById('installBtn');
const installHint = document.getElementById('installHint');
const updateBtn = document.getElementById('updateBtn');
const updateStatus = document.getElementById('updateStatus');
let installPrompt = null; // Android/desktop Chrome: deferred "install" prompt
let serviceWorkerRegistration = null;
let updateReloadPending = false;

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
function updateMessage(message) {
  if (updateStatus) updateStatus.textContent = message;
}
async function checkForUpdate() {
  if (!updateBtn) return;
  if (!('serviceWorker' in navigator) || !isServed() || /; wv\)/.test(navigator.userAgent || '')) {
    updateMessage('Atualização automática só funciona no jogo aberto pelo link ou instalado.');
    return;
  }
  if (!navigator.onLine) {
    updateMessage('Conecte-se à internet para procurar atualizações.');
    return;
  }
  updateBtn.disabled = true;
  updateBtn.classList.add('checking');
  updateMessage('Procurando atualização...');
  try {
    const registration = serviceWorkerRegistration || await navigator.serviceWorker.ready;
    serviceWorkerRegistration = registration;
    updateReloadPending = true;
    await registration.update();
    if (registration.installing || registration.waiting) {
      updateMessage('Atualização encontrada. Aplicando...');
      return;
    }
    updateReloadPending = false;
    updateMessage('O jogo já está atualizado.');
  } catch (err) {
    updateReloadPending = false;
    logErr('update check', err);
    updateMessage('Não foi possível procurar atualização. Tente novamente.');
  } finally {
    updateBtn.disabled = false;
    updateBtn.classList.remove('checking');
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
  if (updateBtn) {
    updateBtn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      checkForUpdate();
    });
  }
  // not inside the Android app's WebView (it serves the game from its own assets, there is no sw.js)
  if ('serviceWorker' in navigator && isServed() && !/; wv\)/.test(navigator.userAgent || '')) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (updateReloadPending) location.reload();
    });
    navigator.serviceWorker.register('sw.js')
      .then(function (registration) { serviceWorkerRegistration = registration; })
      .catch(function (err) { logErr('service worker', err); updateMessage('Atualizações não estão disponíveis.'); });
  }
}
