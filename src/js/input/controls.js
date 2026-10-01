// --- Controls: "Dispositivos móveis" (touch) or "Computador" (mouse), chosen automatically or by hand ---
// touch: press, drag and release to draw the elastic (finger or mouse).
// mouse: the same drag works, and also click -> move the mouse -> click again (left button);
//        right click or Esc cancels the line being drawn. Esc / P pause the game.
// Automático: picks touch or mouse from the device, and follows the input actually being used.
let controlsAuto = true;
let controlMode = 'touch';

function isTouchDevice() {
  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) return false;
  } catch (e) {}
  return !!(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
}
function detectedControls() { return isTouchDevice() ? 'touch' : 'mouse'; }

function loadControls() {
  const v = store.get(LS_CONTROLS);
  controlsAuto = !(v === 'touch' || v === 'mouse');
  setControlMode(controlsAuto ? detectedControls() : v);
}
function saveControls() { store.set(LS_CONTROLS, controlsAuto ? 'auto' : controlMode); }

function setControlMode(mode) {
  if (mode !== 'touch' && mode !== 'mouse') return;
  const changed = mode !== controlMode;
  controlMode = mode;
  if (mode === 'touch' && drawing && drawing.clickMode) drawing = null;
  try { if (mode === 'mouse') canvas.classList.add('mouse-mode'); else canvas.classList.remove('mouse-mode'); } catch (e) {}
  if (overlaySub) {
    overlaySub.textContent = mode === 'mouse'
      ? 'Clique e arraste com o botão esquerdo (ou clique, mova e clique de novo) para criar um elástico. Quanto menor a linha, mais alto o salto!'
      : 'Arraste o dedo para criar um elástico. Quanto menor a linha, mais alto o salto!';
  }
  if (changed && screen === 'controls') refreshControlsUi();
}
// Automático: follow the kind of input actually used (a touch on a laptop screen, a mouse on a tablet...)
function noteInputType(pointerType) {
  if (!controlsAuto) return;
  if (pointerType === 'mouse') setControlMode('mouse');
  else if (pointerType === 'touch' || pointerType === 'pen') setControlMode('touch');
}

const CONTROL_DESC = {
  touch: '<b>Touch:</b> arraste o dedo na tela para desenhar o elástico.',
  mouse: '<b>Mouse:</b> clique com o botão esquerdo e arraste, ou clique, mova o mouse e clique de novo. <b>Esc</b> pausa.'
};
function refreshControlsUi() {
  const auto = document.getElementById('ctlAuto');
  if (!auto) return;
  auto.setAttribute('aria-checked', controlsAuto ? 'true' : 'false');
  document.getElementById('ctlAutoLabel').textContent = controlsAuto ? 'Ligado' : 'Desligado';
  const row = document.getElementById('ctlRow');
  if (controlsAuto) row.classList.add('auto'); else row.classList.remove('auto');
  const sw = document.getElementById('ctlSwitch');
  if (controlMode === 'mouse') sw.classList.add('right'); else sw.classList.remove('right');
  sw.setAttribute('aria-checked', controlMode === 'mouse' ? 'true' : 'false');
  const t = document.getElementById('ctlTouch'), m = document.getElementById('ctlMouse');
  if (controlMode === 'touch') { t.classList.add('on'); m.classList.remove('on'); } else { m.classList.add('on'); t.classList.remove('on'); }
  document.getElementById('ctlDesc').innerHTML = CONTROL_DESC[controlMode] +
    (controlsAuto ? '<br>Escolhido automaticamente pelo aparelho.' : '');
}
function toggleControlsAuto() {
  controlsAuto = !controlsAuto;
  if (controlsAuto) setControlMode(detectedControls());
  saveControls();
  refreshControlsUi();
  beep(660, 0.06, 'sine', 0.06);
}
function pickControls(mode) {
  if (controlsAuto) { // automatic: manual choice is locked, nudge toward the switch above
    const desc = document.getElementById('ctlDesc');
    if (desc) desc.innerHTML = CONTROL_DESC[controlMode] + '<br>Desligue o <b>Automático</b> para escolher.';
    beep(160, 0.08, 'square', 0.04);
    return;
  }
  setControlMode(mode);
  saveControls();
  refreshControlsUi();
  beep(660, 0.06, 'sine', 0.06);
}

// Keyboard (computer): Esc / P pause, Esc cancels a line being drawn, Esc / Enter on the pause menu resume
function onKeyDown(e) {
  const k = e.key;
  if (k !== 'Escape' && k !== 'p' && k !== 'P' && k !== 'Enter') return;
  if (state !== 'playing') return;
  if (k === 'Escape' && drawing) { drawing = null; return; }
  if (!paused && k !== 'Enter') { pauseGame(); return; }
  if (paused && !countdownTimer && screen === 'pause' && (k === 'Escape' || k === 'Enter')) { e.preventDefault(); resumeWithCountdown(); }
}
function bindControls() {
  loadControls();
  document.addEventListener('keydown', onKeyDown, false);
  if (window.PointerEvent) window.addEventListener('pointerdown', function (e) { noteInputType(e.pointerType); }, true);
  try { // device changes (e.g. a tablet's keyboard/mouse attached): re-detect when automatic
    const mq = window.matchMedia && window.matchMedia('(pointer: coarse)');
    const onChange = function () { if (controlsAuto) setControlMode(detectedControls()); };
    if (mq && mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq && mq.addListener) mq.addListener(onChange);
  } catch (e) {}
}
