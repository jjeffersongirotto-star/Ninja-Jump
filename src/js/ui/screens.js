// --- Screens (overlay panels): main menu / game over, characters, options, pause ---
let screen = 'main';
let optionsBack = 'main';   // where "Voltar" in Opções returns to (main menu or pause)
function showScreen(name) {
  screen = name;
  for (const k in SCREENS) {
    const el = document.getElementById(SCREENS[k]);
    if (el) { if (k === name) el.classList.remove('hidden'); else el.classList.add('hidden'); }
  }
  if (!name) { overlay.classList.add('hidden'); return; }
  overlay.classList.remove('hidden');
  if (name === 'main') titleEl.textContent = state === 'gameover' ? 'Fim de jogo' : 'Ninja Jump';
  else titleEl.textContent = SCREEN_TITLES[name] || '';
  if (name === 'main' || name === 'chars') refreshWallet();
  if (name === 'chars') renderChars();
  if (name === 'audio') refreshSoundUi();
  if (name === 'controls') refreshControlsUi();
}
function goBack() {
  if (screen === 'audio' || screen === 'controls') showScreen('options');
  else if (screen === 'options' && optionsBack === 'pause') showScreen('pause');
  else showScreen('main');
}

// --- Wallet & characters ---
function getWallet() { return Math.max(0, parseInt(store.get(LS_WALLET) || '0', 10) || 0); }
function addWallet(n) { if (n > 0) store.set(LS_WALLET, String(getWallet() + n)); refreshWallet(); }
function refreshWallet() {
  const w = String(getWallet());
  if (walletVal) walletVal.textContent = w;
  if (walletVal2) walletVal2.textContent = w;
}
function ownedSkins() {
  const list = (store.get(LS_SKINS) || '').split(',');
  const out = {};
  for (const sk of SKINS) if (sk.price === 0 || list.indexOf(sk.id) >= 0) out[sk.id] = true;
  return out;
}
function skinById(id) { for (const sk of SKINS) if (sk.id === id) return sk; return null; }
function loadSkin() {
  const sk = skinById(store.get(LS_SKIN) || '');
  skin = sk && ownedSkins()[sk.id] ? sk : SKINS[0];
}
let pendingBuy = null;
function onCharTap(sk) {
  const owned = ownedSkins();
  if (owned[sk.id]) {
    skin = sk;
    store.set(LS_SKIN, sk.id);
    pendingBuy = null;
    charsMsg.textContent = '';
    beep(660, 0.06, 'sine', 0.06);
  } else if (getWallet() < sk.price) {
    pendingBuy = null;
    charsMsg.textContent = 'Faltam ' + (sk.price - getWallet()) + ' moedas para liberar';
    beep(160, 0.1, 'square', 0.05);
  } else if (pendingBuy !== sk.id) {
    pendingBuy = sk.id;
    charsMsg.textContent = 'Toque de novo para comprar por ' + sk.price + ' 🪙';
  } else {
    pendingBuy = null;
    store.set(LS_WALLET, String(getWallet() - sk.price));
    const list = (store.get(LS_SKINS) || '').split(',').filter(Boolean);
    list.push(sk.id);
    store.set(LS_SKINS, list.join(','));
    skin = sk;
    store.set(LS_SKIN, sk.id);
    charsMsg.textContent = sk.name + ' liberado!';
    beep(880, 0.08, 'sine', 0.07);
    beep(1320, 0.12, 'triangle', 0.05);
  }
  refreshWallet();
  renderChars();
}
function renderChars() {
  if (!charsList) return;
  const owned = ownedSkins();
  charsList.innerHTML = '';
  for (const sk of SKINS) {
    const b = document.createElement('button');
    b.className = 'char' + (owned[sk.id] ? '' : ' locked') + (sk === skin ? ' sel' : '');
    const cv = document.createElement('canvas');
    b.appendChild(cv);
    if (!owned[sk.id]) { const l = document.createElement('div'); l.className = 'lock'; l.textContent = '🔒'; b.appendChild(l); }
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = sk.name; b.appendChild(nm);
    const st = document.createElement('div'); st.className = 'st';
    st.textContent = sk === skin ? 'Selecionado' : (owned[sk.id] ? 'Selecionar' : (pendingBuy === sk.id ? 'Comprar?' : '🪙 ' + sk.price));
    b.appendChild(st);
    b.addEventListener('click', function (e) { e.stopPropagation(); onCharTap(sk); }, false);
    charsList.appendChild(b);
    try { drawSkinPreview(cv, sk); } catch (err) { logErr('preview', err); }
  }
}
// Draw a character standing still on a small canvas (swaps the global ctx/ninja/skin, then restores)
function drawSkinPreview(cv, sk) {
  const size = 84, r = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(size * r); cv.height = Math.round(size * r);
  const c = cv.getContext('2d');
  if (!c) return;
  const saved = { ctx: ctx, ninja: ninja, skin: skin, elastic: elastic, stretch: stretch };
  const pose = {};
  for (const k in ninjaPose) pose[k] = ninjaPose[k];
  try {
    ctx = c; skin = sk; elastic = null; stretch = 0;
    ninja = { x: 0, y: 0, vx: 0, vy: 0, facing: 1, spinning: 0 };
    ninjaPose.crouch = 0; ninjaPose.launch = 0; ninjaPose.relax = 0; ninjaPose.wallKick = 0;
    c.setTransform(r * 2, 0, 0, r * 2, 0, 0);
    drawNinjaSprite(size / 4, size / 4 - 1);
  } finally {
    ctx = saved.ctx; ninja = saved.ninja; skin = saved.skin; elastic = saved.elastic; stretch = saved.stretch;
    for (const k in pose) ninjaPose[k] = pose[k];
  }
}

// --- Options (audio) ---
function loadSound() { soundOn = store.get(LS_SOUND) !== '0'; }
function refreshSoundUi() {
  if (!soundToggle) return;
  soundToggle.setAttribute('aria-checked', soundOn ? 'true' : 'false');
  soundLabel.textContent = soundOn ? 'Ligado' : 'Desligado';
}
function toggleSound() {
  soundOn = !soundOn;
  store.set(LS_SOUND, soundOn ? '1' : '0');
  refreshSoundUi();
  ensureAudio();
  beep(660, 0.06, 'sine', 0.06);
}

// --- Pause: the world freezes; "Continuar" resumes after a 3-second countdown ---
let paused = false;
let countdownTimer = null;
function pauseGame() {
  if (state !== 'playing' || (ninja && ninja.dead)) return;
  stopCountdown();
  paused = true;
  drawing = null;
  mouseDown = false;
  touchId = null;
  showScreen('pause');
}
function stopCountdown() {
  if (countdownTimer) { clearTimeout(countdownTimer); countdownTimer = null; }
  if (countdownEl) { countdownEl.classList.remove('active'); countdownEl.innerHTML = ''; }
}
function resumeWithCountdown() {
  if (state !== 'playing') return;
  showScreen(null);
  let n = 3;
  function tick() {
    if (n <= 0) { stopCountdown(); paused = false; return; }
    countdownEl.innerHTML = '<span>' + n + '</span>';
    countdownEl.classList.add('active');
    beep(n === 1 ? 880 : 660, 0.08, 'sine', 0.06);
    n--;
    countdownTimer = setTimeout(tick, 1000);
  }
  tick();
}
function quitToMenu() {
  if (state !== 'playing') return;
  endRun();
  state = 'menu';
  ninja = { x: W / 2, y: H * 0.38, vx: 0, vy: 0, facing: 1, spinning: 0 };
  camera = { y: 0 };
  elastic = null;
  hazards = []; coins = []; particles = []; rings = []; floaters = [];
  groundY = 0;
  shake = 0;
  resetMainMenu();
  showScreen('main');
}
