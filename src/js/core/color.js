// --- Color helpers ---
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}
function rgbToHex(r, g, b) {
  const c = (n) => {
    const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return s.length < 2 ? '0' + s : s;
  };
  return '#' + c(r) + c(g) + c(b);
}
function lerp(a, b, t) { return a + (b - a) * t; }
// Lighten (amt > 0) or darken (amt < 0) a #rrggbb color; small bounded cache
let shadeCache = {}, shadeCacheSize = 0;
function shadeHex(hex, amt) {
  const key = hex + '|' + amt;
  const hit = shadeCache[key];
  if (hit) return hit;
  const c = hexToRgb(hex), t = amt < 0 ? 0 : 255, f = Math.abs(amt);
  const out = rgbToHex(c[0] + (t - c[0]) * f, c[1] + (t - c[1]) * f, c[2] + (t - c[2]) * f);
  if (++shadeCacheSize > 400) { shadeCache = {}; shadeCacheSize = 0; }
  shadeCache[key] = out;
  return out;
}
function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
