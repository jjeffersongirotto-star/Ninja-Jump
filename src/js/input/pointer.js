// --- Input ---
// Map client coords → canvas logical pixels (handles safe-area / browser chrome offset)
function pointerToCanvas(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const rw = r.width || 1;
  const rh = r.height || 1;
  // clamped to the play area (on a wide screen the mouse can be over the sides of the column)
  return {
    x: Math.max(0, Math.min(W, (clientX - r.left) * (W / rw))),
    y: Math.max(0, Math.min(H, (clientY - r.top) * (H / rh)))
  };
}
// --- Touch dead zones (bottom/top edge, where Android's system gestures live) ---
// A touch that STARTS in them doesn't draw, and lines are kept out of them while dragging, so the
// player never needs to touch the very edge. Size = max(TOUCH_DEAD_*, safe-area inset), in canvas px.
let safeProbe = null, deadZoneCache = null;
function safeInsets() {
  try {
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.setAttribute('aria-hidden', 'true');
      safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
      document.body.appendChild(safeProbe);
    }
    const cs = getComputedStyle(safeProbe);
    return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  } catch (e) { return { top: 0, bottom: 0 }; }
}
function touchDeadZones() {
  const r = canvas.getBoundingClientRect();
  const key = W + 'x' + H + ':' + Math.round(r.height);
  if (deadZoneCache && deadZoneCache.key === key) return deadZoneCache;
  const s = safeInsets(), k = H / (r.height || H);
  deadZoneCache = { key: key, top: Math.max(TOUCH_DEAD_TOP, s.top * k), bottom: Math.max(TOUCH_DEAD_BOTTOM, s.bottom * k) };
  return deadZoneCache;
}
function inTouchDeadZone(y) {
  const z = touchDeadZones();
  return y < z.top || y > H - z.bottom;
}
function clampTouchY(y) {
  const z = touchDeadZones();
  return Math.max(z.top, Math.min(H - z.bottom, y));
}
let drawIsTouch = false; // the current line comes from a finger/pen (kept out of the dead zones)
function applyPointer(e) {
  // Prefer coalesced events for zero-lag finger tracking on mobile
  let list = null;
  try { list = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null; } catch (err) { list = null; }
  const pts = (list && list.length) ? list : [e];
  for (const ev of pts) {
    const p = pointerToCanvas(ev.clientX, ev.clientY);
    moveDraw(p.x, drawIsTouch ? clampTouchY(p.y) : p.y);
  }
}
let activePointerId = null;
let debugTouchDead = 0; // touches ignored because they started in a dead zone (tests)
function cancelGesture() {
  drawing = null;
  activePointerId = null;
  mouseDown = false;
  touchId = null;
}
function onPointerDown(e) {
  if (state !== 'playing') return;
  noteInputType(e.pointerType);
  if (e.pointerType === 'mouse' && e.button === 2 && drawing) { e.preventDefault(); cancelGesture(); return; } // right click cancels
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  if (drawing && activePointerId !== null && e.pointerId !== activePointerId) return; // a second finger is ignored
  ensureAudio();
  const p = pointerToCanvas(e.clientX, e.clientY);
  if (e.pointerType !== 'mouse' && inTouchDeadZone(p.y)) { debugTouchDead++; return; } // edge: system gesture zone
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  activePointerId = e.pointerId;
  drawIsTouch = e.pointerType !== 'mouse';
  startDraw(p.x, p.y);
}
function onPointerMove(e) {
  if (state !== 'playing' || !drawing || e.pointerId !== activePointerId) return;
  e.preventDefault();
  applyPointer(e);
}
function onPointerUp(e) {
  if (state !== 'playing' || e.pointerId !== activePointerId) return;
  e.preventDefault();
  activePointerId = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  if (e.type === 'pointercancel') { drawing = null; return; } // a cancelled gesture places nothing
  if (drawing) {
    const p = pointerToCanvas(e.clientX, e.clientY);
    moveDraw(p.x, drawIsTouch ? clampTouchY(p.y) : p.y);
  }
  endDraw();
}

// Fallback for WebViews without Pointer Events: same drawing via touch + mouse events
let touchId = null;
let lastTouchAt = -1e9;
function findTouch(list, id) {
  if (!list) return null;
  for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
  return null;
}
function onTouchStart(e) {
  lastTouchAt = nowMs();
  if (state !== 'playing') return;
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  e.preventDefault();
  ensureAudio();
  const p = pointerToCanvas(t.clientX, t.clientY);
  if (inTouchDeadZone(p.y)) { debugTouchDead++; return; }
  touchId = t.identifier;
  drawIsTouch = true;
  startDraw(p.x, p.y);
}
function onTouchMove(e) {
  lastTouchAt = nowMs();
  if (state !== 'playing' || !drawing) return;
  e.preventDefault();
  const t = findTouch(e.changedTouches, touchId);
  if (!t) return;
  const p = pointerToCanvas(t.clientX, t.clientY);
  moveDraw(p.x, clampTouchY(p.y));
}
function onTouchEnd(e) {
  lastTouchAt = nowMs();
  if (state !== 'playing') return;
  const t = findTouch(e.changedTouches, touchId);
  if (!t) return;
  e.preventDefault();
  if (drawing) {
    const p = pointerToCanvas(t.clientX, t.clientY);
    moveDraw(p.x, clampTouchY(p.y));
  }
  endDraw();
  touchId = null;
}
let mouseDown = false;
function mouseIsFromTouch() { return nowMs() - lastTouchAt < 800; }
function onMouseDown(e) {
  if (state !== 'playing' || e.button !== 0 || mouseIsFromTouch()) return;
  e.preventDefault();
  ensureAudio();
  mouseDown = true;
  drawIsTouch = false;
  const p = pointerToCanvas(e.clientX, e.clientY);
  startDraw(p.x, p.y);
}
function onMouseMove(e) {
  if (!mouseDown || state !== 'playing' || !drawing) return;
  e.preventDefault();
  const p = pointerToCanvas(e.clientX, e.clientY);
  moveDraw(p.x, p.y);
}
function onMouseUp(e) {
  if (!mouseDown) return;
  mouseDown = false;
  if (state !== 'playing') return;
  if (drawing) {
    const p = pointerToCanvas(e.clientX, e.clientY);
    moveDraw(p.x, p.y);
  }
  endDraw();
}

function bindInput() {
  try { canvas.style.touchAction = 'none'; } catch (e) {}
  window.addEventListener('blur', cancelGesture, false);
  window.addEventListener('resize', function () { deadZoneCache = null; }, false);
  document.addEventListener('visibilitychange', function () { if (document.hidden) cancelGesture(); }, false);
  if (window.PointerEvent) {
    canvas.addEventListener('pointerdown', onPointerDown, ACTIVE);
    canvas.addEventListener('pointermove', onPointerMove, ACTIVE);
    canvas.addEventListener('pointerup', onPointerUp, ACTIVE);
    canvas.addEventListener('pointercancel', onPointerUp, ACTIVE);
    canvas.addEventListener('contextmenu', function (e) { if (state === 'playing') e.preventDefault(); }, false);
    canvas.addEventListener('lostpointercapture', function (e) { if (e.pointerId === activePointerId) cancelGesture(); }, false);
  } else {
    canvas.addEventListener('touchstart', onTouchStart, ACTIVE);
    canvas.addEventListener('touchmove', onTouchMove, ACTIVE);
    canvas.addEventListener('touchend', onTouchEnd, ACTIVE);
    canvas.addEventListener('touchcancel', onTouchEnd, ACTIVE);
    canvas.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mouseup', onMouseUp, false);
  }
}

// The page must never scroll: a drag that the browser treats as scrolling (on the menus, the HUD
// or a button) brings the address bar back / starts pull-to-refresh and the game shrinks.
// Only a menu that is really taller than the screen may scroll (inside the overlay).
function overlayScrolls(target) {
  if (state === 'playing' && !paused) return false;
  if (!overlay || overlay.classList.contains('hidden') || !target || !overlay.contains(target)) return false;
  // a scrolling box inside the menu (the character grid) may scroll too, even when the menu itself fits
  for (let el = target; el && el !== overlay; el = el.parentNode) {
    if (el.nodeType === 1 && el.scrollHeight > el.clientHeight + 1) {
      const oy = window.getComputedStyle ? getComputedStyle(el).overflowY : '';
      if (oy === 'auto' || oy === 'scroll') return true;
    }
  }
  return overlay.scrollHeight > overlay.clientHeight + 1;
}
function bindPageGuards() {
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => {
    if (e.target === canvas || !overlayScrolls(e.target)) e.preventDefault();
  }, ACTIVE);
  // While playing, a touch on the game never starts any browser default (scroll, pull-to-refresh,
  // text selection, long-press menu). System edge gestures can't be blocked by a page; see TOUCH_DEAD_*.
  document.addEventListener('touchstart', e => {
    if (state === 'playing' && !paused && e.target === canvas && e.cancelable) e.preventDefault();
  }, ACTIVE);
  // something scrolled the page anyway (focus, old engines): put it back
  window.addEventListener('scroll', function () {
    if (window.scrollY || window.scrollX) { try { window.scrollTo(0, 0); } catch (e) {} }
  }, false);
}
