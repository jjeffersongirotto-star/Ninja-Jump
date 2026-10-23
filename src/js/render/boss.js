// --- Boss drawing: a big grumpy monster; 3 hearts above it show the head hits left ---
function drawBoss() {
  const b = boss;
  if (!b) return;
  const sy = b.y - camera.y;
  if (sy < -120 || sy > H + 120) return;
  const R = b.r, k = b.dying > 0 ? b.dying / 50 : 1;
  ctx.save();
  ctx.translate(b.x, sy);
  if (b.dying > 0) { ctx.globalAlpha = k; ctx.rotate((1 - k) * 1.8); ctx.scale(1 + (1 - k) * 0.4, 1 + (1 - k) * 0.4); }
  const bob = Math.sin(b.t * 0.12) * 2;
  ctx.fillStyle = 'rgba(10,10,35,0.25)';
  ctx.beginPath(); ctx.ellipse(4, R * 0.95, R * 0.9, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) { // wings
    ctx.fillStyle = '#5a2a8a';
    ctx.beginPath(); ctx.moveTo(s * R * 0.7, -R * 0.1);
    ctx.quadraticCurveTo(s * R * 1.5, -R * 0.7 + Math.sin(b.t * 0.2) * 8, s * R * 1.35, R * 0.25);
    ctx.quadraticCurveTo(s * R * 1.0, R * 0.1, s * R * 0.7, R * 0.45); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a0c2a'; ctx.lineWidth = 2; ctx.stroke();
  }
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4 + bob, R * 0.1, 0, bob, R);
  g.addColorStop(0, b.flash > 0 ? '#ffffff' : '#ff8a8a'); g.addColorStop(0.55, b.flash > 0 ? '#ffd0d0' : '#d62839'); g.addColorStop(1, '#6a0d1c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, bob, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a0610'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff0b0'; // horns
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * R * 0.35, -R * 0.88 + bob); ctx.lineTo(s * R * 0.62, -R * 1.3 + bob); ctx.lineTo(s * R * 0.72, -R * 0.72 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#fff'; // angry eyes
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * R * 0.34, -R * 0.1 + bob, R * 0.2, R * 0.17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#1a0610';
  const lookX = Math.max(-1, Math.min(1, (ninja.x - b.x) / 120)) * R * 0.06;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * R * 0.34 + lookX, -R * 0.08 + bob, R * 0.08, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#1a0610'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * R * 0.58, -R * 0.42 + bob); ctx.lineTo(s * R * 0.12, -R * 0.25 + bob); ctx.stroke(); }
  ctx.fillStyle = '#2a0610'; // mouth with teeth
  ctx.beginPath(); ctx.ellipse(0, R * 0.42 + bob, R * 0.42, R * 0.2, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * R * 0.15 - 4, R * 0.42 + bob); ctx.lineTo(i * R * 0.15 + 4, R * 0.42 + bob); ctx.lineTo(i * R * 0.15, R * 0.54 + bob); ctx.fill(); }
  ctx.restore();
  if (b.dying > 0) return;
  for (let i = 0; i < BOSS.hp; i++) { // hearts
    const hx = b.x + (i - (BOSS.hp - 1) / 2) * 22, hy = sy - R - 30;
    ctx.fillStyle = i < b.hp ? '#ff3b55' : 'rgba(20,20,40,0.45)';
    ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.bezierCurveTo(hx - 12, hy - 4, hx - 6, hy - 12, hx, hy - 5);
    ctx.bezierCurveTo(hx + 6, hy - 12, hx + 12, hy - 4, hx, hy + 6); ctx.fill();
  }
}
