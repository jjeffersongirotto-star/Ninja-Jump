// --- Background drawing (parallax layers) ---
// --- Background performance ---
// The background (sky, hills, mountains, trees, clouds) was the main cost of every frame: many big
// overlapping fills at full screen resolution. It is soft (gradients and large shapes), so it is now
// drawn into an offscreen canvas at a lower resolution (at most BG_MAX_DPR pixels per logical pixel,
// times the UI scale) and stretched over the screen in one copy: about a quarter of the pixels on
// high-density phones, visually the same.
// Space nebula: two full-screen radial gradients, painted ONCE into a cached layer (at full strength)
// and drawn with the fade-in alpha. Before, the cache was rebuilt ~20 times while space faded in
// (650-800 m), reallocating a screen-sized canvas each time: the stutter when entering space.
const BG_MAX_DPR = 1.25;
let bgCacheOff = false;
let bgCanvas = null, bgCtx = null;
let drawDpr = 1;   // pixels per logical pixel of the canvas being drawn right now (main or background)
let nebCache = null, nebKey = '';
function paintNebulaGrad(c, which) {
  if (which === 0) {
    const ng = c.createRadialGradient(W * 0.3, H * 0.3, 10, W * 0.3, H * 0.3, W * 0.7);
    ng.addColorStop(0, '#6b21a8');
    ng.addColorStop(0.5, '#1e1b4b');
    ng.addColorStop(1, 'transparent');
    c.fillStyle = ng;
  } else {
    const ng2 = c.createRadialGradient(W * 0.75, H * 0.55, 10, W * 0.75, H * 0.55, W * 0.5);
    ng2.addColorStop(0, '#9d174d');
    ng2.addColorStop(1, 'transparent');
    c.fillStyle = ng2;
  }
  c.fillRect(0, 0, W, H);
}
function paintNebula(c) { paintNebulaGrad(c, 0); paintNebulaGrad(c, 1); }
function nebulaLayer() {
  const key = W + 'x' + H + '@' + drawDpr;
  if (nebCache && nebKey === key) return nebCache;
  try {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(W * drawDpr);
    cv.height = Math.ceil(H * drawDpr);
    const c = cv.getContext('2d');
    if (!c) return null;
    c.setTransform(drawDpr, 0, 0, drawDpr, 0, 0);
    paintNebula(c);
    nebCache = cv; nebKey = key;
    return cv;
  } catch (e) { return null; }
}
let shakeX = 0, shakeY = 0;  // current screen-shake offset (set in render)

// Draw the background into the low-resolution layer, then stretch it over the frame
function renderBackground(meters) {
  const bgDpr = Math.min(dpr, BG_MAX_DPR * uiScale);
  if (bgCacheOff || bgDpr >= dpr - 0.01) { drawDpr = dpr; drawBackground(meters); return; }
  const bw = Math.ceil(W * bgDpr), bh = Math.ceil(H * bgDpr);
  try {
    if (!bgCanvas) { bgCanvas = document.createElement('canvas'); bgCtx = bgCanvas.getContext('2d'); }
    if (!bgCtx) throw new Error('no 2d context');
    if (bgCanvas.width !== bw || bgCanvas.height !== bh) { bgCanvas.width = bw; bgCanvas.height = bh; }
  } catch (e) { bgCacheOff = true; drawDpr = dpr; drawBackground(meters); return; }
  const main = ctx;
  ctx = bgCtx;
  drawDpr = bgDpr;
  try {
    bgCtx.setTransform(bgDpr, 0, 0, bgDpr, 0, 0);
    bgCtx.globalAlpha = 1;
    drawBackground(meters);
  } finally {
    ctx = main;
    drawDpr = dpr;
  }
  ctx.drawImage(bgCanvas, 0, 0, W, H);
}
function planetGradient(c, p, px, py) {
  const rg = c.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, p.r * 0.1, px, py, p.r);
  rg.addColorStop(0, '#fff');
  rg.addColorStop(0.3, p.color);
  rg.addColorStop(1, 'rgba(0,0,0,0.4)');
  return rg;
}
function planetSprite(p) {
  if (p.spr && p.sprDpr === drawDpr) return p.spr;
  try {
    const size = p.r * 2 + 4, cv = document.createElement('canvas');
    cv.width = Math.ceil(size * drawDpr); cv.height = Math.ceil(size * drawDpr);
    const c = cv.getContext('2d');
    if (!c) return null;
    c.scale(cv.width / size, cv.height / size);
    c.fillStyle = planetGradient(c, p, size / 2, size / 2);
    c.beginPath();
    c.arc(size / 2, size / 2, p.r, 0, Math.PI * 2);
    c.fill();
    p.spr = cv; p.sprDpr = drawDpr;
    return cv;
  } catch (e) { return null; }
}

function drawBackground(meters) {
  const at = atmosCache || atmosphereAt(meters);
  const cam = camera.y;

  // Sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, at.sky[0]);
  g.addColorStop(0.55, at.sky[1]);
  g.addColorStop(1, at.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Nebula tint (space)
  if (at.space > 0.05) {
    const neb = bgCacheOff ? null : nebulaLayer();
    ctx.globalAlpha = at.space * 0.35;
    if (neb) ctx.drawImage(neb, 0, 0, W, H);
    else paintNebula(ctx);
    ctx.globalAlpha = 1;
  }

  // Stars
  if (at.stars > 0.02) {
    const dens = Math.floor(30 + at.space * 50);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < dens; i++) {
      const sx = ((i * 97 + 13) * 1.7) % W;
      const sy = ((i * 53 + Math.floor(cam * 0.015) + i * 17) % H + H) % H;
      const tw = 0.4 + 0.6 * Math.sin(frame * 0.04 + i * 1.3);
      ctx.globalAlpha = at.stars * tw;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 7 === 0 ? 1.6 : 0.7) * (0.8 + at.space * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Planets (space)
  if (at.space > 0.15) {
    ctx.globalAlpha = at.space * 0.85;
    for (const p of planets) {
      const px = p.x * W;
      const py = p.y * H + Math.sin(frame * 0.01 + p.x) * 4;
      const spr = bgCacheOff ? null : planetSprite(p);
      if (spr) {
        ctx.drawImage(spr, px - p.r - 2, py - p.r - 2, p.r * 2 + 4, p.r * 2 + 4);
      } else {
        ctx.fillStyle = planetGradient(ctx, p, px, py);
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.ring) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(px, py, p.r * 1.6, p.r * 0.35, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Sun / moon
  const sunT = 1 - smoothstep(200, 450, meters);
  if (sunT > 0.05) {
    ctx.globalAlpha = sunT;
    const sx = W * 0.78, sy = H * 0.18;
    const sunCol = meters < 250 ? '#FFF3A0' : '#FF8C5A';
    const sg = ctx.createRadialGradient(sx, sy, 5, sx, sy, 50);
    sg.addColorStop(0, sunCol);
    sg.addColorStop(0.4, sunCol);
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sunCol;
    ctx.beginPath();
    ctx.arc(sx, sy, 18 + sunT * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (at.stars > 0.3 && at.space < 0.7) {
    // Moon
    ctx.globalAlpha = Math.min(1, at.stars);
    const mx = W * 0.8, my = H * 0.15;
    ctx.fillStyle = '#E8E8F0';
    ctx.beginPath();
    ctx.arc(mx, my, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = at.sky[0];
    ctx.beginPath();
    ctx.arc(mx + 6, my - 4, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Clouds (parallax by layer)
  if (at.clouds > 0.05) {
    ctx.globalAlpha = at.clouds * 0.55;
    for (const c of cloudLayer) {
      const parallax = 0.02 + c.layer * 0.04;
      const cy = c.y * H - cam * parallax;
      const cx = ((c.x + cam * parallax * 0.3) % (W * 2.2));
      if (meters < 300) drawCloud(cx, cy, c.s, 'rgba(255,255,255,0.9)', 'rgba(185,205,232,0.9)');
      else drawCloud(cx, cy, c.s, 'rgba(200,190,210,0.7)', 'rgba(140,125,165,0.7)');
    }
    ctx.globalAlpha = 1;
  }

  // Mountains (far parallax)
  if (at.hills > 0.05) {
    ctx.globalAlpha = at.hills;
    const mPar = 0.03;
    for (const m of mountains) {
      const mx = (m.x - cam * mPar * 0.5) % (W * 2.5);
      const baseY = H * 0.62 - cam * mPar;
      drawMountain(mx, baseY, m.w, m.h, m.peak, at.mountain);
    }
    ctx.globalAlpha = 1;
  }

  // Aerial haze at the horizon (depth)
  if (at.hills > 0.05) {
    const hzY = H * 0.62 - cam * 0.03;
    const hz = ctx.createLinearGradient(0, hzY - 80, 0, hzY + 20);
    hz.addColorStop(0, 'rgba(255,255,255,0)');
    hz.addColorStop(0.8, 'rgba(255,255,255,0.16)');
    hz.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = at.hills;
    ctx.fillStyle = hz;
    ctx.fillRect(0, hzY - 80, W, 100);
    ctx.globalAlpha = 1;
  }

  // Far hills (one vertical gradient per layer: lit tops, darker base)
  if (at.hills > 0.05) {
    ctx.globalAlpha = at.hills;
    // flat fills + a soft lit ridge band (cheap: no big gradient fills per frame)
    ctx.lineWidth = 4;
    ctx.strokeStyle = shadeHex(at.hillFar, 0.18);
    const p = 0.055;
    const hyF = H * 0.72 - cam * p;
    for (const h of hillsFar) {
      const hx = (h.x - cam * p * 0.4) % (W * 2.8);
      drawHill(hx, hyF, h.w, h.h, at.hillFar);
    }
    // Near hills
    const p2 = 0.09;
    const hyN = H * 0.82 - cam * p2;
    ctx.strokeStyle = shadeHex(at.hillNear, 0.18);
    for (const h of hillsNear) {
      const hx = (h.x - cam * p2 * 0.35) % (W * 3);
      drawHill(hx, hyN, h.w, h.h, at.hillNear);
    }
    ctx.globalAlpha = 1;
  }

  // Trees
  if (at.trees > 0.05) {
    ctx.globalAlpha = at.trees;
    const tp = 0.12;
    for (const t of trees) {
      const tx = ((t.x - cam * tp * 0.3) % (W * 3) + W * 3) % (W * 3) - W * 0.2;
      const ty = H * 0.78 + t.layer * H * 0.1 - cam * tp;
      if (ty > H + 20 || ty < H * 0.4) continue;
      drawTree(tx, ty, t.w, t.h, at.tree, at.treeTrunk);
    }
    ctx.globalAlpha = 1;
  }

  // Ground strip early game
  if (at.hills > 0.3) {
    ctx.globalAlpha = at.hills * 0.9;
    ctx.fillStyle = at.hillNear;
    const gy = H * 0.92 - cam * 0.15;
    if (gy < H) {
      const top = Math.max(gy, H * 0.85);
      ctx.fillRect(0, top, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(0, top, W, 2);
    }
    ctx.globalAlpha = 1;
  }
}

function cloudBlobs(x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
  ctx.arc(x + s * 0.55, y - s * 0.15, s * 0.45, 0, Math.PI * 2);
  ctx.arc(x - s * 0.5, y + s * 0.05, s * 0.4, 0, Math.PI * 2);
  ctx.arc(x + s * 0.15, y + s * 0.1, s * 0.5, 0, Math.PI * 2);
}
function drawCloud(x, y, s, col, shadeCol) {
  // shaded underside first, then the lit body a bit higher = volume
  if (shadeCol) {
    ctx.fillStyle = shadeCol;
    cloudBlobs(x, y + s * 0.12, s);
    ctx.fill();
  }
  ctx.fillStyle = col;
  cloudBlobs(x, y, s);
  ctx.fill();
}

function drawMountain(x, y, w, h, peak, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * peak, y - h);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  // Shaded right face (light from the left) for a faceted 3D look
  ctx.fillStyle = 'rgba(0,0,20,0.17)';
  ctx.beginPath();
  ctx.moveTo(x + w * peak, y - h);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w * peak + w * 0.1, y);
  ctx.closePath();
  ctx.fill();
  // Snow cap when cool
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x + w * peak, y - h);
  ctx.lineTo(x + w * peak - w * 0.08, y - h + h * 0.18);
  ctx.lineTo(x + w * peak + w * 0.08, y - h + h * 0.18);
  ctx.closePath();
  ctx.fill();
}

function drawHill(x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y + 40);
  ctx.quadraticCurveTo(x + w * 0.5, y - h, x + w, y + 40);
  ctx.lineTo(x + w, H + 20);
  ctx.lineTo(x, H + 20);
  ctx.closePath();
  ctx.fill();
  // lit ridge line
  ctx.beginPath();
  ctx.moveTo(x, y + 40);
  ctx.quadraticCurveTo(x + w * 0.5, y - h, x + w, y + 40);
  ctx.stroke();
}

function drawTree(x, y, w, h, foliage, trunk) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - w * 0.12, y - h * 0.3, w * 0.24, h * 0.35);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y - h * 0.3, w * 0.12, h * 0.35);
  ctx.fillStyle = foliage;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w * 0.55, y - h * 0.25);
  ctx.lineTo(x - w * 0.55, y - h * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.75);
  ctx.lineTo(x + w * 0.65, y - h * 0.05);
  ctx.lineTo(x - w * 0.65, y - h * 0.05);
  ctx.closePath();
  ctx.fill();
  // shaded right half of each tier (light from the left)
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w * 0.55, y - h * 0.25);
  ctx.lineTo(x, y - h * 0.25);
  ctx.closePath();
  ctx.moveTo(x, y - h * 0.75);
  ctx.lineTo(x + w * 0.65, y - h * 0.05);
  ctx.lineTo(x, y - h * 0.05);
  ctx.closePath();
  ctx.fill();
}
