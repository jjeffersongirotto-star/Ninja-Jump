// --- Frame: render() draws everything; loop() runs the fixed-timestep game loop ---
function render() {
  const meters = ninja ? worldToMeters(ninja.y) : 0;
  if (state === 'menu') atmosCache = atmosphereAt(30);
  else if (!atmosCache) atmosCache = atmosphereAt(meters);

  ctx.save();
  shakeX = 0; shakeY = 0;
  if (shake > 0.5) {
    shakeX = (Math.random() - 0.5) * shake; shakeY = (Math.random() - 0.5) * shake;
    ctx.translate(shakeX, shakeY);
  }

  renderBackground(state === 'playing' || state === 'gameover' ? meters : 30);
  paintSides(atmosCache);

  if (state === 'menu') {
    drawNinja(W / 2, H * 0.38 + Math.sin(frame * 0.04) * 10);
    const ey = H * 0.55;
    const col = (atmosCache || atmosphereAt(30)).elastic;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.3, ey);
    ctx.quadraticCurveTo(W * 0.5, ey + 18 + Math.sin(frame * 0.08) * 8, W * 0.7, ey);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (state === 'playing' || state === 'gameover') {
    if (groundY) drawGround();
    for (const hz of hazards) if (hz.alive) drawHazard(hz);
    for (const c of coins) drawCoin(c);
    if (powerups.length) drawPowerups();
    drawParticles();
    if (floaters.length) drawFloaters();
    if (elastic) drawElastic(elastic, false);
    if (drawing) drawElastic(drawing, true);
    if (ninja) {
      drawNinjaFxBack(ninja.x, ninja.y - camera.y);
      drawNinja(ninja.x, ninja.y - camera.y);
      drawNinjaFxFront(ninja.x, ninja.y - camera.y);
    }
    if (state === 'playing') drawPowerHud();
  }

  ctx.restore();
}

// Fixed timestep: the game logic always runs 60 times per second, whatever the screen's refresh
// rate (60/90/120/144 Hz phones, or a slow phone at 30 fps). Before, physics advanced one step per
// drawn frame, so the game ran 2x faster on 120 Hz screens and in slow motion on weak phones.
const STEP_MS = 1000 / 60;
const MAX_STEPS = 6;  // after a long hiccup (tab switch, slow frame) don't fast-forward more than this
let loopErrors = 0, acc = 0;
let qSum = 0, qCount = 0, qSlowWindows = 0;
function watchFrameRate(elapsed) {
  if (state !== 'playing' || paused || document.hidden || qualityLevel >= QUALITY_STEPS.length - 1) {
    qSum = 0; qCount = 0;
    return;
  }
  if (elapsed > 250) { qSum = 0; qCount = 0; return; } // a hiccup (tab switch, GC), not the steady rate
  qSum += elapsed;
  if (++qCount < QUALITY_WINDOW) return;
  const avg = qSum / qCount;
  qSum = 0; qCount = 0;
  qSlowWindows = avg > QUALITY_SLOW_MS ? qSlowWindows + 1 : 0;
  // slow for ~3 s in a row (or very slow, under ~45 FPS, for 1.5 s): lower the resolution one step
  if (qSlowWindows >= 2 || avg > QUALITY_VERY_SLOW_MS) {
    qSlowWindows = 0;
    qualityLevel++;
    debugStats.qualityDrops = (debugStats.qualityDrops || 0) + 1;
    resize();
  }
}
function loop(ts) {
  if (typeof ts !== 'number') ts = nowMs();
  const elapsed = Math.max(0, ts - (lastTime || ts));
  lastTime = ts;
  watchFrameRate(elapsed);
  acc = Math.min(acc + elapsed, STEP_MS * MAX_STEPS);
  // One bad frame must never freeze the game: log it and keep the loop alive
  while (acc >= STEP_MS) {
    acc -= STEP_MS;
    try { update(STEP_MS); } catch (err) { if (loopErrors++ < 5) logErr('update', err); }
  }
  try { render(); } catch (err) {
    if (loopErrors++ < 5) logErr('render', err);
    try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; } catch (e) {}
  }
  requestFrame(loop);
}
