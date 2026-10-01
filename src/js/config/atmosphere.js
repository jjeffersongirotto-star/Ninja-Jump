// Atmosphere bands (continuous lerp)
// 0–150 day hills, 150–400 dusk/clouds, 400–700 night, 700+ space
const BANDS = [
  {
    at: 0,
    name: 'Colinas',
    sky: ['#5EC8F0', '#A8E6FF', '#C8F0D0'],
    elastic: '#ff4d7a',
    accent: '#ffd700',
    hillFar: '#6B9E6E',
    hillNear: '#4F8A55',
    mountain: '#7A9AAB',
    tree: '#2E6B3C',
    treeTrunk: '#5C3A21'
  },
  {
    at: 150,
    name: 'Montanhas',
    sky: ['#7EB6E8', '#B8D4F0', '#E8C4A8'],
    elastic: '#ff6b9d',
    accent: '#ffc857',
    hillFar: '#8BA89A',
    hillNear: '#6A9078',
    mountain: '#8A9BB0',
    tree: '#3A6B4A',
    treeTrunk: '#5C3A21'
  },
  {
    at: 280,
    name: 'Crepúsculo',
    sky: ['#FF7A4A', '#F0A878', '#5A4A7A'],
    elastic: '#ff8c5a',
    accent: '#ffb347',
    hillFar: '#6A5578',
    hillNear: '#4A3A5A',
    mountain: '#4A3A6A',
    tree: '#2A3A3A',
    treeTrunk: '#3A2A1A'
  },
  {
    at: 420,
    name: 'Noite',
    sky: ['#0D1B2A', '#1B2838', '#2C3E50'],
    elastic: '#a78bfa',
    accent: '#67e8f9',
    hillFar: '#1A2433',
    hillNear: '#121A24',
    mountain: '#1A2030',
    tree: '#0A1218',
    treeTrunk: '#1A1210'
  },
  {
    at: 700,
    name: 'Espaço',
    sky: ['#050510', '#0B0B2B', '#1A1040'],
    elastic: '#e879f9',
    accent: '#c4b5fd',
    hillFar: '#080818',
    hillNear: '#050510',
    mountain: '#0A0A20',
    tree: '#050510',
    treeTrunk: '#050510'
  },
  {
    at: 1000,
    name: 'Nebulosa',
    sky: ['#0A0518', '#1A0A3A', '#2E1050'],
    elastic: '#f472b6',
    accent: '#a5b4fc',
    hillFar: '#080818',
    hillNear: '#050510',
    mountain: '#0A0A20',
    tree: '#050510',
    treeTrunk: '#050510'
  }
];

function atmosphereAt(meters) {
  let i = 0;
  while (i < BANDS.length - 1 && meters >= BANDS[i + 1].at) i++;
  const a = BANDS[i];
  const b = BANDS[Math.min(i + 1, BANDS.length - 1)];
  if (a === b) {
    return {
      name: a.name, t: 0,
      sky: a.sky.slice(),
      elastic: a.elastic, accent: a.accent,
      hillFar: a.hillFar, hillNear: a.hillNear,
      mountain: a.mountain, tree: a.tree, treeTrunk: a.treeTrunk,
      stars: smoothstep(350, 500, meters),
      space: smoothstep(650, 800, meters),
      clouds: 1 - smoothstep(400, 600, meters),
      hills: 1 - smoothstep(350, 550, meters),
      trees: 1 - smoothstep(200, 400, meters)
    };
  }
  const t = smoothstep(a.at, b.at, meters);
  return {
    name: t < 0.5 ? a.name : b.name,
    t,
    sky: [
      lerpColor(a.sky[0], b.sky[0], t),
      lerpColor(a.sky[1], b.sky[1], t),
      lerpColor(a.sky[2], b.sky[2], t)
    ],
    elastic: lerpColor(a.elastic, b.elastic, t),
    accent: lerpColor(a.accent, b.accent, t),
    hillFar: lerpColor(a.hillFar, b.hillFar, t),
    hillNear: lerpColor(a.hillNear, b.hillNear, t),
    mountain: lerpColor(a.mountain, b.mountain, t),
    tree: lerpColor(a.tree, b.tree, t),
    treeTrunk: lerpColor(a.treeTrunk, b.treeTrunk, t),
    stars: smoothstep(350, 500, meters),
    space: smoothstep(650, 800, meters),
    clouds: Math.max(0, 1 - smoothstep(400, 600, meters)) * (0.4 + 0.6 * (1 - smoothstep(0, 150, meters) * 0.3)),
    hills: 1 - smoothstep(350, 550, meters),
    trees: 1 - smoothstep(200, 400, meters)
  };
}

// Physics tuning by height (hazard progression lives in HAZARDS below)
function difficultyAt(meters) {
  const early = smoothstep(0, 180, meters);
  const late = smoothstep(450, 800, meters);
  return {
    gravityScale: lerp(0.88, 1.0, early) + lerp(0, 0.08, late), // gentler early
    impulseBonus: lerp(1.12, 1.0, early) // slightly stronger bounce early (forgiving)
  };
}
