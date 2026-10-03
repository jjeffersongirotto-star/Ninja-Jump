// --- Elastic drawing ---
function elasticPath(x1, y1, x2, y2, cpx, cpy, curved) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (curved) ctx.quadraticCurveTo(cpx, cpy, x2, y2);
  else ctx.lineTo(x2, y2);
}

// Snapped elastic: two halves whip back from the break point to their pegs and fade out
function drawSnappedElastic(e) {
  const cam = camera.y;
  const col = (atmosCache || atmosphereAt(0)).elastic;
  const k = Math.min(1, e.snapT / HAZARDS.ghostPlatform.snapFrames);
  const ease = 1 - (1 - k) * (1 - k);
  const { nx, ny } = elasticUpNormal(e);
  const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2 - cam;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1 - smoothstep(0.45, 1, k);
  for (let i = 0; i < 2; i++) {
    const ax = i ? e.x2 : e.x1, ay = (i ? e.y2 : e.y1) - cam;
    const ex = lerp(mx, ax, ease), ey = lerp(my, ay, ease);
    const whip = Math.sin(k * Math.PI) * 12 * (i ? -1 : 1);
    const cx = (ax + ex) / 2 - nx * whip, cy = (ay + ey) / 2 - ny * whip;
    ctx.strokeStyle = shadeHex(col, -0.4);
    ctx.lineWidth = 5;
    elasticPath(ax, ay, ex, ey, cx, cy, true);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#e6eaf2';
    ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawElastic(e, isDrawing) {
  if (e.phase === 'snapped') { drawSnappedElastic(e); return; }
  const cam = camera.y;
  const at = atmosCache || atmosphereAt(0);
  const x1 = e.x1, y1 = e.y1 - cam;
  const x2 = e.x2, y2 = e.y2 - cam;
  const wob = (e.wobble || 0) * Math.sin(frame * 0.8) * 8;
  const col = at.elastic;
  const sag = e.sag || 0;
  const { nx, ny } = elasticUpNormal(e);
  const tHit = (e.hitT != null) ? e.hitT : 0.5;
  // Control point: along segment at contact, pushed down by sag (+ wobble)
  const cpx = x1 + (x2 - x1) * tHit - nx * sag + wob;
  const cpy = y1 + (y2 - y1) * tHit - ny * sag + wob * 0.5;
  const curved = sag > 0.4 || Math.abs(wob) > 0.4;
  // About to expire (unused for almost ELASTIC_LIFETIME): it thins out and flickers
  let th = 1, al = 1;
  if (!isDrawing && e.phase === 'ready' && !e.used && e.age > ELASTIC_LIFETIME - ELASTIC_WARN_FRAMES) {
    const k = Math.min(1, (e.age - (ELASTIC_LIFETIME - ELASTIC_WARN_FRAMES)) / ELASTIC_WARN_FRAMES);
    th = 1 - 0.4 * k;
    al = 1 - 0.5 * k * (0.5 + 0.5 * Math.sin(e.age * 1.3));
  }

  ctx.save();
  ctx.lineCap = 'round';
  if (FX.glow) { // wide additive light along the band + on the pegs (no shadowBlur)
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.14 * al;
    ctx.lineWidth = 22 * th;
    elasticPath(x1, y1, x2, y2, cpx, cpy, curved);
    ctx.stroke();
    drawGlow(x1, y1, 16, col, 0.5 * al);
    drawGlow(x2, y2, 16, col, 0.5 * al);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Soft glow
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.3 * al;
  ctx.lineWidth = 10 * th;
  elasticPath(x1, y1, x2, y2, cpx, cpy, curved);
  ctx.stroke();

  // Rubber tube: dark underside, body, specular line on the upper edge
  ctx.globalAlpha = al;
  ctx.strokeStyle = shadeHex(col, -0.4);
  ctx.lineWidth = 5 * th;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3.5 * th;
  ctx.stroke();
  const ox = nx * 1.1, oy = ny * 1.1;
  elasticPath(x1 + ox, y1 + oy, x2 + ox, y2 + oy, cpx + ox, cpy + oy, curved);
  ctx.strokeStyle = shadeHex(col, 0.6);
  ctx.globalAlpha = 0.85 * al;
  ctx.lineWidth = 1.2 * th;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Anchor pegs with a bit of depth
  for (let i = 0; i < 2; i++) {
    const px = i ? x2 : x1, py = i ? y2 : y1;
    ctx.fillStyle = 'rgba(15,15,35,0.45)';
    ctx.beginPath(); ctx.arc(px + 0.8, py + 1.2, 4.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6eaf2';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px - 1, py - 1, 2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}
