// --- Hazard drawing (same 3D language as the ninja: light from top-left, soft shadows).
// Readability: bumpable things are cool blue/steel; fatal things are red or spiky metal with a red glow.
function drawHazard(hz) {
  const cam = camera.y;
  const sy = hz.y - cam;
  if (sy < -60 || sy > H + 60) return;
  if (hz.dying > 0) { // stomp poof: spin, puff up and fade out
    const k = hz.dying / HAZARDS.stomp.poofFrames;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.translate(hz.x, sy);
    ctx.rotate((1 - k) * 2.4 * hz.face);
    const sc = 1 + (1 - k) * 0.5;
    ctx.scale(sc, sc * (0.45 + 0.55 * k));
    ctx.translate(-hz.x, -sy);
  }
  const dv = hz.dv, tp = hz.tp;
  const diveWarn = dv && dv.st === 'warn' && !hz.dying, tpWarn = tp && tp.st === 'warn' && !hz.dying;
  if (diveWarn) drawDiveTelegraph(hz, sy);
  if (tpWarn) drawTeleportGhost(hz);
  if (dv && dv.st === 'dive') drawDiveTrail(hz, sy);
  if (diveWarn || tpWarn) { // telegraph: shake (dive) / flicker (teleport)
    ctx.save();
    if (diveWarn) ctx.translate(Math.sin(frame * 2.1) * 2.2, Math.cos(frame * 1.7) * 1.2);
    else ctx.globalAlpha = (tp.t >> 2) % 2 === 0 ? 0.45 : 1;
    drawHazardBody(hz, sy);
    ctx.restore();
  } else drawHazardBody(hz, sy);
  if (diveWarn) drawAlertMark(hz.x, sy - 30, dv.t);
  else if (tpWarn) drawAlertMark(hz.x, sy - 28, tp.t);
  if (hz.dying > 0) ctx.restore();
}

// --- Enemy telegraphs (~0.5 s before any sudden move) ---
function drawAlertMark(x, y, t) {
  const pop = Math.min(1, t / 6), s = 0.7 + 0.3 * pop + Math.sin(t * 0.6) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffe14a';
  ctx.strokeStyle = '#3a0a10';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c4121f';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 1);
  ctx.restore();
}
function drawDiveTelegraph(hz, sy) {
  const d = hz.dv, k = d.t / HAZARDS.enemies.batDive.warn;
  const tx = hz.ox + d.tx, ty = sy + d.ty;
  ctx.save();
  ctx.fillStyle = 'rgba(255,40,50,' + (0.18 + 0.22 * Math.abs(Math.sin(d.t * 0.45))).toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(hz.x, sy, 30 + 6 * k, 0, Math.PI * 2); ctx.fill(); // pulsing glow
  ctx.strokeStyle = 'rgba(255,70,70,' + (0.35 + 0.4 * k).toFixed(3) + ')';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -frame * 0.8;
  ctx.beginPath(); ctx.moveTo(hz.x, sy); ctx.lineTo(tx, ty); ctx.stroke(); // faint dive path
  ctx.setLineDash([]);
  const r = 14 - 5 * k;                          // crosshair tightening on the target spot
  ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.moveTo(tx - r - 4, ty); ctx.lineTo(tx - r + 3, ty);
  ctx.moveTo(tx + r - 3, ty); ctx.lineTo(tx + r + 4, ty);
  ctx.stroke();
  ctx.restore();
}
function drawDiveTrail(hz, sy) {
  const d = hz.dv;
  ctx.save();
  for (let i = 1; i <= 3; i++) {
    const k = Math.max(0, d.t - i * 2) / HAZARDS.enemies.batDive.dive, kk = k * k;
    ctx.globalAlpha = 0.22 - i * 0.05;
    ctx.fillStyle = '#ff3b4a';
    ctx.beginPath();
    ctx.arc(hz.ox + d.tx * kk, sy - d.dy + d.ty * kk, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawTeleportGhost(hz) {
  const p = hz.tp, k = p.t / HAZARDS.enemies.ufoTeleport.warn;
  const gx = hz.ox + p.nx, gy = hz.oy + p.ny - camera.y;
  const red = hz.color === 'red';
  ctx.save();
  ctx.strokeStyle = red ? 'rgba(255,110,110,0.9)' : 'rgba(150,255,140,0.9)';
  ctx.fillStyle = red ? 'rgba(255,80,80,' + (0.1 + 0.15 * k).toFixed(3) + ')' : 'rgba(140,255,130,' + (0.1 + 0.15 * k).toFixed(3) + ')';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = frame * 0.6;
  ctx.beginPath(); ctx.ellipse(gx, gy, hz.rx + 4 - 4 * k, hz.ry + 4 - 3 * k, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.5;                         // sparkles converging on the spot
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + frame * 0.08, rr = (1 - k) * 26 + 6;
    ctx.beginPath(); ctx.arc(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr * 0.6, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawHazardBody(hz, sy) {
  if (hz.type === 'platform') drawPlatform(hz, sy);
  else if (hz.type === 'flyer') drawFlyer(hz, sy);
  else if (hz.type === 'spikeMine') drawSpikeMine(hz, sy);
  else if (hz.type === 'spikeBar') drawSpikeBar(hz, sy);
  else if (hz.type === 'saw') drawSaw(hz, sy);
  else if (hz.type === 'ufo') drawUfo(hz, sy);
}

// Gradients are built once and reused (hazards are drawn in translated local coords) — cheaper on phones
const hzGradCache = {};
function hzGrad(key, make) { return hzGradCache[key] || (hzGradCache[key] = make()); }
function stops(g, list) { for (let i = 0; i < list.length; i += 2) g.addColorStop(list[i], list[i + 1]); return g; }

function dangerHalo(r, t) {
  ctx.fillStyle = 'rgba(255,40,50,' + (0.13 + 0.07 * Math.sin(t * 0.15)).toFixed(3) + ')';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatform(hz, sy) {
  const h = hz.h;
  let x0 = hz.x - hz.w / 2, x1 = hz.x + hz.w / 2;
  if (hz.attach === 'left') x0 -= 10;   // built into the wall
  if (hz.attach === 'right') x1 += 10;
  const ww = x1 - x0, y0 = sy - h / 2;
  ctx.fillStyle = 'rgba(10,15,40,0.2)';
  roundRect(x0 + 3, y0 + 5, ww, h, 7);
  ctx.fill();
  ctx.save();
  ctx.translate(0, y0);
  ctx.fillStyle = hzGrad('plat', () => stops(ctx.createLinearGradient(0, 0, 0, h), [0, '#93a9c6', 0.5, '#63799b', 1, '#3d4f6e']));
  roundRect(x0, 0, ww, h, 7);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(20,30,60,0.28)';
  for (let sx = x0 + 34; sx < x1 - 12; sx += 38) ctx.fillRect(sx, y0 + 3, 1.5, h - 5);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x0, y0, ww, 2.5);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x0, y0 + h - 3, ww, 3);
  if (hz.hit > 0.05) {
    ctx.fillStyle = 'rgba(255,255,255,' + (hz.hit * 0.35).toFixed(3) + ')';
    ctx.fillRect(x0, y0, ww, h);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(15,20,45,0.5)';
  ctx.lineWidth = 1.5;
  roundRect(x0, y0, ww, h, 7);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,220,255,0.75)'; // cool rim light = safe to bump
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 + 6, y0 + 1);
  ctx.lineTo(x1 - 6, y0 + 1);
  ctx.stroke();
  if (hz.range) { // sliding platform: small thruster lights on both ends
    ctx.fillStyle = 'rgba(120,215,255,0.9)';
    ctx.beginPath(); ctx.arc(x0 + 6, sy, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x1 - 6, sy, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWing(red, flap, back) {
  ctx.save();
  ctx.translate(-2, -3);
  ctx.rotate(-0.35 + flap * 0.75 + (back ? -0.3 : 0));
  ctx.lineWidth = 1.2;
  if (red) { // bat wing: pointed, scalloped edge
    ctx.fillStyle = back ? '#5e0710' : '#a01224';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-23, -7);
    ctx.quadraticCurveTo(-18, -2, -19, 2);
    ctx.quadraticCurveTo(-14, 0, -12, 4);
    ctx.quadraticCurveTo(-7, 1, -4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,0,5,0.85)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,140,0.45)';
    ctx.beginPath();
    ctx.moveTo(-1, 0); ctx.lineTo(-8, -9.5); ctx.lineTo(-19, 1.5);
    ctx.moveTo(-8, -9.5); ctx.lineTo(-12, 3.5);
    ctx.stroke();
  } else { // round feathered wing
    ctx.fillStyle = back ? '#4f9ddc' : '#a3ddff';
    ctx.beginPath();
    ctx.ellipse(-10, -1, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,35,80,0.75)';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(-4, -1.5); ctx.lineTo(-15, -3);
    ctx.moveTo(-5, 1.5); ctx.lineTo(-16, 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlyer(hz, sy) {
  const red = hz.color === 'red';
  const flap = Math.sin(hz.t * (red ? 0.38 : 0.3) + hz.bobPhase);
  const face = hz.range ? (Math.cos(hz.phase) >= 0 ? 1 : -1) : (hz.dv && hz.dv.st !== 'idle' ? (hz.dv.tx >= 0 ? 1 : -1) : hz.face);
  ctx.save();
  ctx.translate(hz.x, sy);
  if (red) dangerHalo(26, hz.t);
  ctx.fillStyle = 'rgba(10,10,35,0.18)';
  ctx.beginPath();
  ctx.ellipse(2, 5, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(face, 1);
  if (hz.hit > 0.05) ctx.scale(1 + hz.hit * 0.22, 1 - hz.hit * 0.22);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawWing(red, flap, true);
  ctx.fillStyle = red
    ? hzGrad('flyR', () => stops(ctx.createRadialGradient(-4, -5, 1, 0, 0, 13), [0, '#ffb3a1', 0.5, '#ff3b30', 1, '#8e0c14']))
    : hzGrad('flyB', () => stops(ctx.createRadialGradient(-4, -5, 1, 0, 0, 13), [0, '#dcf5ff', 0.5, '#3fa6ff', 1, '#1b4fa8']));
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,15,40,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = red ? 'rgba(90,0,10,0.35)' : 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.ellipse(1.5, 4.5, 6.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (red) {
    ctx.fillStyle = '#2a0508'; // horns
    ctx.beginPath();
    ctx.moveTo(-5, -9.5); ctx.lineTo(-8.5, -18); ctx.lineTo(-1.5, -11.5); ctx.closePath();
    ctx.moveTo(3, -11.5); ctx.lineTo(4.5, -19.5); ctx.lineTo(8.5, -9.5); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe14a'; // angry eyes
    ctx.beginPath();
    ctx.ellipse(2.5, -2.5, 3.2, 2.6, 0, 0, Math.PI * 2);
    ctx.ellipse(8, -2, 2.6, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0003';
    ctx.fillRect(2, -4.6, 1.2, 4.2);
    ctx.fillRect(7.5, -4, 1.1, 3.8);
    ctx.strokeStyle = '#1a0003';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-0.8, -7.8); ctx.lineTo(5, -5);
    ctx.moveTo(6, -5.4); ctx.lineTo(10.6, -7.2);
    ctx.stroke();
    ctx.fillStyle = '#fff'; // fangs
    ctx.beginPath();
    ctx.moveTo(4, 3); ctx.lineTo(5.2, 6.6); ctx.lineTo(6.4, 3); ctx.closePath();
    ctx.moveTo(7.5, 2.6); ctx.lineTo(8.5, 5.8); ctx.lineTo(9.5, 2.4); ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff'; // big friendly eyes
    ctx.beginPath();
    ctx.ellipse(2.5, -3, 3.6, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(8.3, -2.6, 3, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10204a';
    ctx.beginPath(); ctx.arc(3.4, -2.4, 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -2.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(2.8, -3.2, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb02e'; // beak
    ctx.beginPath();
    ctx.moveTo(10, 1); ctx.lineTo(15.5, 3); ctx.lineTo(10, 5); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,150,0.5)';
    ctx.beginPath(); ctx.arc(3.5, 3.5, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = red ? 'rgba(255,200,160,0.55)' : 'rgba(200,240,255,0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 10.6, -Math.PI * 0.1, Math.PI * 0.45);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-4.5, -6, 2.8, 1.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  drawWing(red, flap, false);
  ctx.restore();
}

function metalSpike(bx, by, nx, ny, half, len) {
  // two-faced spike from base centre (bx,by) along unit (nx,ny)
  const tx = bx + nx * len, ty = by + ny * len;
  const px = -ny * half, py = nx * half;
  ctx.fillStyle = '#c6ccd6';
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx + px, by + py); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#59606b';
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx - px, by - py); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
}

function drawSpikeMine(hz, sy) {
  ctx.save();
  ctx.translate(hz.x, sy);
  dangerHalo(23, hz.t);
  ctx.fillStyle = 'rgba(10,10,30,0.2)';
  ctx.beginPath(); ctx.arc(2, 4, 13, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(hz.angle);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    metalSpike(ca * 7.5, sa * 7.5, ca, sa, 3.6, 10);
  }
  ctx.rotate(-hz.angle);
  ctx.fillStyle = hzGrad('mine', () => stops(ctx.createRadialGradient(-3, -3, 1, 0, 0, 9.5), [0, '#b3bac6', 1, '#383d46']));
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,40,60,' + (0.55 + 0.35 * Math.sin(hz.t * 0.2)).toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-1, -1, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSpikeBar(hz, sy) {
  const w = hz.vw * 2, x0 = hz.x - w / 2;
  ctx.fillStyle = 'rgba(255,40,50,' + (0.1 + 0.05 * Math.sin(hz.t * 0.15)).toFixed(3) + ')';
  roundRect(x0 - 6, sy - 17, w + 12, 34, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,10,30,0.2)';
  roundRect(x0 + 3, sy - 1, w, 8, 3);
  ctx.fill();
  for (let sx = x0 + 6; sx <= x0 + w - 5; sx += 10) {
    metalSpike(sx, sy - 3.5, 0, -1, 4, 8);
    metalSpike(sx, sy + 3.5, 0, 1, 4, 8);
  }
  ctx.save();
  ctx.translate(0, sy);
  ctx.fillStyle = hzGrad('bar', () => stops(ctx.createLinearGradient(0, -4, 0, 4), [0, '#c2c8d2', 1, '#565d68']));
  roundRect(x0, -4, w, 8, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ff3344';
  ctx.beginPath(); ctx.arc(x0 + 4, sy, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x0 + w - 4, sy, 1.8, 0, Math.PI * 2); ctx.fill();
}

function drawSaw(hz, sy) {
  const W26 = 26, teeth = 10, r0 = W26 * 0.55, r1 = W26 * 0.75;
  ctx.save();
  ctx.translate(hz.x, sy);
  dangerHalo(25, hz.t);
  ctx.rotate(hz.angle);
  ctx.fillStyle = '#b7bdc7';
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.5) / teeth) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
    ctx.lineTo(Math.cos(a0 + (Math.PI * 2) / teeth) * r0, Math.sin(a0 + (Math.PI * 2) / teeth) * r0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.rotate(-hz.angle); // keep the metal shine fixed to the light
  ctx.fillStyle = hzGrad('saw', () => stops(ctx.createRadialGradient(-W26 * 0.2, -W26 * 0.2, 1, 0, 0, r0), [0, '#f2f4f8', 0.6, '#9aa1ad', 1, '#5c626d']));
  ctx.beginPath(); ctx.arc(0, 0, r0 * 0.92, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a4f58';
  ctx.beginPath(); ctx.arc(0, 0, W26 * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff3344';
  ctx.beginPath(); ctx.arc(0, 0, W26 * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawUfo(hz, sy) {
  const red = hz.color === 'red';
  ctx.save();
  ctx.translate(hz.x, sy);
  if (red) dangerHalo(30, hz.t);
  else {
    ctx.fillStyle = 'rgba(140,220,255,0.13)'; // soft tractor beam
    ctx.beginPath();
    ctx.moveTo(-8, 6); ctx.lineTo(8, 6); ctx.lineTo(18, 32); ctx.lineTo(-18, 32);
    ctx.closePath();
    ctx.fill();
  }
  if (hz.hit > 0.05) ctx.scale(1 + hz.hit * 0.15, 1 - hz.hit * 0.15);
  ctx.fillStyle = 'rgba(0,0,20,0.2)';
  ctx.beginPath(); ctx.ellipse(2, 7, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  // alien
  const ag = hzGrad('alien', () => stops(ctx.createRadialGradient(-2, -10, 1, 0, -7, 7.5), [0, '#d2ffc2', 0.55, '#62d052', 1, '#2d7a29']));
  ctx.strokeStyle = '#2d7a29';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, -12); ctx.lineTo(-5, -17);
  ctx.moveTo(3, -12); ctx.lineTo(5, -17);
  ctx.stroke();
  ctx.fillStyle = red ? '#ff3344' : '#b8ff9e';
  ctx.beginPath(); ctx.arc(-5, -17, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -17, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.ellipse(0, -7, 6.2, 6.8, 0, 0, Math.PI * 2); ctx.fill();
  if (red) {
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.ellipse(-2.4, -7, 2.3, 1.4, 0.5, 0, Math.PI * 2);
    ctx.ellipse(2.4, -7, 2.3, 1.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#153d12';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4.8, -10); ctx.lineTo(-1, -8.6);
    ctx.moveTo(4.8, -10); ctx.lineTo(1, -8.6);
    ctx.moveTo(-2, -3.6); ctx.lineTo(2, -3.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(-2.4, -7.2, 1.8, 2.6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(2.4, -7.2, 1.8, 2.6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-2.8, -8.2, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -8.2, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#153d12';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -4.6, 1.8, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }
  // glass dome
  ctx.fillStyle = 'rgba(190,235,255,0.28)';
  ctx.beginPath(); ctx.arc(0, -2.5, 11.5, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -2.5, 9, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
  // saucer
  if (red) {
    for (let i = -18; i <= 18; i += 12) metalSpike(i, 6.5, 0, 1, 3, 6);
  }
  ctx.fillStyle = hzGrad('ufo', () => stops(ctx.createLinearGradient(0, -4, 0, 9), [0, '#f1f4fa', 0.55, '#9aa3b5', 1, '#4e5566']));
  ctx.beginPath(); ctx.ellipse(0, 2, 24, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(15,20,40,0.6)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = red ? '#5a1a22' : '#28476e';
  ctx.beginPath(); ctx.ellipse(0, 4, 17, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = -2; i <= 2; i++) {
    const on = (((hz.t >> 3) + i) & 1) === 0;
    ctx.fillStyle = red ? (on ? '#ff3344' : '#6b1018') : (on ? '#7fe0ff' : '#1f5a80');
    ctx.beginPath(); ctx.arc(i * 8, 4.2, 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 1, 21, 5, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.restore();
}
