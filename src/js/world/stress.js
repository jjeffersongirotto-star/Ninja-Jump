// --- DEV stress test (?stress=1 only, see config/stress.js): refill coins, keep the magnet on, autopilot ---
let stressDone = false;
function stressTick() {
  if (ninja.dead) return;
  ninja.magnetT = Math.max(ninja.magnetT, 2);
  // coins across the whole screen, all the time
  let active = 0;
  const top = camera.y - 40, bottom = camera.y + H;
  for (let i = 0; i < coins.length; i++) { const c = coins[i]; if (!c.collected && c.y > top && c.y < bottom) active++; }
  const minX = FX.wallWidth + 16, spanX = W - 2 * minX;
  for (let n = active; n < STRESS.coinsOnScreen; n++) {
    coins.push({ x: minX + Math.random() * spanX, y: camera.y - 30 + Math.random() * (H * 0.85), r: 10, collected: false, sparkle: Math.random() * Math.PI * 2 });
  }
  // autopilot: a short elastic under him whenever he starts falling (every 3rd one is a special)
  if (elastic && (elastic.phase === 'snapped' || elastic.used || elastic.y1 > camera.y + H + 40)) elastic = null;
  if (!elastic && !drawing && ninja.vy > 0.5 && ninja.rocketT <= 0) {
    const y = Math.min(ninja.y + 46, camera.y + H - 30), x = Math.max(minX + 30, Math.min(W - minX - 30, ninja.x));
    elastic = { x1: x - 24, y1: y, x2: x + 24, y2: y, wobble: 0, used: false, age: 0, phase: 'ready', sag: 0, hitT: 0.5,
      impactSpeed: 0, stretchFrames: 0, maxSag: 0 };
  }
  if (!stressDone && worldToMeters(ninja.y) >= STRESS.goalM) { stressDone = true; debugStats.stressGoalFrame = frame; }
}
// Fatal hazard touched in the stress test: red enemies are defeated, spikes / saws are smashed
function stressHit(hz) {
  if (hz.type === 'flyer' || hz.type === 'ufo') { defeatEnemy(hz); return; }
  hz.alive = false;
  burst(hz.x, hz.y, '#c9ced8', 12, 4);
  fxSparks(hz.x, hz.y, '#fff6a8', 8, 6);
}
// small corner label so a stress-test capture can never be mistaken for normal play
function drawStressBadge() {
  ctx.save();
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(255,60,60,0.85)';
  ctx.fillText('STRESS ' + Math.round(worldToMeters(ninja.y)) + ' m', 12, H - 12);
  ctx.restore();
}
