// --- Character accessories (procedural, drawn with the sprite; config/skins.js says what each one wears) ---
// All parts are a few small paths in sprite space (+x = the way he faces, head centre (0, headY),
// head radius ~11.5, body ellipse 8.2 x 7.4 at (0, bodyY)). They are drawn by the shared sprite helpers,
// so the normal pose, wall kick, spin, hero pose, combos and the rocket all show them. Cosmetic only.
function accPath(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
function accFill(col, outline) {
  ctx.fillStyle = col; ctx.fill();
  if (outline !== false) { ctx.strokeStyle = skin.out; ctx.lineWidth = 1.1; ctx.stroke(); }
}

// Behind the body (drawn right after the headband tails). bdx = the side "behind" him (-1 normally).
function drawAccBack(bodyY, headY, spd, wave, bdx) {
  const A = skin.acc;
  if (!A || !A.back) return;
  for (const b of A.back) {
    if (b.type === 'tails') {
      for (let i = 0; i < (b.n || 1); i++) {
        const a = (i - ((b.n || 1) - 1) / 2) * 0.45;
        const len = 15 + spd * 0.45, sway = wave * 1.2 + Math.sin(frame * 0.12 + i) * 1.5;
        const x0 = bdx * 5, y0 = bodyY + 5, x1 = bdx * (len + 2), y1 = bodyY - 6 + sway + a * 10;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - 2.5);
        ctx.quadraticCurveTo(bdx * len * 0.55, y0 + 6 + a * 4, x1, y1);
        ctx.quadraticCurveTo(bdx * len * 0.6, y0 - 4 + a * 4, x0, y0 + 2.5);
        ctx.closePath();
        accFill(b.col);
        ctx.fillStyle = b.tip;
        ctx.beginPath(); ctx.ellipse(x1 - bdx * 2.2, y1 + 0.6, 3.2, 2.2, bdx * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (b.type === 'scarf') {
      const len = 20 + spd * 0.9, y0 = headY + 10;
      for (let k = 0; k < 2; k++) {
        const ly = y0 + k * 3.5, w2 = wave * (1.3 - k * 0.4), l = len * (1 - k * 0.25);
        ctx.beginPath();
        ctx.moveTo(bdx * 2, ly - 1.8);
        ctx.quadraticCurveTo(bdx * l * 0.5, ly - 3 + w2, bdx * l, ly + w2 * 1.4);
        ctx.lineTo(bdx * (l - 1.5), ly + 3.2 + w2 * 1.4);
        ctx.quadraticCurveTo(bdx * l * 0.5, ly + 2 + w2 * 0.6, bdx * 2, ly + 1.8);
        ctx.closePath();
        accFill(k ? shadeHex(b.col, -0.15) : b.col);
      }
    } else if (b.type === 'cloak') {
      const fl = wave * 0.6 + spd * 0.25;
      ctx.beginPath();
      ctx.moveTo(-7, bodyY - 6);
      ctx.lineTo(7, bodyY - 6);
      ctx.quadraticCurveTo(bdx * -8, bodyY + 10, bdx * (6 + fl * 0.4), bodyY + 15 + fl * 0.3);
      ctx.lineTo(bdx * (13 + fl), bodyY + 12 + fl * 0.5);
      ctx.quadraticCurveTo(bdx * 12, bodyY + 2, -7 * -bdx, bodyY - 6);
      ctx.closePath();
      accFill(b.col);
      ctx.strokeStyle = b.lining; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bdx * (6 + fl * 0.4), bodyY + 14.2 + fl * 0.3); ctx.lineTo(bdx * (12.6 + fl), bodyY + 11.4 + fl * 0.5); ctx.stroke();
      if (b.moons) drawCrescent(bdx * (9 + fl * 0.6), bodyY + 6, 2.6, '#c0142a', bdx);
    } else if (b.type === 'fans') {
      for (let k = 0; k < 2; k++) {
        const cx = bdx * (5 + k * 3), cy = bodyY - 3 - k * 5, rot = bdx * (0.5 + k * 0.5) - Math.PI / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 10, -0.75, 0.75); ctx.closePath();
        accFill(b.col);
        ctx.strokeStyle = b.col2; ctx.lineWidth = 0.9;
        ctx.beginPath(); for (let r = -2; r <= 2; r++) { const a = r * 0.35; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); } ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 9.5, -0.72, 0.72); ctx.stroke();
        ctx.restore();
      }
    } else if (b.type === 'sword') {
      // over the shoulder: handle up/front, blade down/back
      const hx = 5, hy = headY + 3, ex = bdx * 13, ey = bodyY + 13;
      if (b.glow) {
        ctx.save();
        ctx.lineCap = 'round';
        if (FX.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = b.blade; ctx.globalAlpha *= 0.35; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx - 3.5, hy + 4); ctx.lineTo(ex, ey); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - 3.5, hy + 4); ctx.lineTo(ex, ey); ctx.stroke();
      } else {
        ctx.strokeStyle = skin.out; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - 3.5, hy + 4); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = b.blade; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(hx - 3.5, hy + 4); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.strokeStyle = b.col; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 3.5, hy + 4); ctx.stroke();
    } else if (b.type === 'wings') {
      const flap = Math.sin(frame * 0.18) * 0.25 + Math.min(0.3, spd * 0.02);
      for (let k = 0; k < 2; k++) {
        ctx.save();
        ctx.translate(bdx * 4, bodyY - 4);
        ctx.rotate(bdx * (0.9 - k * 0.45 + flap));
        ctx.beginPath(); ctx.ellipse(bdx * 8, 0, 10 - k * 2, 4.2, 0, 0, Math.PI * 2);
        accFill(k ? shadeHex(b.col, -0.12) : b.col);
        ctx.strokeStyle = 'rgba(120,150,190,0.6)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(bdx * 4, 1.5); ctx.lineTo(bdx * 15, 1); ctx.moveTo(bdx * 6, -1.5); ctx.lineTo(bdx * 14, -1.8); ctx.stroke();
        ctx.restore();
      }
    } else if (b.type === 'dtail') {
      const len = 24 + spd * 0.5, x0 = bdx * 4, y0 = bodyY + 6;
      const mx = bdx * len * 0.5, my = y0 + 8 + wave, ex = bdx * len, ey = y0 - 4 - wave;
      ctx.lineCap = 'round';
      ctx.strokeStyle = skin.out; ctx.lineWidth = 6.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      ctx.strokeStyle = b.col; ctx.lineWidth = 4.4; ctx.stroke();
      ctx.fillStyle = b.col2;
      for (let i = 1; i <= 4; i++) {
        const t = i / 5, it = 1 - t;
        const px = it * it * x0 + 2 * it * t * mx + t * t * ex, py = it * it * y0 + 2 * it * t * my + t * t * ey;
        accPath([px - 1.6, py - 1.5, px, py - 5, px + 1.6, py - 1.5]); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(ex, ey, 2.4, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === 'wisp') {
      ctx.save();
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.moveTo(-7, bodyY + 3);
      ctx.quadraticCurveTo(bdx * -2 + wave, bodyY + 22, bdx * (10 + wave), bodyY + 24);
      ctx.quadraticCurveTo(bdx * 4, bodyY + 14, 7, bodyY + 3);
      ctx.closePath();
      ctx.fillStyle = b.col; ctx.fill();
      ctx.restore();
    }
  }
}
function drawCrescent(x, y, r, col, dir) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x, y, r + 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin.body[1];
  ctx.beginPath(); ctx.arc(x + (dir || 1) * r * 0.55, y - r * 0.3, r * 0.8, 0, Math.PI * 2); ctx.fill();
}

// Body pattern, clipped to the body ellipse (drawn over the shaded body, under the belt)
function drawAccBody(bodyY) {
  const A = skin.acc, B = A && A.body;
  if (!B) return;
  const c = B.col, y = bodyY;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, y, 8.2, 7.4, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  const p = B.pattern;
  if (p === 'smoke') {
    ctx.globalAlpha *= 0.4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-5 + i * 5, y + 5 - (i % 2) * 3, 3 + (i % 2), 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'cracks') {
    ctx.globalAlpha *= 0.7;
    ctx.beginPath(); ctx.moveTo(-3, y - 7); ctx.lineTo(-1, y - 2); ctx.lineTo(-4, y + 2); ctx.moveTo(-1, y - 2); ctx.lineTo(3, y + 1); ctx.lineTo(2, y + 6); ctx.stroke();
  } else if (p === 'swirl') {
    ctx.globalAlpha *= 0.7;
    ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) { const r = a * 0.7; ctx.lineTo(Math.cos(a) * r, y + Math.sin(a) * r * 0.9); } ctx.stroke();
  } else if (p === 'leaves') {
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-4 + i * 4, y - 2 + (i % 2) * 4, 2.6, 1.2, 0.6 - i * 0.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'flames') {
    ctx.beginPath(); ctx.moveTo(-9, y + 8);
    for (let i = 0; i < 4; i++) { const x = -9 + i * 4.5; ctx.quadraticCurveTo(x + 1, y + 1, x + 2.2, y - 3 - (i % 2) * 2.5); ctx.quadraticCurveTo(x + 3, y + 2, x + 4.5, y + 8); }
    ctx.closePath(); ctx.globalAlpha *= 0.85; ctx.fill();
  } else if (p === 'scales') {
    ctx.globalAlpha *= 0.6; ctx.lineWidth = 0.9;
    for (let r = 0; r < 4; r++) for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 3.6 + (r % 2) * 1.8, y - 5 + r * 3.4, 1.8, 0, Math.PI); ctx.stroke(); }
  } else if (p === 'bolt') {
    accPath([-1, y - 8, -4, y, -0.5, y, -3, y + 8, 4, y - 2, 0.5, y - 2, 3, y - 8]); ctx.fill();
  } else if (p === 'plates') {
    ctx.globalAlpha *= 0.8;
    ctx.fillRect(-9, y - 2.5, 18, 1); ctx.fillRect(-9, y + 3.5, 18, 1);
    ctx.fillStyle = '#e9edf3'; for (const x of [-5, 0, 5]) { ctx.beginPath(); ctx.arc(x, y - 4.5, 0.8, 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'stars') {
    for (const s of [[-4, -3, 1.4], [3, -4, 1], [1, 3, 1.6], [-3, 4, 0.9]]) { drawStarShape(s[0], y + s[1], s[2] * 1.6, 4, 0.4, 0.3); ctx.fill(); }
  } else if (p === 'clouds') {
    ctx.globalAlpha *= 0.85;
    for (const s of [[-4, 4], [3, -2]]) { ctx.beginPath(); ctx.arc(s[0] - 2, y + s[1], 2.2, 0, Math.PI * 2); ctx.arc(s[0] + 0.5, y + s[1] - 1, 2.8, 0, Math.PI * 2); ctx.arc(s[0] + 3, y + s[1], 2, 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'royal') {
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-6, y - 7); ctx.lineTo(0, y + 1); ctx.lineTo(6, y - 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, y + 1, 1.4, 0, Math.PI * 2); ctx.fill();
  } else if (p === 'jumpsuit') {
    ctx.fillRect(-9, y - 8, 18, 4.5); // dark shoulders
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.4, y - 3.5, 0.8, 6); // zipper
  } else if (p === 'lotus') {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 2.4, 1.1, a, 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'moons') {
    drawCrescent(-3.5, y - 2.5, 2.2, c, 1); drawCrescent(3.5, y + 3, 2.4, c, 1);
  } else if (p === 'coat') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(-4, y - 8); ctx.lineTo(1, y + 1); ctx.moveTo(5, y - 8); ctx.lineTo(1, y + 1); ctx.stroke();
    for (const yy of [y + 3, y + 6]) { ctx.beginPath(); ctx.arc(2, yy, 0.9, 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'sash') {
    ctx.save(); ctx.translate(0, y); ctx.rotate(-0.6); ctx.fillRect(-10, -1.3, 20, 2.6); ctx.restore();
  } else if (p === 'panel') {
    roundRect(-3.5, y - 5, 7, 5, 1.2); ctx.fill();
    ctx.fillStyle = (frame >> 4) % 2 ? '#5aff9a' : '#ff5a4a'; ctx.beginPath(); ctx.arc(-1.5, y - 2.5, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(1.5, y - 2.5, 0.8, 0, Math.PI * 2); ctx.fill();
  } else if (p === 'kimono') {
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5, y - 8); ctx.lineTo(2, y + 2); ctx.moveTo(5, y - 8); ctx.lineTo(-0.5, y - 1); ctx.stroke();
  } else if (p === 'belly') {
    ctx.beginPath(); ctx.ellipse(1.5, y + 1.5, 5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (p === 'circuit') {
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-8, y - 2); ctx.lineTo(-3, y - 2); ctx.lineTo(-1, y - 5); ctx.lineTo(4, y - 5);
    ctx.moveTo(-6, y + 4); ctx.lineTo(0, y + 4); ctx.lineTo(2, y + 1); ctx.lineTo(8, y + 1); ctx.stroke();
    for (const s of [[-3, -2], [4, -5], [0, 4], [2, 1]]) { ctx.beginPath(); ctx.arc(s[0], y + s[1], 0.9, 0, Math.PI * 2); ctx.fill(); }
  } else if (p === 'robe') {
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-5, y - 8); ctx.lineTo(0, y + 1); ctx.lineTo(5, y - 8); ctx.stroke();
  }
  ctx.restore();
}
// Over the body: shoulder pads, collar
function drawAccBodyTop(bodyY) {
  const A = skin.acc;
  if (!A) return;
  if (A.pads) {
    for (const sx of [-1, 1]) {
      const x = sx * 6.8, y = bodyY - 4.6;
      if (A.pads.rock) accPath([x - 3.6, y + 1.5, x - 2.6, y - 2.4, x + 0.4, y - 3.4, x + 3.4, y - 1.6, x + 3.6, y + 1.8]);
      else { ctx.beginPath(); ctx.ellipse(x, y, 3.8, 2.6, sx * 0.35, 0, Math.PI * 2); }
      accFill(A.pads.col);
      if (A.pads.neon) { ctx.strokeStyle = A.pads.neon; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(x, y, 2.6, 1.5, sx * 0.35, Math.PI, Math.PI * 2); ctx.stroke(); }
    }
  }
  if (A.collar) {
    const h = A.collar.high ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(-6.5, bodyY - 5.5); ctx.quadraticCurveTo(0, bodyY - 7.5 - h, 6.5, bodyY - 5.5);
    ctx.quadraticCurveTo(0, bodyY - 3.5, -6.5, bodyY - 5.5);
    accFill(A.collar.col);
  }
}

// Head, before the visor (hood, hair, forehead plate, crests)
function drawAccHeadMid(headY, hr, visorX, vw, va) {
  const A = skin.acc;
  if (!A) return;
  if (A.hood) {
    ctx.beginPath();
    ctx.arc(0, headY - 0.5, hr + 1.4, 0, Math.PI * 2);
    roundRect(visorX - 8.2 * vw - 1, headY - 4.2, 16.4 * vw + 2, 12.5, 5);
    ctx.fillStyle = A.hood.col;
    ctx.fill('evenodd');
    ctx.strokeStyle = skin.out; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, headY - 0.5, hr + 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = shadeHex(A.hood.col, -0.35); ctx.lineWidth = 1;
    roundRect(visorX - 8.2 * vw - 1, headY - 4.2, 16.4 * vw + 2, 12.5, 5); ctx.stroke();
  }
  if (A.hair) { // bun + ribbon at the back of the head
    ctx.beginPath(); ctx.arc(-8.5, headY - 8, 4, 0, Math.PI * 2); accFill(A.hair.col);
    ctx.fillStyle = skin.body[1]; ctx.fillRect(-9.5, headY - 9, 2.5, 2.5);
  }
  if (A.crest) {
    const C = A.crest;
    if (C.style === 'plate' && va > 0.2) {
      const px = visorX * 0.9, py = headY - 6.3;
      roundRect(px - 4.6 * vw, py - 2.3, 9.2 * vw, 4.6, 1.2);
      accFill(C.col);
      ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 0.8;
      if (C.sym === 'swirl') { ctx.beginPath(); for (let a = 0; a < 7; a += 0.5) ctx.lineTo(px + Math.cos(a) * a * 0.27 * vw, py + Math.sin(a) * a * 0.27); ctx.stroke(); }
      else if (C.sym === 'lotus') { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(px + i * 1.4 * vw, py + 0.3, 0.8 * vw, 1.6, i * 0.5, 0, Math.PI * 2); ctx.stroke(); } }
      else if (C.sym === 'scratch') {
        ctx.beginPath(); ctx.moveTo(px - 1.5 * vw, py + 1.4); ctx.lineTo(px, py - 1.4); ctx.lineTo(px + 1.5 * vw, py + 1.4); ctx.stroke();
        ctx.strokeStyle = '#c0142a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 4 * vw, py); ctx.lineTo(px + 4 * vw, py); ctx.stroke();
      }
    } else if (C.style === 'fin') {
      accPath([-6, headY - 9, 1, headY - 19, 3, headY - 10.5]); accFill(C.col);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-3, headY - 10); ctx.lineTo(0.5, headY - 16); ctx.stroke();
    } else if (C.style === 'moon' && va > 0.2) {
      ctx.fillStyle = C.col; ctx.beginPath(); ctx.arc(visorX * 0.8, headY - 6.2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = skin.bandGrad[1]; ctx.beginPath(); ctx.arc(visorX * 0.8 + 1.4, headY - 7, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (C.style === 'blade') {
      accPath([-7, headY - 9.5, 2, headY - 20, 4.5, headY - 10.5]); accFill(C.col);
    }
  }
}
// Head, after the visor (horns, ears, hats, antenna, blindfold, patch, glowing eyes, whiskers)
function drawAccHeadTop(headY, hr, visorX, vw, va) {
  const A = skin.acc;
  if (!A) return;
  const H = A.horns;
  if (H) {
    const c = H.col;
    if (H.style === 'small') { for (const s of [-1, 1]) { accPath([s * 3.4, headY - 9.5, s * 6.2, headY - 16, s * 7.6, headY - 8.2]); accFill(c); } }
    else if (H.style === 'big') {
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 4, headY - 9.5);
        ctx.quadraticCurveTo(s * 9, headY - 14, s * 13.5, headY - 20);
        ctx.quadraticCurveTo(s * 11, headY - 11, s * 9, headY - 6.5); ctx.closePath(); accFill(c);
      }
    } else if (H.style === 'bolt') { for (const s of [-1, 1]) { accPath([s * 4, headY - 9.5, s * 7.5, headY - 14, s * 6, headY - 14.5, s * 9.5, headY - 20, s * 7.5, headY - 13, s * 9, headY - 12.5, s * 8, headY - 7.5]); accFill(c); } }
    else if (H.style === 'antler') {
      ctx.strokeStyle = c; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 4.5, headY - 9); ctx.lineTo(s * 8, headY - 17); ctx.lineTo(s * 7, headY - 21);
        ctx.moveTo(s * 7, headY - 14); ctx.lineTo(s * 11.5, headY - 16.5); ctx.stroke();
        ctx.fillStyle = H.leaf; ctx.beginPath(); ctx.ellipse(s * 12, headY - 18, 2.6, 1.3, s * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    } else if (H.style === 'crown') {
      ctx.beginPath(); ctx.moveTo(-8, headY - 7.5);
      const xs = [-8, -5.5, -3, 0, 3, 5.5, 8], hs = [0, 6, 2, 9, 2, 6, 0];
      for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], headY - 8.5 - hs[i]);
      ctx.lineTo(8, headY - 6.5); ctx.quadraticCurveTo(0, headY - 9.5, -8, headY - 6.5); ctx.closePath();
      accFill(c);
      ctx.fillStyle = '#ff3a3a'; ctx.beginPath(); ctx.arc(0, headY - 10.5, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (H.style === 'dragon') {
      for (const s of [0, 1]) {
        const ox = s * -3;
        ctx.beginPath(); ctx.moveTo(3 + ox, headY - 9.5);
        ctx.quadraticCurveTo(-4 + ox, headY - 15, -13 + ox, headY - 17.5);
        ctx.quadraticCurveTo(-6 + ox, headY - 11, -2 + ox, headY - 8); ctx.closePath();
        accFill(s ? shadeHex(c, -0.2) : c);
      }
    }
  }
  const E = A.ears;
  if (E) {
    if (E.style === 'fox') {
      for (const s of [-1, 1]) {
        accPath([s * 3, headY - 9.5, s * 8.5, headY - 19, s * 10, headY - 6.5]); accFill(E.col);
        accPath([s * 4.8, headY - 10, s * 8.2, headY - 16, s * 8.8, headY - 8.5]); accFill(E.inner, false);
      }
    } else if (E.style === 'panda') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 8, headY - 8.5, 4, 0, Math.PI * 2); accFill(E.col); }
    }
  }
  const T = A.hat;
  if (T) {
    if (T.style === 'kasa') {
      ctx.beginPath(); ctx.moveTo(-18, headY - 3.5); ctx.lineTo(0, headY - 15.5); ctx.lineTo(18, headY - 3.5);
      ctx.quadraticCurveTo(0, headY - 6, -18, headY - 3.5); ctx.closePath(); accFill(T.col);
      ctx.strokeStyle = shadeHex(T.col, -0.3); ctx.lineWidth = 0.7;
      ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(0, headY - 15); ctx.lineTo(i * 5.5, headY - 4.6 - Math.abs(i) * 0.1); } ctx.stroke();
    } else if (T.style === 'tricorn') {
      ctx.beginPath(); ctx.moveTo(-15, headY - 5);
      ctx.quadraticCurveTo(-9, headY - 18, 0, headY - 15); ctx.quadraticCurveTo(9, headY - 18, 15, headY - 5);
      ctx.quadraticCurveTo(0, headY - 9.5, -15, headY - 5); ctx.closePath(); accFill(T.col);
      ctx.strokeStyle = T.trim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-14, headY - 5.6); ctx.quadraticCurveTo(0, headY - 10, 14, headY - 5.6); ctx.stroke();
      ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(1, headY - 12, 1.7, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (A.antenna) {
    ctx.strokeStyle = A.antenna.col; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1, headY - 11); ctx.lineTo(3, headY - 19); ctx.stroke();
    const on = (frame >> 4) % 2 === 0;
    if (on && FX.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(3, headY - 19.5, 6, A.antenna.tip, 0.8); ctx.restore(); }
    ctx.fillStyle = on ? A.antenna.tip : shadeHex(A.antenna.tip, -0.5);
    ctx.beginPath(); ctx.arc(3, headY - 19.5, 1.7, 0, Math.PI * 2); ctx.fill();
  }
  if (A.bolts) {
    ctx.fillStyle = A.bolts;
    ctx.beginPath(); ctx.arc(-hr + 1.2, headY + 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = skin.out; ctx.lineWidth = 0.8; ctx.stroke();
  }
  if (va > 0.2) {
    if (A.blind) {
      roundRect(visorX - 9.2 * vw, headY - 1.3, 18.4 * vw, 5.6, 2);
      accFill(A.blind);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(visorX - 8 * vw, headY + 1.5); ctx.lineTo(visorX + 8 * vw, headY + 1.5); ctx.stroke();
    }
    if (A.patch) {
      ctx.strokeStyle = A.patch; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-hr + 1, headY - 4); ctx.lineTo(visorX + 6 * vw, headY + 4.5); ctx.stroke();
      ctx.fillStyle = A.patch; ctx.beginPath(); ctx.ellipse(visorX + 3.2 * vw, headY + 2.2, 2.8 * Math.max(0.5, vw), 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (A.crest && A.crest.style === 'visorline') {
      ctx.strokeStyle = A.crest.col; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(visorX - 7 * vw, headY + 5.6); ctx.lineTo(visorX + 7 * vw, headY + 5.6); ctx.stroke();
    }
    if (A.eyeGlow && FX.glow && !A.blind) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const a = 0.55 * va * (0.85 + 0.15 * Math.sin(frame * 0.15));
      drawGlow(visorX - 3 * vw, headY + 2.2, 5.5, A.eyeGlow, a);
      if (!A.patch) drawGlow(visorX + 3.2 * vw, headY + 2.2, 5.5, A.eyeGlow, a);
      ctx.restore();
    }
    if (A.whiskers) {
      ctx.strokeStyle = A.whiskers; ctx.lineWidth = 1; ctx.lineCap = 'round';
      const w = Math.sin(frame * 0.1) * 1.5;
      ctx.beginPath();
      ctx.moveTo(visorX + 6 * vw, headY + 4.5); ctx.quadraticCurveTo(visorX + 12, headY + 7, visorX + 13, headY + 12 + w);
      ctx.moveTo(visorX - 6 * vw, headY + 4.5); ctx.quadraticCurveTo(visorX - 11, headY + 7, visorX - 12, headY + 12 - w);
      ctx.stroke();
    }
  }
}

// Cosmetic trail while moving fast (a few small particles; budget shared with FX.maxParticles)
function skinTrail() {
  const T = skin.trail;
  if (!T || !FX.particles || !ninja || ninja.dead || state !== 'playing') return;
  if (frame % 3 !== 0 || particles.length > FX.maxParticles - 40) return;
  const sp = Math.abs(ninja.vx) + Math.abs(ninja.vy);
  if (sp < 3.5) return;
  const p = { x: ninja.x + (Math.random() - 0.5) * 10, y: ninja.y + 4 + (Math.random() - 0.5) * 10,
    vx: -ninja.vx * 0.08 + (Math.random() - 0.5) * 0.6, vy: -ninja.vy * 0.08 + (Math.random() - 0.5) * 0.6,
    life: 20 + Math.random() * 10, max: 30, color: T.color, size: 2 + Math.random() * 1.8 };
  if (T.kind === 'fire') { if (FX.glow) p.fire = true; else p.dust = true; p.size = 2.6 + Math.random() * 1.6; }
  else if (T.kind === 'spark') { p.spark = true; p.size = 1.3; p.vx *= 2; p.vy *= 2; }
  else if (T.kind === 'star') { p.star = true; p.size = 2.6 + Math.random() * 1.4; p.rot = Math.random() * 6; p.vr = 0.15; }
  else { p.dust = true; if (T.kind === 'smoke') { p.size = 3 + Math.random() * 2.5; p.life = 26; p.max = 26; } }
  particles.push(p);
}
// Soft cosmetic aura behind rare characters (one pre-rendered glow sprite)
function drawSkinAura(x, y) {
  if (!skin.aura || !FX.glow || (ninja && ninja.dead)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y + 2, 34, skin.aura, 0.32 + 0.08 * Math.sin(frame * 0.08));
  ctx.restore();
}
