// --- Elastic ---
// Keep finger points in SCREEN space so the line sticks to the touch with zero lag,
// even while the camera scrolls. Convert to world only when placing.
function syncDrawingWorld() {
  if (!drawing) return;
  const cam = camera.y;
  drawing.x1 = drawing.sx1;
  drawing.y1 = drawing.sy1 + cam;
  drawing.x2 = drawing.sx2;
  drawing.y2 = drawing.sy2 + cam;
}
function startDraw(x, y) {
  if (state !== 'playing' || paused || (ninja && ninja.dead)) return;
  drawing = {
    sx1: x, sy1: y, sx2: x, sy2: y,
    x1: x, y1: y + camera.y, x2: x, y2: y + camera.y
  };
}
function moveDraw(x, y) {
  if (!drawing) return;
  // Cap the length: the line stops growing past the max, following the finger's direction
  const dx = x - drawing.sx1, dy = y - drawing.sy1, len = Math.hypot(dx, dy), maxLen = elasticMaxLen();
  if (len > maxLen) { x = drawing.sx1 + dx / len * maxLen; y = drawing.sy1 + dy / len * maxLen; }
  drawing.sx2 = x;
  drawing.sy2 = y;
  syncDrawingWorld();
  // Only one working elastic: the old one breaks as soon as the new line is long enough to count
  if (!drawing.broke && Math.hypot(x - drawing.sx1, y - drawing.sy1) >= 12) {
    drawing.broke = true;
    if (elastic && elastic.phase !== 'snapped') snapElastic(elastic);
  }
}
function endDraw() {
  if (!drawing) return;
  syncDrawingWorld();
  const len = Math.hypot(drawing.x2 - drawing.x1, drawing.y2 - drawing.y1);
  // Accept short strokes — only ignore tiny accidental taps
  if (len >= 12) {
    elastic = {
      x1: drawing.x1, y1: drawing.y1,
      x2: drawing.x2, y2: drawing.y2,
      wobble: 0, used: false, age: 0,
      phase: 'ready', sag: 0, hitT: 0.5,
      impactSpeed: 0, stretchFrames: 0, maxSag: 0
    };
    // Still inside an intangible platform: no room for an elastic, it snaps
    if (!settleGhostPlatforms()) snapElastic(elastic);
  }
  drawing = null;
}

// Fall energy multiplier on a launch of speed `l0` after landing at `speedIn` px/frame into the band
// (see config/physics.js)
function fallBounceMult(speedIn, l0) {
  const extra = FALL_ENERGY_GAIN * Math.max(0, speedIn * speedIn - FALL_ENERGY_FREE_SPEED * FALL_ENERGY_FREE_SPEED);
  if (extra <= 0 || l0 <= 0) return 1;
  return Math.min(FALL_BOUNCE_MAX_MULT, Math.sqrt(l0 * l0 + extra) / l0);
}
// A big fall bounce gets a little extra kick on screen: ring + shake + a lower "boing"
function fallBounceFx(m) {
  const k = Math.min(1, (m - 1) / (FALL_BOUNCE_MAX_MULT - 1));
  rings.push({ x: ninja.x, y: ninja.y + NINJA_R, r: 8, life: 0.5 + 0.4 * k, color: (atmosCache || atmosphereAt(0)).elastic });
  shake = Math.max(shake, 3 + 4 * k);
  beep(150 + 60 * k, 0.16, 'sine', 0.07);
  debugStats.fallBounces++;
}

function elasticLength(e) {
  return Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
}

/** Unit normal of elastic pointing "up" (negative Y = launch side). */
function elasticUpNormal(e) {
  const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  return { nx, ny, len };
}

/** Sample swept path vs segment to avoid tunneling on fast falls. */
function pathHitsElastic(x0, y0, x1, y1, e, pad) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 3));
  let best = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const hit = pointSegDist(x, y, e.x1, e.y1, e.x2, e.y2);
    if (hit.d < NINJA_R + pad && (!best || hit.d < best.d)) best = hit;
  }
  return best;
}

function pointSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { d: Math.hypot(px - x1, py - y1), t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return { d: Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)), t };
}

// Star explosion on the elastic when a super jump fires
function superBurst(x, y) {
  const at = atmosCache || atmosphereAt(0);
  const cols = ['#fff6a8', '#ffd700', '#ffffff', at.accent, at.elastic];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + Math.random() * 0.2;
    const s = 3 + Math.random() * 6;
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: 38 + Math.random() * 22, max: 60, color: cols[i % cols.length],
      size: 4 + Math.random() * 4, star: true, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4
    });
  }
  rings.push({ x, y, r: 10, life: 1, color: '#fff6a8' });
  rings.push({ x, y, r: 4, life: 0.8, color: at.elastic });
  shake = Math.max(shake, 6);
  beep(660, 0.1, 'triangle', 0.08);
  beep(990, 0.14, 'sine', 0.07);
  beep(1320, 0.2, 'sine', 0.05);
}

function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 3) * (0.4 + Math.random());
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: 30 + Math.random() * 25, max: 55, color,
      size: 2 + Math.random() * 3
    });
  }
}
