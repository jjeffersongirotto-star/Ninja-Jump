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
function applyPointer(e) {
  // Prefer coalesced events for zero-lag finger tracking on mobile
  let list = null;
  try { list = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null; } catch (err) { list = null; }
  const pts = (list && list.length) ? list : [e];
  for (const ev of pts) {
    const p = pointerToCanvas(ev.clientX, ev.clientY);
    moveDraw(p.x, p.y);
  }
}
let activePointerId = null;
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
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  activePointerId = e.pointerId;
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
    moveDraw(p.x, p.y);
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
  touchId = t.identifier;
  const p = pointerToCanvas(t.clientX, t.clientY);
  startDraw(p.x, p.y);
}
function onTouchMove(e) {
  lastTouchAt = nowMs();
  if (state !== 'playing' || !drawing) return;
  e.preventDefault();
  const t = findTouch(e.changedTouches, touchId);
  if (!t) return;
  const p = pointerToCanvas(t.clientX, t.clientY);
  moveDraw(p.x, p.y);
}
function onTouchEnd(e) {
  lastTouchAt = nowMs();
  if (state !== 'playing') return;
  const t = findTouch(e.changedTouches, touchId);
  if (!t) return;
  e.preventDefault();
  if (drawing) {
    const p = pointerToCanvas(t.clientX, t.clientY);
    moveDraw(p.x, p.y);
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

function bindPageGuards() {
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => {
    if (e.target === canvas || state === 'playing') e.preventDefault();
  }, ACTIVE);
}
