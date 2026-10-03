// --- Visual effects layer (purely cosmetic; tuning in config/fx.js) ---
// Performance rules followed here (Android Chrome / APK WebView):
// - no shadowBlur anywhere: glows are ONE pre-rendered radial sprite per colour, blitted with 'lighter'
// - the vignette, far skyline strips, galaxy band and stage texture tiles are drawn once into small
//   offscreen canvases (rebuilt only on resize / quality change) and then only copied each frame
// - wall/platform details are a handful of small shapes, only for what is on screen
function fxCanvas(w, h) {
  try {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
    const c = cv.getContext('2d');
    return c ? { cv, c } : null;
  } catch (e) { return null; }
}
// Small deterministic random (same textures and skylines every run)
function fxRng(seed) {
  let s = seed >>> 0;
  return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function fxHash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// ---- Glow sprites ----
// Colours that fade between stages (elastic, accent) are quantized to 16 levels per channel so the
// cache stays small; it is simply emptied if it ever grows past 96 sprites (64x64 each).
let glowCache = {};
let glowCount = 0;
function glowKey(col) {
  if (col.length !== 7 || col.charAt(0) !== '#') return col;
  const c = hexToRgb(col);
  return rgbToHex((c[0] >> 4) * 17, (c[1] >> 4) * 17, (c[2] >> 4) * 17);
}
function glowSprite(col) {
  let g = glowCache[col];
  if (g !== undefined) return g;
  const key = glowKey(col);
  g = glowCache[key];
  if (g !== undefined) { glowCache[col] = g; return g; }
  if (glowCount > 96) { glowCache = {}; glowCount = 0; }
  const S = 64, o = fxCanvas(S, S);
  g = null;
  if (o) {
    const c = o.c, rg = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    rg.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(0, 0, S, S);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = key; c.fillRect(0, 0, S, S);
    g = o.cv;
  }
  glowCache[key] = g; glowCache[col] = g; glowCount += 2;
  return g;
}
// Caller sets globalCompositeOperation = 'lighter' (batch several glows inside one save/restore)
function drawGlow(x, y, r, col, a, ry) {
  const spr = glowSprite(col);
  if (!spr || a <= 0.01) return;
  const h = ry || r;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(spr, x - r, y - h, r * 2, h * 2);
}

// ---- Vignette ----
// Four narrow edge gradients (left/right/top/bottom; the corners overlap = darker corners), filled
// straight into the low-res background layer. A full-screen radial pass cost ~1.5 ms in software
// rendering; these strips cover well under half the screen and reuse cached gradient objects.
let vigG = null, vigKey = '', vigCtx = null;
function drawVignette() {
  if (!FX.vignette || !W || !H || qualityLevel >= 1) return; // the first thing dropped on slow phones
  const sw = Math.round(W * 0.13), sh = Math.round(H * 0.1), a = FX.vignetteAlpha;
  const key = W + 'x' + H + ':' + a;
  if (vigKey !== key || vigCtx !== ctx) {
    vigKey = key; vigCtx = ctx;
    const mk = (x0, y0, x1, y1, k) => { const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(6,6,24,' + (a * k).toFixed(3) + ')'); g.addColorStop(0.45, 'rgba(6,6,24,' + (a * k * 0.3).toFixed(3) + ')'); g.addColorStop(1, 'rgba(6,6,24,0)'); return g; };
    vigG = [mk(0, 0, sw, 0, 0.75), mk(W, 0, W - sw, 0, 0.75), mk(0, 0, 0, sh, 0.65), mk(0, H, 0, H - sh, 0.85)];
  }
  ctx.fillStyle = vigG[0]; ctx.fillRect(0, 0, sw, H);
  ctx.fillStyle = vigG[1]; ctx.fillRect(W - sw, 0, sw, H);
  ctx.fillStyle = vigG[2]; ctx.fillRect(0, 0, W, sh);
  ctx.fillStyle = vigG[3]; ctx.fillRect(0, H - sh, W, sh);
}

// ---- Stage materials ----
// Returns the main material at this altitude and the next one with its blend weight (0 = none)
const fxMat = { a: 'stone', b: 'stone', t: 0 };
function materialAt(meters) {
  const M = FX.materials, bl = FX.blend;
  let i = 0;
  while (i < M.length - 1 && meters >= M[i + 1][0] - bl / 2) i++;
  const cur = M[i][1];
  let t = 0, prev = cur;
  if (i > 0) { t = 1 - smoothstep(M[i][0] - bl / 2, M[i][0] + bl / 2, meters); prev = M[i - 1][1]; }
  fxMat.a = cur; fxMat.b = prev; fxMat.t = t;
  return fxMat;
}
function materialName(meters) { const m = materialAt(meters); return m.t > 0.5 ? m.b : m.a; }

const TILE = 64;
const tileCache = {};
let tileDpr = 0;
// texture tile `name` (orient 'v' = rotated for walls), drawn once at the current screen density
function stageTile(name, orient) {
  const k = Math.min(3, Math.max(1, dpr || 1));
  if (tileDpr !== k) { for (const n in tileCache) delete tileCache[n]; tileDpr = k; }
  const key = name + (orient || '');
  if (tileCache[key] !== undefined) return tileCache[key];
  const o = fxCanvas(TILE * k, TILE * k);
  let res = null;
  if (o) {
    const c = o.c;
    c.scale(k, k);
    if (orient === 'v') { c.translate(TILE, 0); c.rotate(Math.PI / 2); }
    paintTile(c, name);
    try { res = { cv: o.cv, k: k, pat: ctx.createPattern(o.cv, 'repeat') }; } catch (e) { res = null; }
  }
  tileCache[key] = res;
  return res;
}
function paintTile(c, name) {
  const T = TILE, r = fxRng(name.length * 977 + name.charCodeAt(0) * 31);
  if (name === 'stone') {
    c.fillStyle = '#8c8f9c'; c.fillRect(0, 0, T, T);
    const rows = 4, bh = T / rows;
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * 16;
      for (let x = -32; x < T; x += 32) {
        const v = (r() - 0.5) * 0.22;
        c.fillStyle = shadeHex('#8c8f9c', v);
        c.fillRect(x + off + 1, y * bh + 1, 30, bh - 2);
        c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(x + off + 1, y * bh + 1, 30, 1.5);
        c.fillStyle = 'rgba(20,20,40,0.18)'; c.fillRect(x + off + 1, y * bh + bh - 3, 30, 2);
      }
    }
    c.fillStyle = 'rgba(30,30,50,0.35)';
    for (let y = 0; y <= rows; y++) c.fillRect(0, y * bh - 0.75, T, 1.5);
    for (let i = 0; i < 40; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; c.fillRect(r() * T, r() * T, 1.2, 1.2); }
    c.strokeStyle = 'rgba(25,25,45,0.45)'; c.lineWidth = 0.9;
    for (let i = 0; i < 2; i++) { // cracks
      let x = 8 + r() * 48, y = 4 + r() * 50;
      c.beginPath(); c.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 9; y += 2 + r() * 4; c.lineTo(x, y); }
      c.stroke();
    }
    c.fillStyle = 'rgba(90,150,60,0.35)'; // moss specks
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(r() * T, r() * T, 1 + r() * 2, 0, Math.PI * 2); c.fill(); }
  } else if (name === 'bamboo') {
    c.fillStyle = '#6d5a2c'; c.fillRect(0, 0, T, T);
    const n = 4, sh = T / n;
    for (let i = 0; i < n; i++) {
      const y = i * sh, g = c.createLinearGradient(0, y, 0, y + sh);
      const base = i % 2 ? '#c9a95a' : '#b7a04f';
      g.addColorStop(0, shadeHex(base, 0.35)); g.addColorStop(0.45, base); g.addColorStop(1, shadeHex(base, -0.35));
      c.fillStyle = g; c.fillRect(0, y + 0.6, T, sh - 1.2);
      const nx = (i * 23 + 9) % T; // nodes
      for (let x = nx - T; x < T * 2; x += 32) {
        c.fillStyle = 'rgba(60,40,10,0.55)'; c.fillRect(x, y + 0.6, 2, sh - 1.2);
        c.fillStyle = 'rgba(255,240,190,0.45)'; c.fillRect(x + 2, y + 0.6, 1, sh - 1.2);
      }
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let j = 0; j < 4; j++) c.fillRect(r() * T, y + 2 + r() * (sh - 4), 6 + r() * 10, 0.7);
    }
  } else if (name === 'ice') {
    const g = c.createLinearGradient(0, 0, T, T);
    g.addColorStop(0, '#d9f3ff'); g.addColorStop(0.5, '#a9d8f0'); g.addColorStop(1, '#c6e9fa');
    c.fillStyle = g; c.fillRect(0, 0, T, T);
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
    for (let i = -1; i < 3; i++) { c.beginPath(); c.moveTo(i * 32 - 8, T); c.lineTo(i * 32 + 40, 0); c.stroke(); }
    c.strokeStyle = 'rgba(70,130,180,0.4)'; c.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      let x = r() * T, y = r() * T;
      c.beginPath(); c.moveTo(x, y);
      for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 16; y += (r() - 0.5) * 16; c.lineTo(x, y); }
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) c.fillRect(r() * T, r() * T, 1.3, 1.3);
  } else { // metal
    c.fillStyle = '#69727f'; c.fillRect(0, 0, T, T);
    for (let y = 0; y < T; y += 2) { c.fillStyle = (y / 2) % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)'; c.fillRect(0, y, T, 1); }
    c.fillStyle = 'rgba(15,20,30,0.55)'; c.fillRect(0, 31, T, 1.5); c.fillRect(31, 0, 1.5, T);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 32.5, T, 1); c.fillRect(32.5, 0, 1, T);
    for (let y = 6; y < T; y += 32) for (let x = 6; x < T; x += 32) {
      for (const d of [[0, 0], [20, 0], [0, 20], [20, 20]]) {
        c.fillStyle = 'rgba(10,15,25,0.5)'; c.beginPath(); c.arc(x + d[0] + 0.5, y + d[1] + 0.6, 1.8, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#b8c2cf'; c.beginPath(); c.arc(x + d[0], y + d[1], 1.4, 0, Math.PI * 2); c.fill();
      }
    }
  }
}
// Fill the current path-builder `pathFn` with the tile pattern anchored at (ax, ay) (world-scrolled)
function fillTextured(name, orient, ax, ay, pathFn) {
  const t = stageTile(name, orient);
  if (!t || !t.pat) return false;
  ctx.save();
  // snap the pattern origin to whole device pixels so the tile is copied 1:1 (cheap, crisp)
  ctx.translate(Math.round(ax * t.k) / t.k, Math.round(ay * t.k) / t.k);
  ctx.scale(1 / t.k, 1 / t.k);
  ctx.fillStyle = t.pat;
  pathFn(t.k, ax, ay);
  ctx.fill();
  ctx.restore();
  return true;
}

// ---- Walls: the screen edges are the walls the ninja kicks off; now they show the stage material ----
// Each material's wall is pre-rendered once into a tall strip (wall width x screen height + one tile),
// so a frame only copies it (drawImage) at the scroll offset instead of filling with a pattern.
const wallStrips = {};
let wallKey = '';
function wallStrip(name) {
  const k = Math.min(3, Math.max(1, dpr || 1)), ww = FX.wallWidth;
  const key = W + 'x' + H + '@' + k + ':' + ww;
  if (wallKey !== key) { for (const n in wallStrips) delete wallStrips[n]; wallKey = key; }
  if (wallStrips[name] !== undefined) return wallStrips[name];
  const t = stageTile(name, 'v'), hh = H + TILE * 2;
  const o = t && t.pat ? fxCanvas(ww * k, hh * k) : null;
  let res = null;
  if (o) {
    o.c.fillStyle = o.c.createPattern(t.cv, 'repeat');
    o.c.fillRect(0, 0, o.cv.width, o.cv.height);
    res = { cv: o.cv, w: ww, h: hh };
  }
  wallStrips[name] = res;
  return res;
}
function drawWalls(meters) {
  if (!FX.textures) return;
  const ww = FX.wallWidth, cam = camera.y;
  const m = materialAt(meters);
  const off = -(((cam % TILE) + TILE) % TILE) - TILE; // scrolls with the world
  for (let pass = 0; pass < 2; pass++) {
    const name = pass === 0 ? m.a : m.b;
    if (pass === 1 && (m.t < 0.02 || m.b === m.a)) break;
    const st = wallStrip(name);
    if (!st) continue;
    ctx.globalAlpha = pass === 0 ? 1 : m.t;
    ctx.drawImage(st.cv, 0, off, ww, st.h);
    ctx.drawImage(st.cv, W - ww, off, ww, st.h);
  }
  ctx.globalAlpha = 1;
  // inner edges: thin lit line + soft contact shadow on the play area
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(ww - 1, 0, 1, H); ctx.fillRect(W - ww, 0, 1, H);
  ctx.fillStyle = 'rgba(0,0,15,0.16)';
  ctx.fillRect(ww, 0, 3, H); ctx.fillRect(W - ww - 3, 0, 3, H);
  if (qualityLevel < 2) drawWallDetails(materialName(meters), ww, cam);
}
// World-anchored details along the walls (deterministic per 160 px of height)
function drawWallDetails(name, ww, cam) {
  const step = 160, first = Math.floor(cam / step) - 1, last = Math.floor((cam + H) / step) + 1;
  for (let k = first; k <= last; k++) {
    const h = fxHash(k), side = h < 0.5 ? 0 : 1;
    const y = k * step + fxHash(k + 0.5) * 120 - cam;
    const x = side ? W - ww : ww, dir = side ? -1 : 1;
    if (name === 'stone') {
      if (h % 0.5 < 0.33) { // moss hanging over the edge
        ctx.fillStyle = '#5f9a3e';
        ctx.beginPath(); ctx.ellipse(x, y, 4, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#86c25a';
        ctx.beginPath(); ctx.ellipse(x + dir * 1, y - 2, 2.2, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x + dir * 1 - 0.5, y + 6, 1, 5);
      }
    } else if (name === 'bamboo') {
      if (k % 2 === 0) { // paper lantern on a bracket
        const lx = x + dir * 9, ly = y;
        if (FX.glow) { ctx.globalCompositeOperation = 'lighter'; drawGlow(lx, ly, 26, '#ff9a4a', 0.45 + 0.08 * Math.sin(frame * 0.07 + k)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, ly - 9); ctx.lineTo(lx, ly - 9); ctx.lineTo(lx, ly - 6); ctx.stroke();
        ctx.fillStyle = '#e8432f'; ctx.beginPath(); ctx.ellipse(lx, ly, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd27f'; ctx.fillRect(lx - 1.2, ly - 4, 2.4, 8);
        ctx.fillStyle = '#3a2a14'; ctx.fillRect(lx - 2.5, ly - 6.5, 5, 1.5); ctx.fillRect(lx - 2.5, ly + 5, 5, 1.5);
      } else { // leaf
        ctx.fillStyle = '#7fae3c';
        ctx.beginPath(); ctx.ellipse(x + dir * 5, y, 6, 1.8, dir * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (name === 'ice') { // icicles pointing in + frost glint
      ctx.fillStyle = 'rgba(225,248,255,0.9)';
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + dir * 7, y - 2); ctx.lineTo(x, y + 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + dir * 4, y + 6); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill();
      const tw = 0.5 + 0.5 * Math.sin(frame * 0.09 + k * 2.1);
      ctx.globalAlpha = tw; ctx.fillStyle = '#fff';
      ctx.fillRect(x + dir * 3 - 0.5, y + 14 - 3, 1, 6); ctx.fillRect(x + dir * 3 - 3, y + 14 - 0.5, 6, 1);
      ctx.globalAlpha = 1;
    } else { // metal: blinking status light
      const on = ((frame + k * 23) % 90) < 60;
      const col = k % 3 === 0 ? '#ff5a4a' : '#5aff9a';
      if (on && FX.glow) { ctx.globalCompositeOperation = 'lighter'; drawGlow(x + dir * 2, y, 12, col, 0.6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      ctx.fillStyle = '#2a313c'; ctx.fillRect(x + (side ? -4 : 0), y - 4, 4, 8);
      ctx.fillStyle = on ? col : shadeHex(col, -0.55);
      ctx.beginPath(); ctx.arc(x + dir * 2, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}
// Combo aura / rocket fire light the wall the ninja is close to
function drawWallLight() {
  if (!FX.glow || !ninja || ninja.dead) return;
  let col = null;
  if (ninja.combo && POWERUPS.combos && POWERUPS.combos[ninja.combo]) col = POWERUPS.combos[ninja.combo].color;
  else if (ninja.rocketT > 0) col = '#ff9a4a';
  if (!col || col.charAt(0) !== '#') return;
  const y = ninja.y - camera.y, reach = 150;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const dl = ninja.x, dr = W - ninja.x;
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.2);
  if (dl < reach) { const a = (1 - dl / reach) * pulse; drawGlow(0, y, 70, col, a * 0.75, 130); drawGlow(0, y, 14, '#ffffff', a * 0.5, 70); }
  if (dr < reach) { const a = (1 - dr / reach) * pulse; drawGlow(W, y, 70, col, a * 0.75, 130); drawGlow(W, y, 14, '#ffffff', a * 0.5, 70); }
  ctx.restore();
}

// ---- Platform texture + stage details (called from drawPlatform) ----
function platformTexture(hz, x, y, w, h, r) {
  if (!FX.textures) return false;
  const name = materialName(worldToMeters(hz.y));
  return fillTextured(name, '', x, y, function (k) { roundRect(0, 0, w * k, h * k, r * k); });
}
function platformDetails(hz, x, y, w, h) {
  if (!FX.textures) return;
  const name = materialName(worldToMeters(hz.y));
  const seed = Math.floor(Math.abs(hz.x * 7.3 + hz.y * 0.37));
  if (name === 'stone') { // moss tufts on top
    ctx.fillStyle = '#6aa844';
    for (let i = 0; i < 3; i++) {
      const tx = x + 8 + fxHash(seed + i) * (w - 16), tw = 4 + fxHash(seed + i + 9) * 5;
      ctx.beginPath(); ctx.ellipse(tx, y + 0.5, tw, 2.4, 0, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#4f8a32';
    const dx = x + 10 + fxHash(seed + 4) * (w - 20);
    ctx.fillRect(dx, y + 1, 1.2, 4 + fxHash(seed + 5) * 4);
  } else if (name === 'bamboo') { // rope lashings + a little lantern under it
    ctx.fillStyle = 'rgba(70,45,15,0.85)';
    ctx.fillRect(x + 7, y, 3, h); ctx.fillRect(x + w - 10, y, 3, h);
    if (seed % 3 === 0) {
      const lx = x + w * (0.3 + fxHash(seed) * 0.4), ly = y + h + 9;
      if (FX.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(lx, ly, 20, '#ff9a4a', 0.5); ctx.restore(); }
      ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, y + h); ctx.lineTo(lx, ly - 5); ctx.stroke();
      ctx.fillStyle = '#e8432f'; ctx.beginPath(); ctx.ellipse(lx, ly, 3.6, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd27f'; ctx.fillRect(lx - 0.8, ly - 3, 1.6, 6);
    }
  } else if (name === 'ice') { // icicles hanging below + snow on top
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 0.5, w / 2 - 4, 2.2, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(210,240,255,0.9)';
    for (let i = 0; i < 4; i++) {
      const ix = x + 8 + fxHash(seed + i * 3) * (w - 16), il = 4 + fxHash(seed + i * 5) * 7;
      ctx.beginPath(); ctx.moveTo(ix - 2.2, y + h); ctx.lineTo(ix, y + h + il); ctx.lineTo(ix + 2.2, y + h); ctx.closePath(); ctx.fill();
    }
  } else { // metal: running light strip
    const on = ((frame + seed) % 80) < 40;
    ctx.fillStyle = on ? '#7af0ff' : '#2b5560';
    ctx.fillRect(x + 6, y + h / 2 - 1, 4, 2); ctx.fillRect(x + w - 10, y + h / 2 - 1, 4, 2);
    if (on && FX.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(x + 8, y + h / 2, 9, '#7af0ff', 0.55); drawGlow(x + w - 8, y + h / 2, 9, '#7af0ff', 0.55); ctx.restore(); }
  }
}

// ---- Far parallax layers (drawn inside the low-res background) ----
let farCache = {}, farDpr = 0, farW = 0;
function farStrip(kind) {
  if (farDpr !== drawDpr || farW !== W) { farCache = {}; farDpr = drawDpr; farW = W; }
  if (farCache[kind] !== undefined) return farCache[kind];
  const sw = Math.ceil(W * 1.5), sh = kind === 'galaxy' ? Math.ceil(H * 0.6) : 200;
  const o = fxCanvas(sw * drawDpr, sh * drawDpr);
  let res = null;
  if (o) {
    const c = o.c; c.scale(drawDpr, drawDpr);
    const r = fxRng(kind.length * 131 + 7);
    if (kind === 'ridge') { // distant pale range (seamless: ends at the same height)
      const pts = []; const n = 14;
      for (let i = 0; i <= n; i++) pts.push(i === n ? pts[0] : 70 + r() * 90);
      c.fillStyle = '#d6e4f2';
      c.beginPath(); c.moveTo(0, sh);
      for (let i = 0; i <= n; i++) c.lineTo(sw * i / n, sh - pts[i]);
      c.lineTo(sw, sh); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; // snowy tops
      for (let i = 1; i < n; i++) if (pts[i] > pts[i - 1] && pts[i] > pts[i + 1] && pts[i] > 120) {
        const px = sw * i / n, py = sh - pts[i];
        c.beginPath(); c.moveTo(px, py); c.lineTo(px - 10, py + 12); c.lineTo(px + 9, py + 11); c.closePath(); c.fill();
      }
    } else if (kind === 'dusk' || kind === 'night') { // pagodas + city skyline
      const night = kind === 'night';
      const body = night ? '#0f1426' : '#3b2a52', win = night ? '#ffd774' : '#ff9e6a';
      let x = 0;
      while (x < sw) {
        const bw = 18 + r() * 34, bh = 50 + r() * 120, pag = r() < 0.28;
        const w2 = Math.min(bw, sw - x);
        c.fillStyle = body;
        if (pag) { // pagoda: stacked roofs
          const tiers = 3 + Math.floor(r() * 3), th = bh / tiers;
          for (let t = 0; t < tiers; t++) {
            const ty = sh - (t + 1) * th, inset = t * 3;
            c.fillRect(x + inset + 4, ty, w2 - inset * 2 - 8, th);
            c.beginPath(); c.moveTo(x + inset - 4, ty + 4); c.lineTo(x + w2 / 2, ty - 6); c.lineTo(x + w2 - inset + 4, ty + 4); c.closePath(); c.fill();
          }
          c.fillRect(x + w2 / 2 - 0.75, sh - bh - 16, 1.5, 12);
        } else {
          c.fillRect(x, sh - bh, w2, bh);
          if (r() < 0.3) c.fillRect(x + w2 * 0.6, sh - bh - 14, 1.5, 14); // antenna
          c.fillStyle = win; // windows
          for (let wy = sh - bh + 6; wy < sh - 6; wy += 9) for (let wx = x + 4; wx < x + w2 - 5; wx += 7) {
            if (r() < (night ? 0.38 : 0.12)) { c.globalAlpha = 0.55 + r() * 0.45; c.fillRect(wx, wy, 3, 4); }
          }
          c.globalAlpha = 1;
        }
        x += w2 + (r() < 0.3 ? 2 + r() * 8 : 0);
      }
    } else { // galaxy band: soft diagonal glow + dust of tiny stars
      c.save(); c.translate(sw / 2, sh / 2); c.rotate(-0.42); c.scale(1, 0.22);
      const rg = c.createRadialGradient(0, 0, 0, 0, 0, sw * 0.6);
      rg.addColorStop(0, 'rgba(255,240,255,0.55)'); rg.addColorStop(0.35, 'rgba(170,140,255,0.25)'); rg.addColorStop(1, 'rgba(80,60,160,0)');
      c.fillStyle = rg; c.fillRect(-sw, -sw, sw * 2, sw * 2);
      c.restore();
      for (let i = 0; i < 260; i++) {
        const t = (r() - 0.5) * sw * 1.1, d = (r() + r() + r() - 1.5) * 34;
        const px = sw / 2 + Math.cos(-0.42) * t - Math.sin(-0.42) * d, py = sh / 2 + Math.sin(-0.42) * t + Math.cos(-0.42) * d;
        c.fillStyle = r() < 0.2 ? 'rgba(200,190,255,0.9)' : 'rgba(255,255,255,0.75)';
        c.fillRect(px, py, r() < 0.1 ? 1.6 : 0.8, r() < 0.1 ? 1.6 : 0.8);
      }
    }
    res = { cv: o.cv, w: sw, h: sh };
  }
  farCache[kind] = res;
  return res;
}
function blitStrip(s, ox, y, a) {
  if (!s || a <= 0.02 || y > H || y + s.h < 0) return;
  ctx.globalAlpha = a;
  let x = -(((ox % s.w) + s.w) % s.w);
  for (; x < W; x += s.w) ctx.drawImage(s.cv, x, y, s.w, s.h);
  ctx.globalAlpha = 1;
}
// 'galaxy' = behind the planets, 'ridge' = behind the mountains (moves slower), 'mid' = skyline in front of
// the mountains/haze and behind the hills
function drawFarLayers(meters, at, layer) {
  if (!FX.parallax || bgCacheOff || qualityLevel >= 1) return; // dropped (with the vignette) on slow phones
  const cam = camera.y;
  if (layer === 'galaxy') {
    if (at.space > 0.05) blitStrip(farStrip('galaxy'), 0, H * 0.1 + ((meters - 700) * 0.04) % (H * 0.4), at.space * 0.75);
  } else if (layer === 'ridge') {
    if (at.hills > 0.05 && meters < 310) blitStrip(farStrip('ridge'), W * 0.3 - cam * 0.006, H * 0.62 - cam * 0.015 - 180, at.hills * 0.55 * (1 - smoothstep(170, 310, meters)));
  } else {
    const a = smoothstep(240, 310, meters) * (1 - smoothstep(640, 720, meters));
    if (a > 0.02) {
      const y = H - 190 + Math.max(0, meters - 330) * 0.25;
      const night = smoothstep(380, 460, meters);
      const ox = W * 0.2 - cam * 0.004;
      if (night < 0.98) blitStrip(farStrip('dusk'), ox, y, a * (1 - night));
      if (night > 0.02) blitStrip(farStrip('night'), ox, y, a * night);
    }
  }
}

// ---- Extra particles ----
function fxCap() {
  const over = particles.length - FX.maxParticles;
  if (over > 0) particles.splice(0, over);
}
function fxWallDust(side, y) {
  if (!FX.particles) return;
  const name = materialName(worldToMeters(y));
  const x = side < 0 ? FX.wallWidth : W - FX.wallWidth, dir = side < 0 ? 1 : -1;
  const col = name === 'stone' ? '#b3a68c' : name === 'bamboo' ? '#a9c25a' : name === 'ice' ? '#e3f7ff' : '#ffd27f';
  for (let i = 0; i < 11; i++) {
    const a = (Math.random() - 0.5) * 2.0;
    const s = 1.4 + Math.random() * 2.6;
    particles.push({ x, y: y + (Math.random() - 0.5) * 16, vx: dir * Math.cos(a) * s, vy: Math.sin(a) * s - 0.6,
      life: 20 + Math.random() * 14, max: 34, color: col, size: 2 + Math.random() * 2.8, dust: true,
      spark: name === 'metal' });
  }
  fxCap();
}
function fxSparks(x, y, col, n, speed) {
  if (!FX.particles) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.6 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 12 + Math.random() * 10, max: 22,
      color: col, size: 1.6, spark: true });
  }
  fxCap();
}
function fxCoinPickup(c) {
  if (!FX.particles) return;
  particles.push({ x: c.x, y: c.y, vx: 0, vy: -1.6, life: 24, max: 24, color: '#ffd700', size: c.r || 9, coin: true });
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    particles.push({ x: c.x + Math.cos(a) * 6, y: c.y + Math.sin(a) * 6, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 - 0.4,
      life: 18 + Math.random() * 8, max: 26, color: '#fff6a8', size: 3 + Math.random() * 1.5, star: true, rot: a, vr: 0.2 });
  }
  fxCap();
}

// Build every cached layer up front (after a resize / quality change) so nothing is generated in the
// middle of a run: texture tiles for all stages, far strips at the background resolution, glow sprites.
let fxWarmTimer = 0;
function fxWarmSoon() {
  if (fxWarmTimer) clearTimeout(fxWarmTimer);
  fxWarmTimer = setTimeout(function () {
    fxWarmTimer = 0;
    try {
      for (const m of FX.materials) { stageTile(m[1], ''); stageTile(m[1], 'v'); if (W && H) wallStrip(m[1]); }
      const keep = drawDpr;
      drawDpr = Math.min(dpr, BG_MAX_DPR * uiScale);
      if (FX.parallax) { farStrip('ridge'); farStrip('dusk'); farStrip('night'); farStrip('galaxy'); }
      drawDpr = keep;
      if (FX.glow) ['#ff9a4a', '#ff5a4a', '#5aff9a', '#7af0ff', '#ffd27f', '#ff7a3d', '#fff1c9', '#ff5a5a', '#3fc7f0', '#ffa53a'].forEach(glowSprite);
    } catch (e) {}
  }, 60);
}
