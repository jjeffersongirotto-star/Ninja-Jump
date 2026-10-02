// --- Hazards in the world ---
function makeHazard(it, wy) {
  const hz = {};
  for (const k in it) hz[k] = it[k];
  hz.ox = it.x;
  hz.oy = wy + (it.yOff || 0);
  hz.x = hz.ox; hz.y = hz.oy;
  hz.t = 0;
  hz.phase = it.phase0 != null ? it.phase0 : Math.random() * Math.PI * 2;
  hz.bobPhase = Math.random() * Math.PI * 2;
  hz.face = Math.random() < 0.5 ? -1 : 1;
  hz.angle = 0;
  hz.spin = it.type === 'saw' ? (0.08 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : -1)
    : it.type === 'spikeMine' ? (0.01 + Math.random() * 0.012) * (Math.random() < 0.5 ? 1 : -1) : 0;
  hz.fatal = !!HAZARDS.fatal[it.kind];
  hz.alive = true;
  hz.cool = 0;
  hz.hit = 0;
  hz.lastTouch = -99;
  hz.behave = it.behave || (it.range ? 'slide' : 'static');
  if (hz.behave === 'dive') {
    hz.dv = { st: 'idle', t: 0, tx: 0, ty: 0, dx: 0, dy: 0, cool: 30 + Math.floor(Math.random() * 60) };
  } else if (hz.behave === 'teleport') {
    // UFO: lives inside its area (ox +- range, oy +- bobAmp) and hops between spots in it
    const T = HAZARDS.enemies.ufoTeleport;
    hz.tp = { st: 'wait', t: Math.floor(T.every[0] * (0.4 + Math.random() * 0.6)), ax: (Math.random() * 2 - 1) * hz.range * 0.8,
      ay: 0, nx: 0, ny: 0 };
  }
  if (hz.range && hz.behave !== 'teleport') hz.x = hz.ox + Math.sin(hz.phase) * hz.range;
  if (hz.tp) hz.x = hz.ox + hz.tp.ax;
  return hz;
}
function materializeRow(row) {
  const wy = metersToWorld(row.m);
  if (hazardsOn) for (const it of row.items) hazards.push(makeHazard(it, wy));
  for (const c of row.coins) {
    coins.push({ x: c.x, y: wy + c.yOff, r: 10, collected: false, sparkle: Math.random() * Math.PI * 2 });
  }
  if (row.power) {
    powerups.push({ type: row.power.type, x: row.power.x, y: wy + row.power.yOff, r: POWERUPS.pickupRadius,
      bob: Math.random() * Math.PI * 2, taken: false });
  }
}
// Is a hazard fully on screen (sudden moves only start when the player can see them)?
function hazardOnScreen(hz, margin) {
  const sy = hz.y - camera.y;
  return sy > margin && sy < H - margin - 40;
}

function updateHazards() {
  for (const hz of hazards) {
    if (!hz.alive) continue;
    hz.t++;
    if (hz.dying > 0) { // stomped: poof, then gone
      hz.dying--;
      hz.y -= 0.7;
      if (hz.dying <= 0) hz.alive = false;
      continue;
    }
    if (hz.knockVX) { // knocked aside by a super jump: slides away and slows down, stays on screen
      hz.ox += hz.knockVX;
      const lim = (hz.vw || 20) + (hz.range || 0);
      if (hz.ox < lim || hz.ox > W - lim) { hz.ox = Math.max(lim, Math.min(W - lim, hz.ox)); hz.knockVX = -hz.knockVX * 0.4; }
      hz.knockVX *= 0.88;
      if (Math.abs(hz.knockVX) < 0.05) hz.knockVX = 0;
      if (!hz.range) hz.x = hz.ox;
    }
    if (hz.behave === 'teleport') updateTeleport(hz);
    else {
      if (hz.range) {
        hz.phase += hz.speed / Math.max(10, hz.range);
        hz.x = hz.ox + Math.sin(hz.phase) * hz.range;
      }
      if (hz.behave === 'wave') hz.y = hz.oy + Math.sin(hz.t * HAZARDS.enemies.birdWave.freq + hz.bobPhase) * hz.bobAmp;
      else if (hz.bobAmp) hz.y = hz.oy + Math.sin(hz.t * 0.05 + hz.bobPhase) * hz.bobAmp;
      if (hz.dv) updateDive(hz);
    }
    if (hz.spin) hz.angle += hz.spin;
    if (hz.cool > 0) hz.cool--;
    if (hz.hit > 0) { hz.hit *= 0.86; if (hz.hit < 0.02) hz.hit = 0; }
  }
}

// Red bat dive: idle -> warn (shake, "!", dashed line) -> dive -> hold -> back -> rest.
// The target is where the ninja was when the warning started, clamped to the bat's dive box
// (maxDx sideways, 0..maxDy down), which the generator counts for the gap rule.
function updateDive(hz) {
  const D = HAZARDS.enemies.batDive, d = hz.dv;
  if (d.st === 'idle') {
    if (d.cool > 0) d.cool--;
    else if (ninja && !ninja.dead && !(ninja.rocketT > 0) && !hz.knockVX && hazardOnScreen(hz, 40)) {
      const rx = ninja.x - hz.x, ry = ninja.y - hz.y;
      if (Math.abs(rx) < D.triggerX && ry > D.triggerBelow[0] && ry < D.triggerBelow[1]) {
        d.st = 'warn'; d.t = 0;
        d.tx = Math.max(-D.maxDx, Math.min(D.maxDx, rx));
        d.tx = Math.max(hz.vw - hz.ox, Math.min(W - hz.vw - hz.ox, d.tx)); // stays on screen
        d.ty = Math.max(20, Math.min(D.maxDy, ry));
        debugStats.dives++;
        beep(880, 0.06, 'square', 0.04);
      }
    }
  } else {
    d.t++;
    if (d.st === 'warn') { if (d.t >= D.warn) { d.st = 'dive'; d.t = 0; beep(420, 0.12, 'sawtooth', 0.04); } }
    else if (d.st === 'dive') {
      const k = Math.min(1, d.t / D.dive);
      d.dx = d.tx * k * k; d.dy = d.ty * k * k;
      if (d.t >= D.dive) { d.st = 'hold'; d.t = 0; }
    } else if (d.st === 'hold') { if (d.t >= D.hold) { d.st = 'back'; d.t = 0; } }
    else if (d.st === 'back') {
      const k = Math.min(1, d.t / D.back), e = 1 - k * k * (3 - 2 * k);
      d.dx = d.tx * e; d.dy = d.ty * e;
      if (d.t >= D.back) { d.st = 'idle'; d.t = 0; d.dx = 0; d.dy = 0; d.cool = D.cool; }
    }
  }
  hz.x = hz.ox + d.dx; // divers never slide, so their base x is ox
  hz.y += d.dy;        // on top of the hover bob set just before
}
// UFO teleport: wait -> warn (ghost outline at the destination) -> blink to it. Never onto the ninja.
function updateTeleport(hz) {
  const T = HAZARDS.enemies.ufoTeleport, p = hz.tp;
  const hover = Math.sin(hz.t * 0.05 + hz.bobPhase) * 3;
  const ayMax = Math.max(0, (hz.bobAmp || 0) - 3);
  if (p.st === 'wait') {
    if (--p.t <= 0) {
      p.t = 20;
      if (ninja && !ninja.dead && !hz.knockVX && hazardOnScreen(hz, 30)) {
        for (let k = 0; k < 6; k++) {
          const nx = (Math.random() * 2 - 1) * hz.range, ny = (Math.random() * 2 - 1) * ayMax;
          if (Math.abs(nx - p.ax) < Math.min(40, hz.range)) continue;
          if (Math.hypot(hz.ox + nx - ninja.x, hz.oy + ny - ninja.y) < hz.rx + NINJA_R + 40) continue;
          p.nx = nx; p.ny = ny; p.st = 'warn'; p.t = 0;
          beep(1200, 0.05, 'sine', 0.035);
          break;
        }
      }
    }
  } else if (p.st === 'warn') {
    if (++p.t >= T.warn) {
      const dx = hz.ox + p.nx, dy = hz.oy + p.ny;
      if (ninja && Math.hypot(dx - ninja.x, dy - ninja.y) < hz.rx + NINJA_R + 6) {
        p.st = 'wait'; p.t = 40; // he is standing right there: cancel, try again later
      } else {
        burst(hz.x, hz.y, hz.color === 'red' ? '#ff9a9a' : '#b8ff9e', 10, 2.6);
        p.ax = p.nx; p.ay = p.ny;
        p.st = 'wait'; p.t = Math.floor(T.every[0] + Math.random() * (T.every[1] - T.every[0]));
        rings.push({ x: dx, y: dy, r: 8, life: 0.5, color: hz.color === 'red' ? '#ffb0b0' : '#c8ffb0' });
        debugStats.teleports++;
        beep(1500, 0.05, 'triangle', 0.04);
        beep(700, 0.07, 'sine', 0.03);
      }
    }
  }
  hz.x = hz.ox + p.ax;
  hz.y = hz.oy + p.ay + hover;
}

function hazardContact(hz, px, py) {
  const R = NINJA_R;
  if (hz.shape === 'rect') {
    const hw = hz.w / 2, hh = hz.h / 2;
    const cx = Math.max(hz.x - hw, Math.min(px, hz.x + hw));
    const cy = Math.max(hz.y - hh, Math.min(py, hz.y + hh));
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy < R * R;
  }
  if (hz.shape === 'circle') {
    const d = hz.r + R, dx = px - hz.x, dy = py - hz.y;
    return dx * dx + dy * dy < d * d;
  }
  const ex = (px - hz.x) / (hz.rx + R), ey = (py - hz.y) / (hz.ry + R);
  return ex * ex + ey * ey < 1;
}

// Continuous collision: sample the ninja's path this frame (<= 4 px steps) so even a
// super jump can't tunnel through a hazard.
const hzNear = [];
function collideHazards(x0, y0, onBand) {
  const x1 = ninja.x, y1 = ninja.y;
  const minY = Math.min(y0, y1) - 70, maxY = Math.max(y0, y1) + 70;
  hzNear.length = 0;
  for (const hz of hazards) if (hz.alive && !hz.dying && hz.y > minY && hz.y < maxY) hzNear.push(hz);
  if (!hzNear.length) return;
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  let lx = x0, ly = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
    for (const hz of hzNear) {
      if (hz.cool > 0 || hz.ghost) continue;
      if (hz.fatal && ninja.invulnT > 0) continue; // just lost the shield: a moment to get away
      if (!hz.fatal && ninja.ghost > 0) continue;
      if (!hazardContact(hz, px, py)) continue;
      if (superActive() && hz.type !== 'spikeMine' && hz.type !== 'spikeBar' && hz.type !== 'saw') {
        // super jump: platforms are intangible (like when falling); blue enemies are defeated (+1 coin),
        // red ones are knocked aside; he keeps flying. Spikes/saws go through the shield in hitFatal.
        if (hz.type === 'platform') ghostPlatform(hz);
        else if (hz.color === 'red') knockAside(hz);
        else defeatEnemy(hz);
        continue;
      }
      if (!onBand && hz.type === 'platform' && ninja.vy >= 0 && ly + NINJA_R <= hz.y - hz.h / 2 + 2) {
        // falling onto a platform from above: it turns intangible and he drops straight through
        ghostPlatform(hz);
        continue;
      }
      if (!onBand && isStomp(hz, px, py)) { stompHazard(hz, px, py); return; }
      if (hz.fatal) { hitFatal(hz); return; }
      if (onBand) continue;
      bumpHazard(hz, lx, ly);
      return;
    }
    lx = px; ly = py;
  }
}

// Shortest way out of a hazard (never into a wall or through the wall a platform is attached to).
function pushOut(hz, x, y) {
  const R = NINJA_R + 0.5;
  const opts = [];
  if (hz.shape === 'rect') {
    const hw = hz.w / 2, hh = hz.h / 2;
    opts.push({ x: x, y: hz.y - hh - R, side: 'top' });
    opts.push({ x: x, y: hz.y + hh + R, side: 'bottom' });
    if (hz.attach !== 'left') opts.push({ x: hz.x - hw - R, y: y, side: 'side' });
    if (hz.attach !== 'right') opts.push({ x: hz.x + hw + R, y: y, side: 'side' });
  } else {
    const ax = (hz.shape === 'circle' ? hz.r : hz.rx) + R, ay = (hz.shape === 'circle' ? hz.r : hz.ry) + R;
    let dx = (x - hz.x) / ax, dy = (y - hz.y) / ay;
    const d = Math.hypot(dx, dy);
    if (d < 1e-4) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
    opts.push({ x: hz.x + dx * ax, y: hz.y + dy * ay, side: dy < -0.45 ? 'top' : (dy > 0.45 ? 'bottom' : 'side') });
    opts.push({ x: x, y: hz.y - ay, side: 'top' }, { x: x, y: hz.y + ay, side: 'bottom' });
  }
  let best = null, bd = 1e9;
  for (const o of opts) {
    if (o.x < NINJA_R || o.x > W - NINJA_R) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bd) { bd = d; best = o; }
  }
  return best || opts[1];
}

// Head stomp: coming down onto a flyer/UFO from above
function isStomp(hz, px, py) {
  if (hz.type !== 'flyer' && hz.type !== 'ufo') return false;
  const ST = HAZARDS.stomp;
  if (ninja.vy <= ST.minDown) return false;
  const ax = hz.shape === 'circle' ? hz.r : hz.rx, ay = hz.shape === 'circle' ? hz.r : hz.ry;
  const dx = (px - hz.x) / (ax + NINJA_R), dy = (py - hz.y) / (ay + NINJA_R);
  const d = Math.hypot(dx, dy) || 1;
  return dy / d <= -ST.zone;
}
function stompHazard(hz, px, py) {
  const ST = HAZARDS.stomp;
  const p = pushOut(hz, px, py);
  ninja.x = p.x; ninja.y = Math.min(p.y, py);
  ninja.vx *= 0.8;
  ninja.floatT = 0;
  ninja.spinning = 0;
  ninjaPose.launch = 1;
  hz.hit = 1;
  countHit(hz.kind + ':stomp');
  shake = Math.max(shake, 3);
  if (hz.color === 'red') {
    // red: not defeated — just a rebound, and he survives (sides/below stay fatal)
    ninja.vy = -ST.redImpulse;
    hz.cool = 14;
    debugStats.stomps.red++;
    burst(ninja.x, ninja.y + NINJA_R, '#ffb0a0', 8, 2.5);
    beep(300, 0.08, 'square', 0.06);
  } else {
    ninja.vy = -ST.blueImpulse;
    debugStats.stomps.blue++;
    defeatEnemy(hz);
  }
}
// Blue flyer/UFO defeated (head stomp or super jump): poof, +coins
function defeatEnemy(hz) {
  const ST = HAZARDS.stomp;
  if (hz.dying > 0) return;
  hz.dying = ST.poofFrames;
  hz.hit = 1;
  runCoins += ST.coins;
  countHit(hz.kind + ':defeated');
  floaters.push({ x: hz.x, y: hz.y - 18, life: 48, text: '+' + ST.coins });
  burst(hz.x, hz.y, '#ffffff', 12, 3.2);
  burst(hz.x, hz.y, '#8fd3ff', 10, 3);
  burst(hz.x, hz.y - 10, (atmosCache || atmosphereAt(0)).accent, 6, 2.5);
  beep(660, 0.07, 'triangle', 0.08);
  beep(990, 0.09, 'sine', 0.06);
}
// Red flyer/UFO hit during a super jump: not defeated, knocked aside (away from the ninja)
function knockAside(hz) {
  const dir = hz.x === ninja.x ? (Math.random() < 0.5 ? -1 : 1) : (hz.x > ninja.x ? 1 : -1);
  hz.knockVX = dir * HAZARDS.superJump.knockSpeed;
  hz.cool = HAZARDS.superJump.knockCool;
  hz.hit = 1;
  hz.face = dir;
  countHit(hz.kind + ':knocked');
  shake = Math.max(shake, 4);
  burst(hz.x - dir * 10, hz.y, '#ffb0a0', 10, 3);
  rings.push({ x: hz.x, y: hz.y, r: 6, life: 0.6, color: '#ffd0c4' });
  beep(300, 0.08, 'square', 0.06);
  beep(200, 0.1, 'triangle', 0.05);
}
function superActive() { return !!(ninja && ninja.superSpin && !ninja.dead); }

// Safety net: he must never stay embedded in a solid or frozen in the air.
function antiStuck() {
  const AS = HAZARDS.antiStuck;
  const pinned = elastic && elastic.phase === 'stretching';
  if (ninja.ghost > 0) { // already being shaken loose: let him fall free
    ninja.embedded = 0; ninja.still = 0; ninja.stillX = ninja.x; ninja.stillY = ninja.y;
    return;
  }
  let inside = false;
  if (!pinned) {
    for (const hz of hazards) {
      if (hz.alive && !hz.dying && !hz.fatal && !hz.ghost && hazardContact(hz, ninja.x, ninja.y)) { inside = true; break; }
    }
  }
  ninja.embedded = inside ? ninja.embedded + 1 : 0;
  if (ninja.embedded > debugStats.maxEmbedded) debugStats.maxEmbedded = ninja.embedded;
  if (pinned || Math.abs(ninja.x - ninja.stillX) + Math.abs(ninja.y - ninja.stillY) >= AS.minMove) {
    ninja.stillX = ninja.x; ninja.stillY = ninja.y; ninja.still = 0;
  } else {
    ninja.still++;
  }
  if (ninja.embedded >= AS.embedFrames || ninja.still >= AS.frames) unstick();
}
function unstick() {
  for (const hz of hazards) {
    if (hz.alive && !hz.dying && !hz.fatal && !hz.ghost && hazardContact(hz, ninja.x, ninja.y)) {
      const p = pushOut(hz, ninja.x, ninja.y);
      ninja.x = p.x; ninja.y = p.y;
    }
  }
  ninja.ghost = HAZARDS.antiStuck.ghostFrames;
  ninja.vy = Math.max(ninja.vy, 2);
  ninja.vx *= 0.5;
  ninja.still = 0; ninja.embedded = 0;
  ninja.stillX = ninja.x; ninja.stillY = ninja.y;
  debugStats.unsticks++;
}

function countHit(key) { debugStats.hits[key] = (debugStats.hits[key] || 0) + 1; }

// Non-fatal hit (platform, blue flyer, blue UFO): lose momentum, never fatal.
function bumpHazard(hz, lx, ly) {
  let side;
  if (hazardContact(hz, lx, ly)) {
    // Round-4 stuck bug: he was ALREADY overlapping it when the frame started (e.g. he sagged into a
    // platform while pinned on an elastic, or a moving hazard swept into him). Restoring the "last free
    // spot" would put him back inside every frame and freeze him. Push him out the shortest way instead.
    if (!hazardContact(hz, ninja.x, ninja.y)) return; // he's already leaving it this frame
    const p = pushOut(hz, ninja.x, ninja.y);
    ninja.x = p.x; ninja.y = p.y; side = p.side;
    debugStats.pushOuts++;
    const away = side === 'top' ? ninja.vy < 0 : (side === 'bottom' ? ninja.vy > 0 : (ninja.x - hz.x) * ninja.vx > 0);
    if (away) return; // e.g. launched off an elastic that overlapped a platform: keep the launch
  } else {
    if (hz.shape === 'rect') {
      side = ly <= hz.y - hz.h / 2 ? 'top' : (ly >= hz.y + hz.h / 2 ? 'bottom' : 'side');
    } else {
      const dx = lx - hz.x, dy = ly - hz.y, d = Math.hypot(dx, dy) || 1;
      side = dy / d < -0.45 ? 'top' : (dy / d > 0.45 ? 'bottom' : 'side');
    }
    // back to the last free spot (on a platform top keep the horizontal slide, only fix y)
    if (!(side === 'top' && hz.shape === 'rect')) ninja.x = lx;
    ninja.y = ly;
  }
  ninja.floatT = HAZARDS.bumpFloat.frames; // gentler fall for a moment after any bump
  const fresh = frame - hz.lastTouch > 10;
  hz.lastTouch = frame;
  if (side === 'bottom') {
    // hit from below: upward momentum is gone, pushed down (player can draw a new elastic).
    // Bonks in a row push harder each time so he never stays stuck under it.
    const BK = HAZARDS.bonk;
    if (fresh) {
      ninja.bonks = Math.min(ninja.bonks + 1, BK.pushDown.length);
      ninja.bonkedSinceLaunch = true;
      ninja.bonkT = 0;
      debugStats.bonks++;
    }
    const push = BK.pushDown[Math.max(0, ninja.bonks - 1)];
    ninja.vy = Math.max(push, Math.abs(ninja.vy) * 0.12);
    ninja.vx *= 0.5;
    if (hz.shape !== 'rect') ninja.vx += (lx - hz.x) * 0.08;
  } else if (side === 'top') {
    if (hz.shape === 'rect') {
      // landed on top: slide toward the open edge and fall off naturally
      ninja.y = hz.y - hz.h / 2 - NINJA_R - 0.1;
      ninja.vy = 0;
      const dir = hz.attach === 'left' ? 1 : (hz.attach === 'right' ? -1 : (ninja.x >= hz.x ? 1 : -1));
      ninja.vx = dir * Math.min(5, Math.max(0.8, ninja.vx * dir) + 0.6);
    } else {
      // bounced on top of a flyer/UFO: small hop, pushed aside
      ninja.vy = -2.6;
      ninja.vx = (lx >= hz.x ? 1 : -1) * Math.max(2.2, Math.abs(ninja.vx));
    }
  } else {
    // side: deflect away
    ninja.vx = (lx < hz.x ? -1 : 1) * Math.max(1.6, Math.abs(ninja.vx) * 0.55);
    if (ninja.vy < 0) ninja.vy *= 0.75;
  }
  if (fresh) {
    hz.hit = 1;
    countHit(hz.kind + ':' + side);
    const col = hz.type === 'platform' ? '#cfe6ff' : '#8fd3ff';
    burst(ninja.x, ninja.y + (side === 'top' ? NINJA_R : -NINJA_R * 0.5), col, 8, 2.5);
    shake = Math.max(shake, side === 'top' ? 2 : 5);
    beep(side === 'top' ? 260 : 170, 0.08, 'triangle', 0.08);
  }
}

function ghostPlatform(hz) {
  if (hz.ghost) return;
  hz.ghost = true;
  debugStats.ghostPlatforms++;
  burst(ninja.x, ninja.y + NINJA_R, '#cfe6ff', 6, 1.6);
  beep(240, 0.07, 'sine', 0.05);
}
// Is he (with a small margin) still inside this intangible platform?
function insideGhost(hz) {
  const m = HAZARDS.ghostPlatform.margin;
  return Math.abs(ninja.x - hz.x) < hz.w / 2 + NINJA_R + m && Math.abs(ninja.y - hz.y) < hz.h / 2 + NINJA_R + m;
}
function insideAnyGhost() {
  for (const hz of hazards) if (hz.alive && hz.ghost && insideGhost(hz)) return true;
  return false;
}
// A new elastic was drawn: intangible platforms he is fully below become solid again.
// Returns false if he is still inside one (the elastic must snap).
function settleGhostPlatforms() {
  if (insideAnyGhost()) return false;
  for (const hz of hazards) {
    if (hz.alive && hz.ghost && ninja.y - NINJA_R > hz.y + hz.h / 2) hz.ghost = false;
  }
  return true;
}
// Elastic breaks in the middle (both halves whip back to the pegs), then disappears
function snapElastic(e) {
  e.phase = 'snapped';
  e.used = true;
  e.snapT = 0;
  e.sag = 0;
  debugStats.snaps++;
  const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2;
  const col = (atmosCache || atmosphereAt(0)).elastic;
  burst(mx, my, col, 10, 3);
  burst(mx, my, '#ffffff', 5, 2);
  beep(520, 0.05, 'square', 0.05);
  beep(180, 0.12, 'triangle', 0.06);
}

function hitFatal(hz) {
  if (!(HAZARDS.shieldOnSuperJump && superActive()) && ninja.shield) { breakShield(hz); return; }
  if (HAZARDS.shieldOnSuperJump && superActive()) {
    // super-jump ascent: smash through instead of dying (the player couldn't see it coming)
    hz.alive = false;
    debugStats.shieldBreaks++;
    burst(hz.x, hz.y, '#fff6a8', 16, 5);
    burst(hz.x, hz.y, hz.color === 'red' ? '#ff5a4a' : '#c9ced8', 10, 4);
    rings.push({ x: hz.x, y: hz.y, r: 6, life: 0.7, color: '#fff6a8' });
    beep(520, 0.08, 'square', 0.06);
    return;
  }
  killNinja(hz);
}

function killNinja(hz) {
  ninja.dead = true;
  ninja.deathSpin = 0;
  ninja.superSpin = false;
  ninja.spinning = 0;
  ninja.vy = -7;
  ninja.vx = ninja.x < hz.x ? -2.5 : 2.5;
  elastic = null;
  drawing = null;
  shortStreak = 0;
  updateStreakHud();
  hz.hit = 1;
  shake = 14;
  burst(ninja.x, ninja.y, '#ff4444', 16, 5);
  burst(ninja.x, ninja.y, '#ffffff', 8, 3);
  beep(120, 0.2, 'sawtooth', 0.1);
  debugStats.deaths++;
  debugStats.deathBy = hz.kind;
}

function spawnAhead() {
  const cullY = camera.y + H + 150;
  hazards = hazards.filter(h => h.alive && h.oy - h.vh - (h.bobAmp || 0) < cullY);
  coins = coins.filter(c => !c.collected && c.y < cullY);
  if (powerups.length) powerups = powerups.filter(p => !p.taken && p.y < cullY);
  if (!spawner) return;
  const aheadM = Math.max(worldToMeters(ninja.y), worldToMeters(camera.y)) + 200;
  let guard = 0;
  while (spawner.m < aheadM && guard++ < 60) materializeRow(spawnerNext(spawner, W));
}
