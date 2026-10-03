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
  if (dlgIsOpen()) { dlgClose(); return; }
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
// Characters taken out of the game: a save that bought one gets its coins back (once) and loses the id.
function refundRemovedSkins() {
  const list = (store.get(LS_SKINS) || '').split(',');
  let refund = 0;
  const keep = list.filter(function (id) { if (REMOVED_SKINS[id]) { refund += REMOVED_SKINS[id]; return false; } return true; });
  if (refund > 0) { store.set(LS_SKINS, keep.join(',')); addWallet(refund); }
}
function loadSkin() {
  try { refundRemovedSkins(); } catch (e) { logErr('refund', e); }
  const sk = skinById(store.get(LS_SKIN) || '');
  skin = sk && ownedSkins()[sk.id] ? sk : SKINS[0];
}
// --- Confirmation dialog (Sim / Não, or just OK) ---
let dlgYesFn = null;
function dlgOpen(sk, text, sub, bad, yesFn) {
  if (!dlgEl) return;
  document.getElementById('dlgText').textContent = text;
  const subEl = document.getElementById('dlgSub');
  subEl.textContent = sub || '';
  subEl.className = 'dlg-sub' + (bad ? ' bad' : '');
  dlgYesFn = yesFn || null;
  document.getElementById('dlgBtns').className = 'dlg-btns' + (yesFn ? '' : ' hidden');
  document.getElementById('dlgOkRow').className = 'dlg-btns' + (yesFn ? ' hidden' : '');
  const rar = document.getElementById('dlgRar'), desc = document.getElementById('dlgDesc');
  if (rar) { const r = sk.rarity || 0; rar.textContent = RARITY_NAMES[r]; rar.style.color = RARITY_COLORS[r]; }
  if (desc) desc.textContent = sk.desc || '';
  const pic = document.getElementById('dlgPic');
  try { drawSkinPreview(pic, sk); } catch (err) { logErr('preview', err); }
  dlgEl.classList.remove('hidden');
}
function dlgClose() { if (dlgEl) dlgEl.classList.add('hidden'); dlgYesFn = null; }
function dlgIsOpen() { return !!(dlgEl && !dlgEl.classList.contains('hidden')); }
function initDialog() {
  if (!dlgEl) return;
  const tap = (id, fn) => document.getElementById(id).addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); fn(); }, false);
  tap('dlgYes', () => { const f = dlgYesFn; dlgClose(); if (f) f(); });
  tap('dlgNo', () => { dlgClose(); beep(330, 0.05, 'sine', 0.04); });
  tap('dlgOk', () => dlgClose());
  // tap outside the box = Não
  dlgEl.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === dlgEl) dlgClose(); }, false);
}

function buySkin(sk) {
  if (getWallet() < sk.price || ownedSkins()[sk.id]) return;
  store.set(LS_WALLET, String(getWallet() - sk.price));
  const list = (store.get(LS_SKINS) || '').split(',').filter(Boolean);
  list.push(sk.id);
  store.set(LS_SKINS, list.join(','));
  charsMsg.textContent = sk.name + ' liberado!';
  charsMsg.className = 'chars-msg ok';
  beep(880, 0.08, 'sine', 0.07);
  beep(1320, 0.12, 'triangle', 0.05);
  refreshWallet();
  renderChars();
}
function useSkin(sk) {
  skin = sk;
  store.set(LS_SKIN, sk.id);
  charsMsg.textContent = 'Agora você joga com ' + sk.name + '.';
  charsMsg.className = 'chars-msg ok';
  beep(660, 0.06, 'sine', 0.06);
  renderChars();
}
// Locked: confirm the purchase (or say how many coins are missing). Unlocked: confirm switching to it.
function onCharTap(sk) {
  const owned = ownedSkins();
  charsMsg.textContent = '';
  charsMsg.className = 'chars-msg';
  if (sk === skin) {
    charsMsg.textContent = sk.name + ' já está em uso.';
    charsMsg.className = 'chars-msg ok';
  } else if (owned[sk.id]) {
    dlgOpen(sk, 'Usar ' + sk.name + '?', '', false, () => useSkin(sk));
  } else if (getWallet() < sk.price) {
    const miss = sk.price - getWallet();
    dlgOpen(sk, sk.name + ' custa ' + sk.price + ' moedas', 'Faltam ' + miss + (miss === 1 ? ' moeda.' : ' moedas.'), true, null);
    beep(160, 0.1, 'square', 0.05);
  } else {
    dlgOpen(sk, 'Comprar ' + sk.name + ' por ' + sk.price + ' moedas?', 'Você tem ' + getWallet() + ' moedas.', false, () => buySkin(sk));
  }
}
// Grid of characters: filter chips (Todos / Meus / by rarity), sorted by price inside the list,
// scrolls in its own box. Previews come from a per-character cache (drawn once).
let charsFilter = 'all';
function initCharsFilter() {
  const bar = document.getElementById('charsFilter');
  if (!bar) return;
  const chips = bar.querySelectorAll('.chip');
  for (let i = 0; i < chips.length; i++) {
    chips[i].addEventListener('click', function (e) {
      e.stopPropagation();
      charsFilter = this.getAttribute('data-f');
      for (let j = 0; j < chips.length; j++) chips[j].className = 'chip' + (chips[j] === this ? ' on' : '');
      beep(520, 0.03, 'sine', 0.04);
      renderChars();
      if (charsList) charsList.scrollTop = 0;
    }, false);
  }
}
function renderChars() {
  if (!charsList) return;
  const owned = ownedSkins();
  const keepScroll = charsList.scrollTop;
  charsList.innerHTML = '';
  let nOwned = 0;
  for (const sk of SKINS) if (owned[sk.id]) nOwned++;
  const cnt = document.getElementById('charsCount');
  if (cnt) cnt.textContent = nOwned + ' de ' + SKINS.length + ' personagens liberados';
  const list = SKINS.filter((sk) => charsFilter === 'all' || (charsFilter === 'mine' ? !!owned[sk.id] : String(sk.rarity || 0) === charsFilter));
  list.sort((p, q) => p.price - q.price || (p.rarity || 0) - (q.rarity || 0));
  for (const sk of list) {
    const r = sk.rarity || 0;
    const b = document.createElement('button');
    b.className = 'char r' + r + (owned[sk.id] ? '' : ' locked') + (sk === skin ? ' sel' : '');
    const rl = document.createElement('div'); rl.className = 'rar'; rl.textContent = RARITY_NAMES[r]; rl.style.color = RARITY_COLORS[r]; b.appendChild(rl);
    const cv = document.createElement('canvas');
    b.appendChild(cv);
    if (!owned[sk.id]) { const l = document.createElement('div'); l.className = 'lock'; l.textContent = '🔒'; b.appendChild(l); }
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = sk.name; b.appendChild(nm);
    const st = document.createElement('div'); st.className = 'st';
    st.textContent = sk === skin ? 'Em uso' : (owned[sk.id] ? 'Usar' : '🪙 ' + sk.price);
    b.appendChild(st);
    b.addEventListener('click', function (e) { e.stopPropagation(); onCharTap(sk); }, false);
    charsList.appendChild(b);
    try { drawSkinPreview(cv, sk); } catch (err) { logErr('preview', err); }
  }
  charsList.scrollTop = keepScroll;
}
// Draw a character standing still on a small canvas (swaps the global ctx/ninja/skin, then restores)
// Every character uses the same scale and anchor, so all figures line up identically in cards and dialogs.
// The canvas is a bit taller than wide and the body sits slightly right of centre: that is the room the
// tallest / widest accessories need (antenna, antlers, horns on top; ghost wisp below; dragon tail left).
const PV_W = 84, PV_H = 110, PV_K = 1.7, PV_CX = 28.2, PV_CY = 32;
const previewCache = {};
function drawSkinPreview(cv, sk) {
  const r = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(PV_W * r); cv.height = Math.round(PV_H * r);
  const out = cv.getContext('2d');
  if (!out) return;
  const key = sk.id + '@' + r;
  let pc = previewCache[key];
  if (!pc) {
    pc = document.createElement('canvas');
    pc.width = cv.width; pc.height = cv.height;
    renderSkinPreview(pc, sk, r);
    previewCache[key] = pc;
  }
  out.drawImage(pc, 0, 0);
}
function renderSkinPreview(cv, sk, r) {
  const c = cv.getContext('2d');
  if (!c) return;
  const saved = { ctx: ctx, ninja: ninja, skin: skin, elastic: elastic, stretch: stretch };
  const pose = {};
  for (const k in ninjaPose) pose[k] = ninjaPose[k];
  try {
    ctx = c; skin = sk; elastic = null; stretch = 0;
    ninja = { x: 0, y: 0, vx: 0, vy: 0, facing: 1, spinning: 0 };
    ninjaPose.crouch = 0; ninjaPose.launch = 0; ninjaPose.relax = 0; ninjaPose.wallKick = 0; ninjaPose.hero = 0; ninjaPose.air = 0; ninjaPose.lean = 0;
    c.setTransform(r * PV_K, 0, 0, r * PV_K, 0, 0);
    if (sk.aura && FX.glow) { c.save(); c.globalCompositeOperation = 'lighter'; drawGlow(PV_CX, PV_CY + 1, 19, sk.aura, 0.45); c.restore(); }
    drawNinjaSprite(PV_CX, PV_CY);
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
