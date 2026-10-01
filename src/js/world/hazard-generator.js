// --- Hazard generator (pure: depends only on its rng, the meters and the screen width) ---
const HZ_INTROS = [ // first row of each stage is its "introduction"
  ['platformLeft', 'platSingle', { side: 'left' }],
  ['platformAnySide', 'platSingle', { side: 'right' }],
  ['platformBoth', 'platBoth', null],
  ['flyersBlue', 'flyers', { color: 'blue', count: 1 }],
  ['flyersRed', 'flyers', { color: 'red', count: 1 }],
  ['spikes', 'spikes', { variant: 'mine', count: 1 }],
  ['movingFlyers', 'flyers', { color: 'blue', count: 1, moving: true }],
  ['aliens', 'ufo', { color: 'blue' }],
  ['saws', 'saw', null]
];
function gapMinPx() { return HAZARDS.minGapNinjaWidths * NINJA_R * 2; }
function hzT(m) { return smoothstep(HAZARDS.stages.platformLeft, HAZARDS.stages.maxDifficulty, m); }
function hzMoveT(m) { return smoothstep(HAZARDS.stages.movingFlyers, HAZARDS.stages.maxDifficulty, m); }
function pairLerp(pair, t) { return pair[0] + (pair[1] - pair[0]) * t; }
function rr(rng, a, b) { return a + (b - a) * rng(); }
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Item factories. vw/vh = visual half-size (used for the gap rule); r/w/h/rx/ry = hit shape.
function mkPlatform(x, w, attach, slide) {
  const th = HAZARDS.platformThickness;
  return { type: 'platform', kind: 'platform', shape: 'rect', x: x, yOff: 0, w: w, h: th, vw: w / 2, vh: th / 2,
    attach: attach, range: slide ? slide.range : 0, speed: slide ? slide.speed : 0 };
}
function mkFlyer(x, color, move, yOff) {
  return { type: 'flyer', kind: color === 'red' ? 'redFlyer' : 'blueFlyer', color: color, shape: 'circle', x: x, yOff: yOff || 0,
    r: color === 'red' ? 11 : 13, vw: 24, vh: 17, bobAmp: 5, range: move ? move.range : 0, speed: move ? move.speed : 0 };
}
function mkSpikeMine(x, yOff) {
  return { type: 'spikeMine', kind: 'spikes', shape: 'circle', x: x, yOff: yOff || 0, r: 12, vw: 18, vh: 18, bobAmp: 0 };
}
function mkSpikeBar(x, w) {
  return { type: 'spikeBar', kind: 'spikes', shape: 'rect', x: x, yOff: 0, w: w - 6, h: 14, vw: w / 2, vh: 12 };
}
function mkSaw(x, move) {
  return { type: 'saw', kind: 'saw', shape: 'circle', x: x, yOff: 0, r: 14, vw: 20, vh: 20,
    range: move ? move.range : 0, speed: move ? move.speed : 0 };
}
function mkUfo(x, color, A, B, speed) {
  return { type: 'ufo', kind: color === 'red' ? 'redUfo' : 'blueUfo', color: color, shape: 'ellipse', x: x, yOff: 0,
    rx: color === 'red' ? 19 : 21, ry: 11, vw: 27, vh: 19, bobAmp: B, range: A, speed: speed };
}

function itemExtent(it) {
  const hw = it.vw + (it.range || 0);
  const hh = it.vh + (it.bobAmp || 0);
  return { x0: it.x - hw, x1: it.x + hw, y0: it.yOff - hh, y1: it.yOff + hh };
}
function freeGaps(items, width) {
  const iv = items.map(itemExtent).sort(function (p, q) { return p.x0 - q.x0; });
  const gaps = [];
  let cur = 0;
  for (const e of iv) {
    if (e.x0 > cur) gaps.push([cur, e.x0]);
    cur = Math.max(cur, e.x1);
  }
  if (width > cur) gaps.push([cur, width]);
  return gaps;
}
function widestGap(items, width) {
  let best = [0, 0];
  for (const g of freeGaps(items, width)) if (g[1] - g[0] > best[1] - best[0]) best = g;
  return best;
}
function rowIsPassable(items, width) {
  const g = widestGap(items, width);
  return g[1] - g[0] >= gapMinPx();
}
function placeX(rng, halfExt, width) { return rr(rng, halfExt + 6, width - halfExt - 6); }
function flyerMove(rng, m, force) {
  if (m < HAZARDS.stages.movingFlyers) return null;
  const t = hzMoveT(m);
  if (!force && rng() > pairLerp(HAZARDS.movingShare, t)) return null;
  return { range: pairLerp(HAZARDS.moveRange, t) * rr(rng, 0.65, 1), speed: pairLerp(HAZARDS.moveSpeed, t) * rr(rng, 0.8, 1.05) };
}
function pickColor(rng, m, t) {
  return m >= HAZARDS.stages.flyersRed && rng() < pairLerp(HAZARDS.redShare, t) ? 'red' : 'blue';
}

function makeRowItems(type, rng, m, width, opt) {
  const S = HAZARDS.stages, t = hzT(m), gmin = gapMinPx();
  const items = [];
  if (type === 'platSingle') {
    const side = opt.side || (m < S.platformAnySide ? 'left' : (rng() < 0.5 ? 'left' : 'right'));
    let w = width * (pairLerp(HAZARDS.platformWidth, t) + rr(rng, -0.04, 0.08));
    w = Math.min(w, width - gmin - 30);
    items.push(mkPlatform(side === 'left' ? w / 2 : width - w / 2, w, side));
  } else if (type === 'platBoth') {
    const G = Math.min(rr(rng, HAZARDS.bothGap[0], HAZARDS.bothGap[1]), width - 60);
    const cx = rr(rng, G / 2 + 30, width - G / 2 - 30);
    const lw = cx - G / 2, rw = width - (cx + G / 2);
    items.push(mkPlatform(lw / 2, lw, 'left'));
    items.push(mkPlatform(width - rw / 2, rw, 'right'));
  } else if (type === 'platMid') {
    const w = rr(rng, 80, 130);
    items.push(mkPlatform(rr(rng, w / 2 + 20, width - w / 2 - 20), w, 'none'));
  } else if (type === 'platSlide') {
    const w = rr(rng, 70, 110), range = rr(rng, 35, 75);
    items.push(mkPlatform(placeX(rng, w / 2 + range, width), w, 'none', { range: range, speed: rr(rng, 0.5, 1.0) }));
  } else if (type === 'flyers') {
    const count = opt.count || (m >= S.flyersRed + 120 && rng() < pairLerp(HAZARDS.twoFlyerChance, t) ? 2 : 1);
    for (let i = 0; i < count; i++) {
      const f = mkFlyer(0, opt.color || pickColor(rng, m, t), flyerMove(rng, m, opt.moving), count > 1 ? rr(rng, -12, 12) : 0);
      f.x = placeX(rng, f.vw + f.range, width);
      items.push(f);
    }
  } else if (type === 'spikes') {
    const variant = opt.variant || (rng() < 0.6 ? 'mine' : 'bar');
    if (variant === 'mine') {
      const count = opt.count || (rng() < 0.4 ? 2 : 1);
      for (let i = 0; i < count; i++) {
        const s = mkSpikeMine(0, count > 1 ? rr(rng, -10, 10) : 0);
        s.x = placeX(rng, s.vw, width);
        items.push(s);
      }
    } else {
      const w = rr(rng, 48, 72);
      items.push(mkSpikeBar(placeX(rng, w / 2, width), w));
    }
  } else if (type === 'saw') {
    const s = mkSaw(0, rng() < 0.5 ? flyerMove(rng, m, true) : null);
    s.x = placeX(rng, s.vw + s.range, width);
    items.push(s);
  } else if (type === 'ufo') {
    const A = rr(rng, HAZARDS.ufoRange[0], pairLerp(HAZARDS.ufoRange, smoothstep(S.aliens, S.maxDifficulty, m)));
    const u = mkUfo(0, opt.color || pickColor(rng, m, t), A, rr(rng, 8, 16), pairLerp(HAZARDS.moveSpeed, hzMoveT(m)) * rr(rng, 0.7, 1));
    u.x = placeX(rng, u.vw + u.range, width);
    items.push(u);
  } else if (type === 'combo') {
    // a wall platform plus a flyer or a spike in the open part of the row
    const side = rng() < 0.5 ? 'left' : 'right';
    const w = width * rr(rng, 0.24, 0.32);
    items.push(mkPlatform(side === 'left' ? w / 2 : width - w / 2, w, side));
    const o = rng() < 0.65 ? mkFlyer(0, pickColor(rng, m, t), flyerMove(rng, m, false), 0) : mkSpikeMine(0, 0);
    const half = o.vw + (o.range || 0);
    const lo = side === 'left' ? w : 0, hi = side === 'left' ? width : width - w;
    o.x = rr(rng, lo + half + 4, hi - half - 4);
    items.push(o);
  }
  return items;
}

function buildRow(type, rng, m, width, opt) {
  let items = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    items = makeRowItems(type, rng, m, width, opt || {});
    if (rowIsPassable(items, width)) return items;
  }
  while (items.length && !rowIsPassable(items, width)) items.pop(); // never block the way
  return items;
}

function rowWeights(m) {
  const S = HAZARDS.stages, w = {};
  if (m >= S.platformLeft) w.platSingle = 3;
  if (m >= S.platformBoth) { w.platSingle = 2; w.platBoth = 2.5; w.platMid = 1; }
  if (m >= S.flyersBlue) w.flyers = 3;
  if (m >= S.spikes) w.spikes = 2;
  if (m >= S.aliens) { w.ufo = 3; w.combo = 2; }
  if (m >= S.saws) { w.saw = 1.2; w.platSlide = 1.2; }
  return w;
}
function chooseRow(sp, m) {
  for (const it of HZ_INTROS) {
    if (m >= HAZARDS.stages[it[0]] && !sp.intro[it[0]]) { sp.intro[it[0]] = true; return { type: it[1], opt: it[2] }; }
  }
  const w = rowWeights(m);
  let total = 0, k;
  for (k in w) total += w[k];
  let r = sp.rng() * total;
  for (k in w) { r -= w[k]; if (r <= 0) return { type: k, opt: null }; }
  return { type: 'platSingle', opt: null };
}

function coinCluster(rng, width) {
  const n = 1 + Math.floor(rng() * 4), cx = rr(rng, 50, width - 50), out = [];
  for (let i = 0; i < n; i++) out.push({ x: cx + (i - n / 2) * 26, yOff: -i * 16 });
  return out;
}
function gapCoins(rng, items, width, stepPx) {
  const g = widestGap(items, width), gw = g[1] - g[0], cx = (g[0] + g[1]) / 2, out = [];
  if (rng() < 0.5 && gw >= 100) {
    for (let i = -1; i <= 1; i++) out.push({ x: cx + i * 24, yOff: 0 });            // a line through the gap
  } else {
    for (let i = 0; i < 3; i++) out.push({ x: cx, yOff: -stepPx * 0.5 + (i - 1) * 20 }); // column toward the next row
  }
  return out;
}

function createSpawner(rng) { return { rng: rng, m: 25, clusterLeft: 0, rows: 0, intro: {} }; }
// Next row at sp.m (meters); returns { m, kind, items, coins } and advances sp.m.
function spawnerNext(sp, width) {
  const rng = sp.rng, m = sp.m, t = hzT(m);
  const row = { m: m, kind: 'calm', items: [], coins: [] };
  if (m < HAZARDS.calmUntil) {
    if (rng() < 0.7) row.coins = coinCluster(rng, width);
    sp.m += rr(rng, 16, 26);
    return row;
  }
  if (sp.clusterLeft <= 0) {
    sp.clusterLeft = Math.floor(rr(rng, HAZARDS.clusterRows[0], HAZARDS.clusterRows[1] + 0.999));
    if (sp.rows > 0) {
      row.kind = 'breather';
      if (rng() < 0.8) row.coins = coinCluster(rng, width);
      sp.m += pairLerp(HAZARDS.breather, t);
      return row;
    }
  }
  const pick = chooseRow(sp, m);
  row.kind = pick.type;
  row.items = buildRow(pick.type, rng, m, width, pick.opt);
  sp.clusterLeft--;
  sp.rows++;
  const step = pairLerp(HAZARDS.rowSpacing, t) * rr(rng, 0.92, 1.2);
  if (rng() < HAZARDS.coinChance) row.coins = gapCoins(rng, row.items, width, step / METERS_PER_PX);
  sp.m += step;
  return row;
}
