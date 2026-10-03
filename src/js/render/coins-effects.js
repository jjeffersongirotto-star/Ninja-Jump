// --- Coins, ground, floaters and particles ---
// Coin body is pre-rendered once per resize (gradient + emboss) and blitted each frame
let coinSprite = null;
function buildCoinSprite() {
  coinSprite = null;
  try {
    const r = 10, pad = 3, sc = Math.max(1, dpr) * 1.15;
    const logical = (r + pad) * 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(logical * sc);
    const g = cv.getContext('2d');
    if (!g) return;
    g.scale(sc, sc);
    g.translate(r + pad, r + pad);
    g.fillStyle = '#a8740a';                       // coin edge (thickness)
    g.beginPath(); g.arc(0, 1.6, r, 0, Math.PI * 2); g.fill();
    const fg = g.createRadialGradient(-3.5, -4, 1, 0, 0, r);
    fg.addColorStop(0, '#fff6b0');
    fg.addColorStop(0.45, '#ffd700');
    fg.addColorStop(1, '#d99a00');
    g.fillStyle = fg;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(160,110,0,0.55)';
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(0, 0, r * 0.72, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, r - 0.7, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
    g.font = 'bold 10px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillText('$', -0.5, 0.4);
    g.fillStyle = '#b07d0a';
    g.fillText('$', 0, 1);
    coinSprite = { cv, size: logical };
  } catch (e) { coinSprite = null; }
}

function drawCoin(c) {
  if (c.collected) return;
  const cam = camera.y;
  const x = c.x, y = c.y - cam;
  if (y < -30 || y > H + 30) return;
  const at = atmosCache || atmosphereAt(0);
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + Math.sin(c.sparkle) * 0.1;
  ctx.scale(pulse, pulse);
  ctx.fillStyle = at.accent;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, c.r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (coinSprite) {
    const s = coinSprite.size;
    ctx.drawImage(coinSprite.cv, -s / 2, -s / 2, s, s);
  } else {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffec80';
    ctx.beginPath();
    ctx.arc(-2, -2, c.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#daa520';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
  }
  // occasional glint
  const gl = Math.sin(c.sparkle * 0.5);
  if (gl > 0.9) {
    ctx.globalAlpha = (gl - 0.9) * 10;
    ctx.fillStyle = '#fff';
    drawStarShape(-4, -5, 3.2, 4, 0.35, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawStarShape(x, y, r, points, inner, rot) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = (i % 2 === 0) ? r : r * inner;
    const a = rot + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Playable ground at the start (world-attached, same palette as the near hills)
function drawGround() {
  const top = groundY - camera.y;
  if (top > H + 2) return;
  const at = atmosCache || atmosphereAt(0);
  const grass = at.hillNear;
  ctx.fillStyle = '#6a4a2f';
  ctx.fillRect(0, top + 12, W, H - top);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const x = (i * 83.3 + 17) % W, y = top + 26 + (i * 37) % 64;
    ctx.moveTo(x + 3, y);
    ctx.ellipse(x, y, 3, 1.8, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const x = (i * 131.7 + 51) % W, y = top + 22 + (i * 53) % 70;
    ctx.moveTo(x + 2, y);
    ctx.ellipse(x, y, 2, 1.2, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = grass;
  ctx.fillRect(0, top, W, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';          // shadow under the turf
  ctx.fillRect(0, top + 12, W, 4);
  ctx.fillStyle = shadeHex(grass, 0.1);        // grass tufts
  ctx.beginPath();
  for (let x = 4; x < W; x += 15) {
    ctx.moveTo(x, top + 1);
    ctx.lineTo(x + 3, top - 5 - (x % 4));
    ctx.lineTo(x + 6, top + 1);
  }
  ctx.fill();
  ctx.fillStyle = shadeHex(grass, 0.22);       // lit crest, like the hills
  ctx.fillRect(0, top, W, 3);
}

function drawFloaters() {
  const cam = camera.y;
  ctx.save();
  ctx.font = 'bold 16px system-ui, -apple-system, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  for (const f of floaters) {
    const a = Math.min(1, f.life / 20);
    ctx.globalAlpha = a;
    const y = f.y - cam;
    if (coinSprite && !f.noCoin) {
      const s = 16;
      ctx.drawImage(coinSprite.cv, f.x + 4, y - s / 2, s, s);
    }
    // with the coin icon: text ends just left of the coin (so '+10' doesn't run into it)
    const withCoin = !!(coinSprite && !f.noCoin);
    if (f.big) ctx.font = 'bold 20px system-ui, -apple-system, Roboto, sans-serif';
    ctx.textAlign = withCoin ? 'right' : 'center';
    const tx = withCoin ? f.x + 2 : f.x - 8;
    ctx.strokeStyle = f.noCoin ? 'rgba(10,15,40,0.75)' : 'rgba(60,40,0,0.7)';
    ctx.strokeText(f.text, tx, y);
    ctx.fillStyle = f.color || '#ffe066';
    ctx.fillText(f.text, tx, y);
    if (f.big) ctx.font = 'bold 16px system-ui, -apple-system, Roboto, sans-serif';
  }
  ctx.restore();
}

function drawParticles() {
  const cam = camera.y;
  let hasStars = false;
  for (const p of particles) {
    if (p.star) { hasStars = true; continue; }
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - cam, p.size * (0.55 + 0.45 * a), 0, Math.PI * 2);
    ctx.fill();
  }
  if (hasStars) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      if (!p.star) continue;
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = Math.min(1, a * 1.3);
      ctx.fillStyle = p.color;
      drawStarShape(p.x, p.y - cam, p.size * (0.6 + 0.4 * a), 5, 0.45, p.rot);
      ctx.fill();
    }
    ctx.restore();
  }
  // Shockwave rings (super jump)
  for (const r of rings) {
    ctx.globalAlpha = Math.max(0, r.life) * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1 + 4 * r.life;
    ctx.beginPath();
    ctx.arc(r.x, r.y - cam, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
