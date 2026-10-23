// --- Power-up drawing: items on the path, shield bubble, rocket flame, magnet aura, HUD timers ---
// Same 3D language as the rest (light from the top-left, soft shadow, rim highlight).
const POWER_COLORS = {
  magnet: ['#ffd0d0', '#ff5a5a', '#9c1622'],
  shield: ['#e2fbff', '#3fc7f0', '#135f8f'],
  rocket: ['#fff1cf', '#ffa53a', '#a8510c'],
  fire: ['#fff0b0', '#ff7a1f', '#a02a08']
};
// Badge with the icon, centered at (0,0) in a translated/scaled context; radius 15
function drawPowerBadge(type) {
  const c = POWER_COLORS[type];
  ctx.fillStyle = 'rgba(10,10,35,0.22)';
  ctx.beginPath(); ctx.ellipse(2, 4, 15, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hzGrad('pw-' + type, () => stops(ctx.createRadialGradient(-5, -6, 1, 0, 0, 16), [0, c[0], 0.55, c[1], 1, c[2]]));
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(15,15,40,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (type === 'magnet') {
    ctx.strokeStyle = '#3a0a10';                 // outline of the U
    ctx.lineWidth = 7.5;
    ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-6, 1); ctx.arc(0, 1, 6, Math.PI, 0, true); ctx.lineTo(6, -7); ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-6, 1); ctx.arc(0, 1, 6, Math.PI, 0, true); ctx.lineTo(6, -4); ctx.stroke();
    ctx.strokeStyle = '#e8323c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-6, -3.5); ctx.lineTo(-6, 1); ctx.arc(0, 1, 6, Math.PI, 0, true); ctx.lineTo(6, -3.5); ctx.stroke();
    ctx.fillStyle = '#dfe4ec';                   // silver tips
    ctx.fillRect(-8.5, -9, 5, 4.5);
    ctx.fillRect(3.5, -9, 5, 4.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -8.6, 2, 1.4);
    ctx.fillRect(4, -8.6, 2, 1.4);
  } else if (type === 'shield') {
    ctx.beginPath();                             // heater shield
    ctx.moveTo(0, -9.5); ctx.lineTo(8, -6.5); ctx.lineTo(7, 2);
    ctx.quadraticCurveTo(5, 7.5, 0, 10); ctx.quadraticCurveTo(-5, 7.5, -7, 2); ctx.lineTo(-8, -6.5); ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0d3e63';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#2aa7e0';
    ctx.beginPath();
    ctx.moveTo(0, -6.5); ctx.lineTo(5, -4.5); ctx.lineTo(4.4, 1.5); ctx.quadraticCurveTo(3, 5.3, 0, 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe14a';
    drawStarShape(0, 0, 3.6, 5, 0.45, 0);
    ctx.fill();
  } else if (type === 'fire') {
    ctx.fillStyle = '#ffffff';                   // flame
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(9, -2, 6, 5); ctx.quadraticCurveTo(0, 12, -6, 5); ctx.quadraticCurveTo(-8, -2, 0, -11); ctx.fill();
    ctx.fillStyle = '#ff7a1f';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(6, -1, 4, 5); ctx.quadraticCurveTo(0, 9, -4, 5); ctx.quadraticCurveTo(-5.5, -1, 0, -8); ctx.fill();
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(3, 2, 2, 5); ctx.quadraticCurveTo(0, 7, -2, 5); ctx.quadraticCurveTo(-3, 2, 0, -2); ctx.fill();
  } else {
    ctx.save();                                  // rocket, tilted up-right
    ctx.rotate(0.6);
    ctx.fillStyle = '#ffcf3f';                   // flame
    ctx.beginPath(); ctx.moveTo(-3, 7); ctx.quadraticCurveTo(0, 15, 3, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8323c';                   // fins
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-8, 8); ctx.lineTo(-3.5, 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(8, 8); ctx.lineTo(3.5, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';                   // body
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(6, -4, 4, 7); ctx.lineTo(-4, 7); ctx.quadraticCurveTo(-6, -4, 0, -11);
    ctx.fill();
    ctx.strokeStyle = '#5a2a10';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#e8323c';                   // nose
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(3.6, -7.5, 3.9, -5.5); ctx.lineTo(-3.9, -5.5); ctx.quadraticCurveTo(-3.6, -7.5, 0, -11); ctx.fill();
    ctx.fillStyle = '#2aa7e0';                   // window
    ctx.beginPath(); ctx.arc(0, -1, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';      // glossy highlight
  ctx.beginPath(); ctx.ellipse(-6, -8, 4.5, 2.2, -0.6, 0, Math.PI * 2); ctx.fill();
}
function drawPowerups() {
  const cam = camera.y;
  for (const p of powerups) {
    if (p.taken) continue;
    const y = p.y - cam + Math.sin(frame * 0.07 + p.bob) * 4;
    if (y < -40 || y > H + 40) continue;
    const c = POWER_COLORS[p.type];
    ctx.save();
    ctx.translate(p.x, y);
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12 + p.bob);
    if (FX.glow) { // soft light around the item (pre-rendered sprite)
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(0, 0, 40 + pulse * 5, c[1], 0.38 + 0.18 * pulse);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 0.25 + 0.2 * pulse;        // glow ring: "pick me up"
    ctx.fillStyle = c[1];
    ctx.beginPath(); ctx.arc(0, 0, 21 + pulse * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 19 + pulse * 2, frame * 0.05, frame * 0.05 + Math.PI * 1.2); ctx.stroke();
    drawPowerBadge(p.type);
    ctx.restore();
  }
}

// Combo aura: soft glow in the combo colour + rotating arc segments (triple: the three colours)
const COMBO_ARCS = { triple: ['#ff5a5a', '#3fc7f0', '#ffa53a'] };
function drawComboAura(x, y) {
  const id = ninja.combo, C = POWERUPS.combos[id];
  if (!C) return;
  const k = Math.min(1, (ninja.comboT || 0) / 10);
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.2);
  const R = NINJA_R + 16 + pulse * 2;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, NINJA_R * 0.6, x, y, R + 10);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, hexA(C.color, 0.22 * k));
  g.addColorStop(1, hexA(C.color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R + 10, 0, Math.PI * 2); ctx.fill();
  const cols = COMBO_ARCS[id] || [C.color, '#ffffff', C.color];
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = frame * 0.11 + i * Math.PI * 2 / 3;
    ctx.strokeStyle = hexA(cols[i], 0.85 * k);
    ctx.beginPath(); ctx.arc(x, y, R, a, a + 1.25); ctx.stroke();
  }
  // little sparks orbiting the other way
  ctx.fillStyle = hexA(C.color === '#ffffff' ? '#fff3a0' : C.color, 0.9 * k);
  for (let i = 0; i < 4; i++) {
    const a = -frame * 0.07 + i * Math.PI / 2;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * (R + 5), y + Math.sin(a) * (R + 5), 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
}

// Behind the ninja: combo aura, rocket flame + magnet aura
function drawNinjaFxBack(x, y) {
  drawSkinAura(x, y);
  if (ninja.combo && !ninja.dead) drawComboAura(x, y);
  if (ninja.rocketT > 0 && !ninja.dead) {
    // twin jet pack on his back: nozzles peek out on both sides, flames point down
    const ease = Math.min(1, ninja.rocketT / POWERUPS.rocket.easeFrames);
    ctx.save();
    ctx.translate(x, y);
    for (const sx of [-14, 14]) {
      const f = (0.75 + Math.random() * 0.35) * (0.45 + 0.55 * ease);
      const g = ctx.createLinearGradient(0, 6, 0, 6 + 46 * f);
      g.addColorStop(0, 'rgba(255,255,225,0.98)');
      g.addColorStop(0.35, 'rgba(255,185,60,0.9)');
      g.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx - 5, 6); ctx.quadraticCurveTo(sx, 6 + 52 * f, sx + 5, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9ced8';
      roundRect(sx - 4.5, -10, 9, 17, 3.5); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,45,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e8323c';
      roundRect(sx - 4.5, -12, 9, 5, 2.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(sx - 2.8, -6, 1.6, 10);
    }
    ctx.restore();
  }
  if (ninja.magnetT > 0 && !ninja.dead) {
    const left = ninja.magnetT / POWERUPS.magnet.frames;
    const blink = ninja.magnetT < 90 && (ninja.magnetT >> 3) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,110,110,0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        const k = ((frame * 0.02 + i * 0.5) % 1);
        ctx.globalAlpha = (1 - k) * (0.5 + 0.5 * left);
        ctx.beginPath(); ctx.arc(x, y, NINJA_R + 6 + k * 40 * magnetRadius() / POWERUPS.magnet.radius, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }
}
// In front of the ninja: shield bubble (and the short immunity flicker after it breaks)
function drawNinjaFxFront(x, y) {
  if (ninja.dead) return;
  if (ninja.superSpin && abilityValue('superBolts', false)) drawSuperBolts(x, y);
  if (ninja.shield) {
    const wob = Math.sin(frame * 0.15) * 1.2, pop = ninja.shieldPop || 0;
    const r = NINJA_R + 10 + wob + pop * 8;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.7, 'rgba(120,225,255,0.14)');
    g.addColorStop(1, 'rgba(90,205,255,0.42)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(170,240,255,0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r - 4, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
  } else if (ninja.invulnT > 0 && (ninja.invulnT >> 2) % 2 === 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(170,240,255,0.55)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, NINJA_R + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// HUD: small chips under the theme name (top-left) with the time left as a ring
let powerHudY = 0, powerHudCheck = -1;
function drawPowerHud() {
  if (!ninja || ninja.dead) return;
  const list = [];
  if (ninja.rocketT > 0) list.push(['rocket', Math.min(1, ninja.rocketT / timedPowerupFrames(POWERUPS.rocket.frames))]);
  if (ninja.magnetT > 0) list.push(['magnet', Math.min(1, ninja.magnetT / timedPowerupFrames(POWERUPS.magnet.frames))]);
  if (ninja.shield) list.push(['shield', -1]);
  if (ninja.fireElastic) list.push(['fire', -1]);
  if (!list.length) return;
  if (frame - powerHudCheck > 60 || !powerHudY) { // below the theme-name pill (follows the safe-area inset)
    powerHudCheck = frame;
    try {
      const r = themeName.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      powerHudY = r.height > 0 ? (r.bottom - cr.top) * (H / (cr.height || H)) + 22 : 62;
    } catch (e) { powerHudY = 62; }
  }
  let x = 32;
  for (const it of list) {
    ctx.save();
    ctx.translate(x, powerHudY);
    ctx.fillStyle = 'rgba(10,12,35,0.32)';
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
    if (it[1] >= 0) {
      const low = it[1] < 0.2 && (frame >> 3) % 2 === 0;
      ctx.strokeStyle = low ? '#ffffff' : POWER_COLORS[it[0]][1];
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * it[1]); ctx.stroke();
    } else {
      ctx.strokeStyle = POWER_COLORS.shield[1];
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.scale(0.8, 0.8);
    drawPowerBadge(it[0]);
    ctx.restore();
    x += 44;
  }
}

// Ninja do Trovão: crackling lightning bolts around him during the special (cosmetic, no Math.random)
function drawSuperBolts(x, y) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const n = 5, seed = Math.floor(frame / 3);
  for (let b = 0; b < n; b++) {
    const h = Math.sin((seed + 1) * 12.9898 + b * 78.233) * 43758.5453;
    const rnd = k => { const v = Math.sin(h + k * 19.19) * 1000; return v - Math.floor(v); };
    const a0 = (b / n) * Math.PI * 2 + frame * 0.07 + rnd(0) * 0.6;
    const r0 = NINJA_R + 4, r1 = NINJA_R + 22 + rnd(1) * 12;
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4, r = r0 + (r1 - r0) * t, a = a0 + (rnd(i + 2) - 0.5) * 0.5;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    for (const [w, col] of [[5, 'rgba(120,180,255,0.35)'], [2.2, '#fff6a8'], [1, '#ffffff']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.25 + 0.15 * Math.sin(frame * 0.6);
  ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, NINJA_R + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// Ninja Raposa: spinning four-point steel stars
function drawShurikens() {
  for (const s of shurikens) {
    ctx.save();
    ctx.translate(s.x, s.y - camera.y); ctx.rotate(s.rot);
    ctx.fillStyle = '#d9dee6'; ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 2.6 : 8, a = i * Math.PI / 4;
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(r, 0);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
