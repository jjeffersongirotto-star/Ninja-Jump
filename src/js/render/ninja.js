// --- Ninja sprite (Bomberman-style white ninja, shaded for a 3D look) ---
// Pose state: crouch 0..1 (eased), launch pulse, falling arm relax, wall-kick timer.
const NINJA_MAX_ARM = Math.PI / 3; // 60° hard limit
const NINJA_LEG_LEN = 13;                  // thigh + shin, used by the wall-kick leg
const ninjaPose = { crouch: 0, launch: 0, relax: 0, wasOnBand: false, forced: -1, wallKick: 0, wallSide: 0, wallX: 0, hero: 0, air: 0, lean: 0 };
let ninjaLightX = -1; // local x direction toward the light (world top-left), set per draw

function updateNinjaPose() {
  const p = ninjaPose;
  const onBand = state === 'playing' && elastic && elastic.phase === 'stretching';
  let target = 0;
  if (onBand) {
    target = elastic.maxSag > 0 ? Math.min(1, elastic.sag / elastic.maxSag) : 0;
  }
  if (p.wasOnBand && !onBand) p.launch = 1; // just launched
  p.wasOnBand = !!onBand;
  if (p.forced >= 0) { target = p.forced; p.crouch = target; }
  else if (onBand) p.crouch += (target - p.crouch) * 0.35;
  else p.crouch += (0 - p.crouch) * (p.launch > 0.3 ? 0.55 : 0.25);
  if (p.crouch < 0.001) p.crouch = 0;
  if (p.launch > 0) { p.launch *= 0.86; if (p.launch < 0.01) p.launch = 0; }
  // Falling: relax arms slightly (max 15°), only when free in the air
  let relaxT = 0;
  if (!onBand && ninja && state === 'playing' && ninja.vy > 1.5 && p.launch === 0) {
    relaxT = Math.min(1, (ninja.vy - 1.5) / 6);
  }
  p.relax += (relaxT - p.relax) * 0.12;
  // In-between poses (smoothed, visual only): air = -1 rising fast .. +1 falling fast; lean from side speed
  const free = !onBand && ninja && state === 'playing' && !ninja.dead;
  const airT = free ? Math.max(-1, Math.min(1, ninja.vy / 8)) : 0;
  p.air += (airT - p.air) * FX.ninjaAirEase;
  const leanT = free && p.wallKick <= 0 && !ninja.spinning ? Math.max(-1, Math.min(1, ninja.vx / 9)) * FX.ninjaLean : 0;
  p.lean += (leanT - p.lean) * 0.12;
  // Wall-kick timer (visual only)
  if (onBand) p.wallKick = 0;
  if (p.wallKick > 0) { p.wallKick -= 1 / WALL_KICK_FRAMES; if (p.wallKick < 0) p.wallKick = 0; }
  // Hero pose (super jump): blends in at launch, out when the ascent ends
  const heroOn = !!(ninja && !ninja.dead && state === 'playing' && ninja.superSpin && ninja.vy < -0.5);
  if (heroOn) p.hero = Math.min(1, p.hero + 1 / HERO_POSE_BLEND_IN);
  else p.hero = Math.max(0, p.hero - 1 / HERO_POSE_BLEND_OUT);
}

function startWallKick(side) {
  const p = ninjaPose;
  if (p.wallKick > 0.6 && p.wallSide === side) return;
  p.wallKick = 1;
  p.wallSide = side;
  p.wallX = FX.textures ? (side < 0 ? FX.wallWidth : W - FX.wallWidth) : (side < 0 ? 0 : W); // foot on the drawn wall
  debugStats.wallKicks++;
}

/** Wall-kick envelope: plant the wall-side leg, push, lean toward the rebound, then relax. */
function wallKickState() {
  const p = ninjaPose;
  if (p.wallKick <= 0 || !ninja || state !== 'playing') return null;
  const k = 1 - p.wallKick;
  const w = smoothstep(0, 0.05, k) * (1 - smoothstep(0.72, 1, k)); // snaps in on contact
  const ext = smoothstep(0.05, 0.45, k); // 0 = knee bent on the wall, 1 = leg pushed straight
  return { w, ext, side: p.wallSide, lean: -p.wallSide * 0.42 * w * (0.5 + 0.5 * ext) };
}

function ninjaLimb(x1, y1, x2, y2, x3, y3, w) {
  ninjaLimbC(x1, y1, x2, y2, x3, y3, w, skin.limb);
}

function limbPath(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
}

function ninjaLimbC(x1, y1, x2, y2, x3, y3, w, col) {
  // Outline pass, base pass, then a thin highlight toward the light (rounded 3D limb)
  limbPath(x1, y1, x2, y2, x3, y3);
  ctx.strokeStyle = skin.out;
  ctx.lineWidth = w + 3;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
  const ox = ninjaLightX * w * 0.2, oy = -w * 0.2;
  limbPath(x1 - ox, y1 - oy, x2 - ox, y2 - oy, x3 - ox, y3 - oy); // core shadow
  ctx.strokeStyle = skin.limbShade;
  ctx.lineWidth = w * 0.4;
  ctx.stroke();
  limbPath(x1 + ox, y1 + oy, x2 + ox, y2 + oy, x3 + ox, y3 + oy);
  ctx.strokeStyle = skin.limbHi;
  ctx.lineWidth = w * 0.36;
  ctx.stroke();
}

function ninjaFoot(fx, fy, rx, ry, rot, col) {
  ctx.fillStyle = col;
  ctx.strokeStyle = skin.out;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(fx, fy, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = skin.limbHi;
  ctx.beginPath();
  ctx.ellipse(fx + ninjaLightX * rx * 0.3, fy - ry * 0.35, rx * 0.45, ry * 0.3, rot, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Leg geometry. Normal pose = old side-view squat legs. When this is the wall-side leg during a
 * wall kick, the foot reaches for the wall (planted while in reach, then pushed straight).
 */
function legGeom(hx, legTop, kneeDx, kneeY, ankleBack, footY, footDx, kick, isKickLeg, rot, facing) {
  let kx = hx + kneeDx, ky = kneeY;
  let ax = hx - ankleBack, ay = footY - 1;
  let fx = ax + footDx, fy = footY, frot = 0;
  if (!kick || kick.w <= 0) return { hx, hy: legTop, kx, ky, ax, ay, fx, fy, frot };
  const w = kick.w;
  if (!isKickLeg) {
    // other leg tucks a little
    return { hx, hy: legTop, kx: kx + w * 3, ky: ky - w * 1.5, ax: ax + w * 1.5, ay: ay - w * 2.5,
      fx: fx + w * 1.5, fy: fy - w * 2.5, frot: 0 };
  }
  // Wall point (world, relative to ninja centre) → local sprite space
  const wx = ninjaPose.wallX - ninja.x, wy = 17; // foot plants a bit below the hip
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const lx = (wx * cr + wy * sr) * facing;
  const ly = -wx * sr + wy * cr;
  let dx = lx - hx, dy = ly - legTop;
  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist; dy /= dist;
  const reach = Math.min(dist, NINJA_LEG_LEN);
  const kfx = hx + dx * reach, kfy = legTop + dy * reach;
  // knee bends upward while compressed against the wall
  const half = NINJA_LEG_LEN / 2;
  const bend = Math.max(Math.sqrt(Math.max(0, half * half - (reach / 2) * (reach / 2))), (1 - kick.ext) * 3);
  let px = -dy, py = dx;
  if (py > 0) { px = -px; py = -py; }
  const kkx = hx + dx * reach * 0.5 + px * bend, kky = legTop + dy * reach * 0.5 + py * bend;
  let a = Math.atan2(dy, dx) + Math.PI / 2;
  a = ((a + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2; // ellipse is symmetric
  return {
    hx, hy: legTop,
    kx: lerp(kx, kkx, w), ky: lerp(ky, kky, w),
    ax: lerp(ax, kfx, w), ay: lerp(ay, kfy, w),
    fx: lerp(fx, kfx + dx * 1.2, w), fy: lerp(fy, kfy + dy * 1.2, w),
    frot: a * w
  };
}

function drawLeg(g, width, col, footCol, rx, ry) {
  ninjaLimbC(g.hx, g.hy, g.kx, g.ky, g.ax, g.ay, width, col);
  ninjaFoot(g.fx, g.fy, rx, ry, g.frot, footCol);
}

function drawNinja(x, y) {
  updateNinjaPose();
  drawNinjaSprite(x, y);
}
function drawNinjaSprite(x, y) {
  if (ninja && !ninja.dead && state === 'playing' && (ninjaPose.hero > 0 || ninja.superSpin)) { drawHeroNinja(x, y); return; }
  const p = ninjaPose;
  const c = p.crouch;
  const onBand = state === 'playing' && elastic && elastic.phase === 'stretching';
  const kick = wallKickState();
  const facing = ninja ? ninja.facing : 1;
  ninjaLightX = -facing;

  ctx.save();
  ctx.translate(x, y);
  let rot = 0;
  if (kick) { ctx.rotate(kick.lean); rot += kick.lean; }
  if (Math.abs(p.lean) > 0.004) { ctx.rotate(p.lean); rot += p.lean; } // tilts into the side motion
  if (stretch > 0.05 && onBand) {
    ctx.rotate(stretchDir);
    ctx.scale(1 + stretch * 0.15, 1 - stretch * 0.35);
    ctx.rotate(-stretchDir);
  }
  if (ninja && ninja.spinning > 0) {
    const a = ninja.spinning * Math.PI * 2 * ninja.facing;
    ctx.rotate(a); rot += a;
  }
  if (ninja && ninja.dead) { ctx.rotate(ninja.deathSpin); rot += ninja.deathSpin; }
  // Launch impulse: slight vertical stretch
  if (p.launch > 0.02) ctx.scale(1 - p.launch * 0.1, 1 + p.launch * 0.16);
  // rise / fall in-between: a touch longer while shooting up, a touch squat at the fall's peak speed
  const rise = Math.max(0, -p.air), fall = Math.max(0, p.air);
  if (rise > 0.02 || fall > 0.02) ctx.scale(1 - rise * 0.035 + fall * 0.02, 1 + rise * 0.05 - fall * 0.025);
  if (ninja) ctx.scale(facing, 1);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Layout (local, +x = forward). Feet stay planted; upper body lowers with crouch.
  const drop = c * 4.5;
  const bodyY = 8 + drop;          // body center
  const headY = -8 + drop;         // head center
  const hipY = bodyY + 4;
  const footY = 21;
  const hr = 11.5;

  // Soft drop shadow (depth), offset down-right in world space
  const sx = 1.8 * facing;
  ctx.fillStyle = 'rgba(10,12,35,0.22)';
  ctx.beginPath();
  ctx.arc(sx, headY + 2.6, hr + 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx, bodyY + 2.6, 8.6, 7.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Velocity-driven flutter for headband / belt tails (back = -x locally)
  const vx = ninja ? ninja.vx * facing : 0;
  const vy = ninja ? ninja.vy : 0;
  const spd = Math.min(16, Math.hypot(vx, vy));
  // flutter: faster and wider with speed, plus a smaller ripple travelling along the cloth
  const wave = Math.sin(frame * (0.3 + spd * 0.025)) * (1.5 + spd * 0.3);
  const ripple = Math.sin(frame * 0.9 + 1.3) * spd * 0.09;
  const tailLen = 9 + spd * 0.55;
  const tailDy = Math.max(-8, Math.min(10, -vy * 0.55)) + 3;

  // Headband tails (behind everything)
  const knotX = -9.5, knotY = headY - 4;
  drawNinjaTails(knotX, knotY, tailLen, tailDy, wave, ripple);

  // Legs (side-view squat): thighs rotate FORWARD (+x = facing, mirrored by the
  // facing scale), shins angle back down to feet kept together. Back leg is drawn
  // behind the body; once crouching (or kicking a wall in front), the front leg is
  // drawn in front of the body so the forward knee reads clearly.
  const legTop = hipY;
  // rising: knees tuck up a little; falling: feet trail slightly back (smoothed in-betweens)
  const kneeFwd = c * 9.5 + rise * 3.2;
  const kneeY = legTop + (footY - 1 - legTop) * 0.5 - c * 2.5 - rise * 1.6;
  const ankleBack = c * 1.5 + fall * 1.8 - rise * 0.8;
  const kickFront = !!kick && kick.side * facing > 0;
  const backG = legGeom(-2.2, legTop, kneeFwd * 0.85, kneeY + 0.6, ankleBack, footY, 0.2, kick, !!kick && !kickFront, rot, facing);
  const frontG = legGeom(2.2, legTop, kneeFwd, kneeY, ankleBack, footY, 1.0, kick, kickFront, rot, facing);
  drawLeg(backG, 4.4, skin.limbBack, skin.footBack, 3.3, 2.5);
  const frontInFront = c > 0.12 || (kickFront && kick.w > 0.05);
  if (!frontInFront) drawLeg(frontG, 4.6, skin.limb, skin.foot, 3.4, 2.5);

  drawNinjaTorso(bodyY, facing, spd, wave, -6);

  if (frontInFront) drawLeg(frontG, 4.6, skin.limb, skin.foot, 3.4, 2.5);

  // Arms: rotate outward symmetrically with crouch, 0..60° (hard clamp); open a bit for balance on a wall kick
  let armA = Math.max(c * NINJA_MAX_ARM, p.relax * (Math.PI / 12), kick ? kick.w * 0.55 : 0);
  if (armA > NINJA_MAX_ARM) armA = NINJA_MAX_ARM;
  const shY = bodyY - 3.5, shX = 6.2, armLen = 8.5;
  const sa = Math.sin(armA), ca = Math.cos(armA);
  const rhx = shX + sa * armLen, rhy = shY + ca * armLen;
  ninjaLimb(-shX, shY, (-shX - rhx) * 0.5, (shY + rhy) * 0.5, -rhx, rhy, 4.2);
  ninjaLimb(shX, shY, (shX + rhx) * 0.5, (shY + rhy) * 0.5, rhx, rhy, 4.2);
  for (let i = -1; i <= 1; i += 2) {
    const hx = rhx * i;
    ctx.fillStyle = skin.hand;
    ctx.strokeStyle = skin.out;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, rhy, 3.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = skin.spec;
    ctx.beginPath();
    ctx.arc(hx + ninjaLightX * 0.9, rhy - 0.9, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawNinjaHead(headY, hr, facing, knotX, knotY, 2.2, 1, 1);

  ctx.restore();
}

// --- Hero pose (super jump): "superman uppercut" while spinning around his own vertical axis ---
// Front arm punching straight up, slightly forward like an uppercut (so the fist still shows in profile), other fist tucked at the stomach, one knee up at
// waist height (thigh level, shin hanging), the other leg straight and pointed down, body stretched.
// The pirouette is faked in 2D: joints live in body space (lat = sideways, y = down, fwd = toward his
// face) and are projected for the spin angle; limbs are drawn back-to-front by depth (far ones darker),
// the visor slides/narrows and disappears from behind. Angle 0 = the normal (front) view.
// Blend: joints go from the normal pose (b = 0) to the hero pose (b = 1).
const HERO_JOINTS = {
  //            normal pose [lat, y, fwd] ... hero pose [lat, y, fwd]
  armUp:   { n: [[6.2, 4.5, 0.6], [6.2, 8.75, 0.6], [6.2, 13, 0.6]], h: [[6.4, 3.6, 0.5], [8.2, -6.3, 4], [9.2, -16.6, 8.5]] },
  armTuck: { n: [[-6.2, 4.5, 0.4], [-6.2, 8.75, 0.4], [-6.2, 13, 0.4]], h: [[-6.4, 4.2, 0], [-9.8, 9.6, -1.2], [-3.4, 11.2, 6.2]] },
  legUp:   { n: [[2.2, 12, 0.2], [2.2, 16.5, 0.2], [2.2, 20, 0.2], [3.2, 21, 0.2]], h: [[2.6, 12, 0.3], [3, 12.2, 9.4], [3, 19.6, 8.6], [3, 21.4, 10.6]] },
  legDown: { n: [[-2.2, 12, 0], [-2.2, 16.9, 0], [-2.2, 20, 0], [-2.0, 21, 0]], h: [[-2.4, 12, 0], [-2.6, 19, -0.4], [-2.8, 25.8, -0.8], [-2.8, 28.2, -0.9]] }
};
function heroSpinAngle() {
  if (!ninja.superSpin) return 0;
  const a = ninja.spinAngle;
  return a - SUPER_SPIN_LINGER * Math.sin(4 * a) / 4; // slower through the front/side/back views
}
function drawFist(fx, fy, ux, uy, near, glow) {
  // ux,uy = direction the fist points (knuckles side)
  if (glow > 0.02) {
    const g = ctx.createRadialGradient(fx, fy, 1, fx, fy, 10);
    g.addColorStop(0, 'rgba(255,246,180,' + (0.65 * glow).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx, fy, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = near ? skin.hand : skin.limbBack;
  ctx.strokeStyle = skin.out;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(fx, fy, 3.9, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // knuckle creases across the fist + thumb fold
  const px = -uy, py = ux;
  ctx.strokeStyle = 'rgba(20,20,45,0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = -1; k <= 1; k++) {
    const cx = fx + ux * 1.6 + px * k * 1.5, cy = fy + uy * 1.6 + py * k * 1.5;
    ctx.moveTo(cx - ux * 1.2, cy - uy * 1.2);
    ctx.lineTo(cx + ux * 0.9, cy + uy * 0.9);
  }
  ctx.moveTo(fx - px * 2.6 - ux * 0.6, fy - py * 2.6 - uy * 0.6);
  ctx.lineTo(fx - ux * 1.6, fy - uy * 1.6);
  ctx.stroke();
  ctx.fillStyle = skin.spec;
  ctx.beginPath();
  ctx.arc(fx + ninjaLightX * 1.2, fy - 1.3, 1.3, 0, Math.PI * 2);
  ctx.fill();
}
function drawHeroNinja(x, y) {
  const p = ninjaPose, b = smoothstep(0, 1, p.hero), facing = ninja.facing;
  ninjaLightX = -facing;
  const th = heroSpinAngle(), c = Math.cos(th), s = Math.sin(th);
  const vy = ninja.vy;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // speed streaks below him while he shoots up (world space)
  if (b > 0.2 && vy < -5) {
    const k = Math.min(1, (-vy - 5) / 20) * b;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 * k).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const sx = (i - 1.5) * 7 + Math.sin(frame * 0.7 + i * 2) * 1.5, len = 14 + (-vy) * (1.2 + 0.4 * ((i * 7 + frame) % 3));
      const sy = 26 + ((frame * 3 + i * 9) % 10);
      ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + len);
    }
    ctx.stroke();
  }
  // body stretched upward in the pose
  ctx.translate(0, 8);
  ctx.scale(1 - 0.05 * b, 1 + 0.08 * b);
  ctx.translate(0, -8);
  ctx.scale(facing, 1);
  const bodyY = 8 - 1.2 * b, headY = -8 - 1.6 * b, hr = 11.5;
  // soft drop shadow
  const sx = 1.8 * facing;
  ctx.fillStyle = 'rgba(10,12,35,0.22)';
  ctx.beginPath(); ctx.arc(sx, headY + 2.6, hr + 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx, bodyY + 2.6, 8.6, 7.8, 0, 0, Math.PI * 2); ctx.fill();
  // headband tails trail behind (back of the head), squashed with the turn
  const spd = Math.min(16, Math.hypot(ninja.vx, vy));
  const wave = Math.sin(frame * 0.35) * (1.5 + spd * 0.25);
  const kX = 9.5 * (-0.6 * c - 0.8 * s), kd = -0.8 * c + 0.6 * s;
  const knotX = lerp(-9.5, kX, b), knotY = headY - 4;
  drawNinjaTails(knotX, knotY, 9 + spd * 0.45, Math.max(-8, Math.min(10, -vy * 0.55)) + 3, wave);
  // project the limbs
  const parts = [];
  for (const name in HERO_JOINTS) {
    const J = HERO_JOINTS[name], pts = [];
    let d = 0;
    for (let i = 0; i < J.n.length; i++) {
      const lat = lerp(J.n[i][0], J.h[i][0], b), yy = lerp(J.n[i][1], J.h[i][1], b), fwd = lerp(J.n[i][2], J.h[i][2], b);
      const px = lat * c + fwd * s, pd = fwd * c - lat * s;
      pts.push([px, yy]);
      d += pd;
    }
    parts.push({ name: name, pts: pts, d: d / J.n.length });
  }
  parts.sort((u, v) => u.d - v.d);
  const drawPart = (pt) => {
    const near = pt.d >= -1;
    const P = pt.pts;
    if (pt.name === 'armUp' || pt.name === 'armTuck') {
      ninjaLimbC(P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1], 4.2, near ? skin.limb : skin.limbBack);
      let ux = P[2][0] - P[1][0], uy = P[2][1] - P[1][1];
      const ul = Math.hypot(ux, uy) || 1;
      drawFist(P[2][0], P[2][1], ux / ul, uy / ul, near, pt.name === 'armUp' ? b : 0);
    } else {
      const fr = Math.atan2(P[3][1] - P[2][1], P[3][0] - P[2][0]);
      const g = { hx: P[0][0], hy: P[0][1], kx: P[1][0], ky: P[1][1], ax: P[2][0], ay: P[2][1], fx: P[3][0], fy: P[3][1], frot: b * fr };
      if (near) drawLeg(g, 4.6, skin.limb, skin.foot, 3.4, 2.5);
      else drawLeg(g, 4.4, skin.limbBack, skin.footBack, 3.3, 2.5);
    }
  };
  for (const pt of parts) if (pt.d < 0) drawPart(pt);
  let bk = -6 * c - 2 * s * b;
  if (Math.abs(bk) < 1.5) bk = bk < 0 ? -1.5 : 1.5;
  drawNinjaTorso(bodyY, facing, spd, wave, bk);
  if (b > 0.05 && Math.abs(s) > 0.05) { // side-on: the body turns away from the light a little
    ctx.fillStyle = 'rgba(10,15,45,' + (0.12 * Math.abs(s) * b).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(0, bodyY, 8.2, 7.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // visor follows his face around the head; gone when we see the back of the head
  const vw = lerp(1, 0.45 + 0.55 * Math.max(0, c), b);
  let visorX = lerp(2.2, 2.2 * c + 7.5 * s, b);
  const lim = hr - 7.2 * vw - 1;
  visorX = Math.max(-lim, Math.min(lim, visorX));
  const va = lerp(1, smoothstep(-0.25, 0.15, c), b);
  drawNinjaHead(headY, hr, facing, (b < 0.5 || kd > -0.35) ? knotX : null, knotY, visorX, vw, va);
  for (const pt of parts) if (pt.d >= 0) drawPart(pt);
  ctx.restore();
}

// --- Shared sprite parts (normal pose and hero pose) ---
function drawNinjaTails(knotX, knotY, tailLen, tailDy, wave, ripple) {
  const rp = ripple || 0; // extra wiggle at the tips only = the cloth ripples along its length
  ctx.fillStyle = skin.band;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; // light rim so tails read on night/space
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(knotX, knotY - 1.8);
  ctx.quadraticCurveTo(knotX - tailLen * 0.5, knotY - 3 + wave, knotX - tailLen, knotY + tailDy - 2 + wave + rp);
  ctx.lineTo(knotX - tailLen + 1, knotY + tailDy + 2 + wave + rp);
  ctx.quadraticCurveTo(knotX - tailLen * 0.5, knotY + 1 + wave * 0.6, knotX, knotY + 1.8);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(knotX, knotY);
  ctx.quadraticCurveTo(knotX - tailLen * 0.4, knotY + 2 - wave * 0.8, knotX - tailLen * 0.8, knotY + tailDy + 5 - wave * 0.8 - rp);
  ctx.lineTo(knotX - tailLen * 0.8 + 1.5, knotY + tailDy + 8 - wave * 0.8 - rp);
  ctx.quadraticCurveTo(knotX - tailLen * 0.35, knotY + 4 - wave * 0.5, knotX + 0.5, knotY + 2.5);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

}
// Body + belt; bk = x of the belt knot (back side), its tails trail away from the body centre
function drawNinjaTorso(bodyY, facing, spd, wave, bk) {
  const bd = bk < 0 ? 1 : -1;
  // Body: radial shading lit from the top-left (world), rim light on the shadow side
  ctx.save();
  ctx.scale(facing, 1); // back to world orientation for lighting (shape is symmetric)
  const bg = ctx.createRadialGradient(-3, bodyY - 3.5, 0.5, 0, bodyY, 9);
  bg.addColorStop(0, skin.body[0]);
  bg.addColorStop(0.45, skin.body[1]);
  bg.addColorStop(1, skin.body[2]);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 8.2, 7.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = skin.rim;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 7.1, 6.3, 0, -Math.PI * 0.15, Math.PI * 0.45);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = skin.out;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 8.2, 7.4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Belt + knot tails
  const beltY = bodyY + 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 8.2, 7.4, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = skin.band;
  ctx.fillRect(-9, beltY - 1.7, 18, 3.4);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-9, beltY - 1.7, 18, 0.9);
  ctx.restore();
  ctx.fillStyle = skin.band;
  ctx.beginPath();
  ctx.moveTo(bk, beltY);
  ctx.lineTo(bk - 3 * bd - spd * 0.2 * bd, beltY + 3.5 + wave * 0.4);
  ctx.lineTo(bk - 1.5 * bd - spd * 0.2 * bd, beltY + 4.8 + wave * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bk - 0.3 * bd, beltY, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(bk - 0.8 * bd, beltY - 0.6, 0.6, 0, Math.PI * 2);
  ctx.fill();

}
// Head, headband, knot and visor. visorX = visor centre, vw = visor width factor, va = visor alpha
function drawNinjaHead(headY, hr, facing, knotX, knotY, visorX, vw, va) {
  // Soft occlusion where the head sits on the body
  ctx.fillStyle = skin.occl;
  ctx.beginPath();
  ctx.ellipse(0, headY + hr - 0.3, 7.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (big and round): sphere shading, rim light, specular highlight
  ctx.save();
  ctx.scale(facing, 1);
  const hg = ctx.createRadialGradient(-4.6, headY - 5.6, 1, -0.5, headY - 0.5, hr + 1.5);
  hg.addColorStop(0, skin.head[0]);
  hg.addColorStop(0.35, skin.head[1]);
  hg.addColorStop(0.75, skin.head[2]);
  hg.addColorStop(1, skin.head[3]);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, headY, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = skin.rim;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, headY, hr - 1.4, -Math.PI * 0.1, Math.PI * 0.5);
  ctx.stroke();
  ctx.fillStyle = skin.spec;
  ctx.beginPath();
  ctx.ellipse(-4, headY - 6.8, 3.2, 1.8, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = skin.out;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, headY, hr, 0, Math.PI * 2);
  ctx.stroke();

  // Headband around the head (cylindrical shading + top highlight)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, headY, hr - 0.4, 0, Math.PI * 2);
  ctx.clip();
  const hbg = ctx.createLinearGradient(0, headY - 9.5, 0, headY - 2.5);
  hbg.addColorStop(0, skin.bandGrad[0]);
  hbg.addColorStop(0.45, skin.bandGrad[1]);
  hbg.addColorStop(1, skin.bandGrad[2]);
  ctx.fillStyle = hbg;
  ctx.beginPath();
  ctx.moveTo(-hr, headY - 7);
  ctx.quadraticCurveTo(0, headY - 9.5, hr, headY - 6.5);
  ctx.lineTo(hr, headY - 2.5);
  ctx.quadraticCurveTo(0, headY - 5, -hr, headY - 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-hr, headY - 6.3);
  ctx.quadraticCurveTo(0, headY - 8.8, hr, headY - 5.8);
  ctx.stroke();
  ctx.restore();
  // knot (null = hidden behind the head)
  if (knotX !== null) {
  ctx.fillStyle = skin.band;
  ctx.beginPath();
  ctx.arc(knotX + 0.3, knotY, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(knotX - 0.3, knotY - 0.8, 0.8, 0, Math.PI * 2);
  ctx.fill();
  }

  // Face visor (glossy dark rounded slot) with eyes, shifted toward facing side
  const vxc = visorX, vyc = headY + 2.2;
  if (va <= 0.01) return;
  if (va < 1) { ctx.save(); ctx.globalAlpha *= va; }
  const vg = ctx.createLinearGradient(0, vyc - 3.6, 0, vyc + 3.8);
  vg.addColorStop(0, skin.visor[0]);
  vg.addColorStop(1, skin.visor[1]);
  ctx.fillStyle = vg;
  roundRect(vxc - 7.2 * vw, vyc - 3.6, 14.4 * vw, 7.4, Math.min(3.7, 7.2 * vw));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(vxc - 5 * vw, vyc - 2.5);
  ctx.lineTo(vxc + 4.6 * vw, vyc - 2.5);
  ctx.stroke();
  ctx.fillStyle = skin.eye;
  const blink = (frame % 220) < 6 ? 0.25 : 1;
  ctx.beginPath();
  ctx.ellipse(vxc - 3 * vw, vyc, 1.5 * Math.min(1, 0.4 + vw * 0.6), 2.3 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(vxc + 3.2 * vw, vyc, 1.5 * Math.min(1, 0.4 + vw * 0.6), 2.3 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  if (va < 1) ctx.restore();

}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
