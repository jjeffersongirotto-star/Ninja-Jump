// --- Hand-built obstacle rooms + the spawner (pure: depends only on its rng, the meters and the width) ---
// The generator no longer drops loose random rows: it places short pre-designed ROOMS, each with a clear
// way through, separated by a calm breather (coins only). The breather before a room carries a short coin
// trail that ends at the room's entrance (hints the route) and, now and then, a power-up.
// Every room is checked with the hard gap rule at EVERY height (sliceCheck), counting each moving
// enemy's full area (sweep, wave, dive box, teleport area). Tuning: HAZARDS.rooms / HAZARDS.enemies.
//
// A room builder gets `c` = { rng, m, width, t, mir, step } and returns rows: [{ dm, items, coins }]
// (dm = meters above the room start; item/coin yOff in px relative to the row, down = +).
// `mir` mirrors the room left/right (use c.X(x) for x positions and c.S('left') for wall sides).

function roomCtx(rng, m, width) {
  const mir = rng() < 0.5;
  return {
    rng: rng, m: m, width: width, t: hzT(m), mir: mir,
    step: pairLerp(HAZARDS.rowSpacing, hzT(m)),
    X: function (x) { return mir ? width - x : x; },
    S: function (side) { return !mir ? side : (side === 'left' ? 'right' : (side === 'right' ? 'left' : side)); }
  };
}
function roomGap(c, k) { return Math.max(HAZARDS.rooms.minRowGap, c.step * k); }
function wallPlat(c, side, frac) {
  const w = Math.max(60, Math.min(c.width * frac, c.width - gapMinPx() - 30));
  return mkPlatform(side === 'left' ? w / 2 : c.width - w / 2, w, side);
}
function openCenter(c, plat) { // middle of the open part next to a wall platform
  return plat.attach === 'left' ? (plat.w + c.width) / 2 : (c.width - plat.w) / 2;
}
function coinLine(x, n, dx, yOff) { const o = []; for (let i = 0; i < n; i++) o.push({ x: x + (i - (n - 1) / 2) * dx, yOff: yOff || 0 }); return o; }

const ROOMS = [
  { id: 'ledges', name: 'Saliências', stage: 'platformLeft', diff: 1, weight: 1,
    build: function (c) { // 2-3 wall ledges (left wall only at first)
      const rows = [], n = c.rng() < 0.5 ? 2 : 3, gap = roomGap(c, 1);
      for (let i = 0; i < n; i++) {
        const side = c.m < HAZARDS.stages.platformAnySide ? 'left' : (c.rng() < 0.5 ? 'left' : 'right');
        const p = wallPlat(c, side, pairLerp(HAZARDS.platformWidth, c.t) + rr(c.rng, -0.04, 0.06));
        rows.push({ dm: i * gap, items: [p], coins: c.rng() < 0.6 ? [{ x: openCenter(c, p), yOff: 0 }] : [] });
      }
      return rows;
    } },
  { id: 'zigzag', name: 'Zigue-zague', stage: 'platformAnySide', diff: 1, weight: 1.2,
    build: function (c) { // corridor of wall platforms alternating sides
      const rows = [], n = 3 + (c.rng() < 0.4 + c.t * 0.4 ? 1 : 0), gap = roomGap(c, 0.9);
      for (let i = 0; i < n; i++) {
        const p = wallPlat(c, c.S(i % 2 ? 'right' : 'left'), rr(c.rng, 0.42, 0.52) + c.t * 0.06);
        rows.push({ dm: i * gap, items: [p], coins: [{ x: openCenter(c, p), yOff: 0 }] });
      }
      return rows;
    } },
  { id: 'staircase', name: 'Escadaria', stage: 'platformBoth', diff: 1, weight: 1,
    build: function (c) { // floating platforms climbing diagonally across the screen
      const rows = [], n = 4, gap = roomGap(c, 0.8);
      for (let i = 0; i < n; i++) {
        const w = rr(c.rng, 88, 115);
        const x = c.X(lerp(0.2, 0.8, i / (n - 1)) * c.width);
        rows.push({ dm: i * gap, items: [mkPlatform(Math.max(w / 2 + 8, Math.min(c.width - w / 2 - 8, x)), w, 'none')],
          coins: [{ x: x, yOff: -44 }] });
      }
      return rows;
    } },
  { id: 'funnel', name: 'Funil', stage: 'platformBoth', diff: 2, weight: 1,
    build: function (c) { // platforms on both walls, the gap narrows: short, precise elastics
      const rows = [], n = 3, gap = roomGap(c, 0.7), gmin = gapMinPx();
      let cx = c.width * rr(c.rng, 0.38, 0.62);
      for (let i = 0; i < n; i++) {
        const G = Math.min(c.width - 60, lerp(HAZARDS.bothGap[1], Math.max(gmin + 30, HAZARDS.bothGap[0]), i / (n - 1)));
        cx = Math.max(G / 2 + 30, Math.min(c.width - G / 2 - 30, cx + rr(c.rng, -30, 30)));
        const lw = cx - G / 2, rw = c.width - (cx + G / 2);
        rows.push({ dm: i * gap, items: [mkPlatform(lw / 2, lw, 'left'), mkPlatform(c.width - rw / 2, rw, 'right')],
          coins: [{ x: cx, yOff: 0 }, { x: cx, yOff: 34 }] });
      }
      return rows;
    } },
  { id: 'birdFlock', name: 'Revoada', stage: 'flyersBlue', diff: 1, weight: 1,
    build: function (c) { // blue birds on alternating sides (they fly in sine waves once they move)
      const rows = [], n = 3, gap = roomGap(c, 0.85);
      for (let i = 0; i < n; i++) {
        const f = mkFlyer(0, 'blue', flyerMove(c.rng, c.m, false), 0);
        const half = f.vw + f.range;
        f.x = Math.max(half + 6, Math.min(c.width - half - 6, c.X((i % 2 ? 0.7 : 0.3) * c.width + rr(c.rng, -20, 20))));
        rows.push({ dm: i * gap, items: [f], coins: [{ x: c.width - f.x, yOff: 0 }] });
      }
      return rows;
    } },
  { id: 'batLedge', name: 'Morcego na saliência', stage: 'flyersRed', diff: 2, weight: 1,
    build: function (c) { // a wall ledge on one side, a red bat guarding the other wall; then mirrored
      const rows = [], gap = roomGap(c, 1);
      for (let i = 0; i < 2; i++) {
        const side = c.S(i % 2 ? 'right' : 'left');
        const p = wallPlat(c, side, rr(c.rng, 0.3, 0.36));
        const f = mkFlyer(0, 'red', null, 0); // hovering guard (divers get their own room: batDive)
        const half = f.vw + 6;
        f.x = side === 'left' ? c.width - half : half;
        const open = side === 'left' ? [p.w, f.x - f.vw - (f.diveX || 0)] : [f.x + f.vw + (f.diveX || 0), c.width - p.w];
        rows.push({ dm: i * gap, items: [p, f], coins: [{ x: (open[0] + open[1]) / 2, yOff: 0 }] });
      }
      return rows;
    } },
  { id: 'spikeAlley', name: 'Corredor de espinhos', stage: 'spikes', diff: 2, weight: 0.9,
    build: function (c) { // spike bars hugging alternate walls, coins down the middle
      const rows = [], n = 3, gap = roomGap(c, 0.85);
      for (let i = 0; i < n; i++) {
        const w = rr(c.rng, 50, 66);
        const x = c.X(i % 2 ? c.width - 30 - w / 2 - rr(c.rng, 0, 26) : 30 + w / 2 + rr(c.rng, 0, 26));
        rows.push({ dm: i * gap, items: [mkSpikeBar(x, w)], coins: [{ x: c.width / 2 + (x < c.width / 2 ? 30 : -30), yOff: 0 }] });
      }
      return rows;
    } },
  { id: 'mineSlalom', name: 'Slalom de minas', stage: 'spikes', diff: 2, weight: 0.9,
    build: function (c) { // single mines alternating sides: weave between them
      const rows = [], n = 4, gap = roomGap(c, 0.8);
      for (let i = 0; i < n; i++) {
        const x = c.X((i % 2 ? 0.68 : 0.32) * c.width + rr(c.rng, -0.05, 0.05) * c.width);
        rows.push({ dm: i * gap, items: [mkSpikeMine(x, 0)], coins: [{ x: c.width - x, yOff: 0 }] });
      }
      return rows;
    } },
  { id: 'flyerGate', name: 'Portão de voadores', stage: 'movingFlyers', diff: 2, weight: 1,
    build: function (c) { // two flyers guard the sides of each row, the gate is in the middle
      const rows = [], gap = roomGap(c, 1.05), gmin = gapMinPx();
      for (let i = 0; i < 2; i++) {
        const mv = flyerMove(c.rng, c.m, true);
        const maxR = Math.max(0, (c.width - 2 * (8 + 2 * 24) - gmin - 24) / 4);
        const r = Math.min(mv ? mv.range : 0, maxR);
        const colors = c.t > 0.45 && c.rng() < 0.5 ? (c.rng() < 0.5 ? ['red', 'blue'] : ['blue', 'red']) : ['blue', 'blue'];
        const a = mkFlyer(0, colors[0], r >= 12 ? { range: r, speed: mv.speed } : null, 0);
        const b = mkFlyer(0, colors[1], r >= 12 ? { range: r, speed: mv.speed } : null, 0);
        a.x = 8 + a.vw + a.range; b.x = c.width - 8 - b.vw - b.range;
        a.phase0 = 0; b.phase0 = Math.PI; // opposite phases: they close in and open up together
        rows.push({ dm: i * gap, items: [a, b], coins: coinLine(c.width / 2, 3, 22, 0) });
      }
      return rows;
    } },
  { id: 'batDive', name: 'Mergulho do morcego', stage: 'divingBats', diff: 3, weight: 0.9,
    build: function (c) { // ledges on alternate walls with a diving red bat on the other side in between
      const gap = roomGap(c, 1.1);
      const p1 = wallPlat(c, c.S('left'), rr(c.rng, 0.32, 0.4));
      const bat = mkDiver(0, 0);
      bat.x = c.X(c.width - (bat.vw + bat.diveX + 8));
      const p2 = wallPlat(c, c.S('left'), rr(c.rng, 0.3, 0.36));
      return [
        { dm: 0, items: [p1], coins: [{ x: openCenter(c, p1), yOff: 0 }] },
        { dm: gap, items: [bat], coins: [{ x: c.X(c.width * 0.22), yOff: 0 }] },
        { dm: gap * 2, items: [p2], coins: [{ x: openCenter(c, p2), yOff: 0 }] }
      ];
    } },
  { id: 'ufoPatrol', name: 'Patrulha alienígena', stage: 'aliens', diff: 2, weight: 1,
    build: function (c) { // teleporting UFO, a narrow two-wall gap, another UFO
      const rows = [], gap = roomGap(c, 1);
      for (let i = 0; i < 3; i++) {
        if (i === 1) {
          const G = rr(c.rng, HAZARDS.bothGap[0] + 10, HAZARDS.bothGap[1]);
          const cx = rr(c.rng, G / 2 + 40, c.width - G / 2 - 40), lw = cx - G / 2, rw = c.width - (cx + G / 2);
          rows.push({ dm: i * gap, items: [mkPlatform(lw / 2, lw, 'left'), mkPlatform(c.width - rw / 2, rw, 'right')], coins: [{ x: cx, yOff: 0 }] });
        } else {
          const u = mkUfo(0, pickColor(c.rng, c.m, c.t), rr(c.rng, 40, 80), rr(c.rng, 8, 14), 1);
          u.x = c.X(rr(c.rng, u.vw + u.range + 6, c.width * 0.62));
          rows.push({ dm: i * gap, items: [u], coins: [{ x: u.x > c.width / 2 ? 50 : c.width - 50, yOff: 0 }] });
        }
      }
      return rows;
    } },
  { id: 'mixedTower', name: 'Torre mista', stage: 'aliens', diff: 2, weight: 0.8,
    build: function (c) { // wall ledge + an enemy or mine in the open part, three times
      const rows = [], gap = roomGap(c, 1);
      for (let i = 0; i < 3; i++) rows.push({ dm: i * gap, items: buildRow('combo', c.rng, c.m, c.width, null), coins: [] });
      for (const r of rows) r.coins = gapCoins(c.rng, r.items, c.width, gap / METERS_PER_PX);
      return rows;
    } },
  { id: 'sawRail', name: 'Trilho de serras', stage: 'saws', diff: 3, weight: 0.9,
    build: function (c) { // a ledge on one wall, a saw sliding near the other wall; mirrored above
      const rows = [], gap = roomGap(c, 1.05), gmin = gapMinPx();
      for (let i = 0; i < 2; i++) {
        const side = c.S(i % 2 ? 'right' : 'left');
        const p = wallPlat(c, side, rr(c.rng, 0.26, 0.32));
        const mv = flyerMove(c.rng, Math.max(c.m, HAZARDS.stages.movingFlyers), true);
        const maxR = Math.max(0, (c.width - 8 - 2 * 20 - p.w - gmin - 8) / 2);
        const s = mkSaw(0, { range: Math.min(mv.range, maxR), speed: mv.speed });
        s.x = side === 'left' ? c.width - 8 - s.vw - s.range : 8 + s.vw + s.range;
        const open = side === 'left' ? [p.w, s.x - s.vw - s.range] : [s.x + s.vw + s.range, c.width - p.w];
        rows.push({ dm: i * gap, items: [p, s], coins: [{ x: (open[0] + open[1]) / 2, yOff: 0 }] });
      }
      return rows;
    } },
  { id: 'slidingSteps', name: 'Plataformas deslizantes', stage: 'saws', diff: 2, weight: 0.9,
    build: function (c) { // three sliding platforms on alternating sides, coins riding on them
      const rows = [], gap = roomGap(c, 0.9);
      for (let i = 0; i < 3; i++) {
        const w = rr(c.rng, 70, 100), range = rr(c.rng, 30, 60);
        const x = c.X((i % 2 ? 0.7 : 0.3) * c.width);
        const cx = Math.max(w / 2 + range + 6, Math.min(c.width - w / 2 - range - 6, x));
        rows.push({ dm: i * gap, items: [mkPlatform(cx, w, 'none', { range: range, speed: rr(c.rng, 0.5, 1.0) })],
          coins: [{ x: c.width - cx, yOff: 0 }] });
      }
      return rows;
    } }
];

// "Classic" room: 2-3 loose random rows (the old generator), so every hazard type keeps mixing in
function classicRoom(c) {
  const rows = [], n = 2 + (c.rng() < 0.5 ? 1 : 0);
  let dm = 0;
  for (let i = 0; i < n; i++) {
    const type = pickWeighted(c.rng, rowWeights(c.m)) || 'platSingle';
    const items = buildRow(type, c.rng, c.m, c.width, null);
    const gap = c.step * rr(c.rng, 0.92, 1.2);
    rows.push({ dm: dm, items: items, coins: c.rng() < HAZARDS.coinChance ? gapCoins(c.rng, items, c.width, gap / METERS_PER_PX) : [] });
    dm += gap;
  }
  return rows;
}
// Introduction of a new stage: one row showing the new thing on its own
function introRoom(c, intro) {
  const items = buildRow(intro[1], c.rng, c.m, c.width, intro[2]);
  return [{ dm: 0, items: items, coins: gapCoins(c.rng, items, c.width, c.step / METERS_PER_PX) }];
}
function pickWeighted(rng, w) {
  let total = 0, k;
  for (k in w) total += w[k];
  if (total <= 0) return null;
  let r = rng() * total;
  for (k in w) { r -= w[k]; if (r <= 0) return k; }
  return k;
}
function roomAllowed(room, m) {
  return m >= HAZARDS.stages[room.stage] && hzT(m) >= HAZARDS.rooms.roomDiffAt[room.diff - 1];
}
function pickRoom(sp, m) {
  const R = HAZARDS.rooms, w = {};
  for (const room of ROOMS) {
    if (!roomAllowed(room, m) || sp.recent.indexOf(room.id) >= 0) continue;
    w[room.id] = room.weight * R.roomDiffWeight[room.diff - 1];
  }
  if (sp.recent[sp.recent.length - 1] !== 'classic') w.classic = R.classicWeight;
  return pickWeighted(sp.rng, w) || 'classic';
}
function roomById(id) { for (const r of ROOMS) if (r.id === id) return r; return null; }

// Build a room and make sure the gap rule holds at every height (retry, then thin it out)
function buildRoom(sp, id, m, width, intro) {
  let rows = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const c = roomCtx(sp.rng, m, width);
    rows = intro ? introRoom(c, intro) : (id === 'classic' ? classicRoom(c) : roomById(id).build(c));
    if (roomSlices(rows, width).ok) return rows;
  }
  for (let guard = 0; guard < 20 && !roomSlices(rows, width).ok; guard++) {
    let big = null; // never block the way: drop an item from the busiest row
    for (const r of rows) if (r.items.length && (!big || r.items.length > big.items.length)) big = r;
    if (!big) break;
    big.items.pop();
  }
  return rows;
}
function roomSlices(rows, width) {
  const list = [];
  for (const r of rows) for (const it of r.items) list.push({ item: it, y: -r.dm / METERS_PER_PX });
  return sliceCheck(list, width, 2);
}
// Coin trail in the breather that ends at the room's entrance (and the power-up spot)
function entranceX(rows, width) {
  const first = rows[0];
  if (!first || !first.items.length) return width / 2;
  const g = widestGap(first.items, width);
  return (g[0] + g[1]) / 2;
}

// A power-up spot (absolute world-relative y) must be outside every nearby hazard's full area + a margin
function powerSpotClear(list, x, y) {
  const mg = POWERUPS.pickupRadius + NINJA_R;
  for (const e of list) {
    const b = itemExtent(e.item, e.y);
    if (x > b.x0 - mg && x < b.x1 + mg && y > b.y0 - mg && y < b.y1 + mg) return false;
  }
  return true;
}
function createSpawner(rng) {
  return { rng: rng, m: 25, nextM: 25, queue: [], rows: 0, rooms: 0, intro: {}, recent: [],
    toPower: 2, lastPower: '', roomLog: [] };
}
// Next row (in meters order); returns { m, kind, items, coins, power?, room? } and keeps sp.m = next row's m
function spawnerNext(sp, width) {
  if (!sp.queue.length) planNext(sp, width);
  const row = sp.queue.shift();
  sp.m = sp.queue.length ? sp.queue[0].m : sp.nextM;
  return row;
}
function planNext(sp, width) {
  const rng = sp.rng, m = sp.nextM;
  if (m < HAZARDS.calmUntil) {
    sp.queue.push({ m: m, kind: 'calm', items: [], coins: rng() < 0.7 ? coinCluster(rng, width) : [] });
    sp.nextM = m + rr(rng, 16, 26);
    return;
  }
  // which room comes next (a stage's first appearance gets its own little intro room)
  let intro = null;
  for (const it of HZ_INTROS) {
    if (m >= HAZARDS.stages[it[0]] && !sp.intro[it[0]]) { sp.intro[it[0]] = true; intro = it; break; }
  }
  const id = intro ? 'intro:' + intro[0] : pickRoom(sp, m);
  // breather before every room except the first one (the calm opening already was one)
  const breath = sp.rooms > 0 ? pairLerp(HAZARDS.breather, hzT(m)) : 0;
  const start = m + breath;
  const rows = buildRoom(sp, intro ? null : id, start, width, intro);
  if (breath > 0) {
    const bpx = breath / METERS_PER_PX, ex = entranceX(rows, width);
    const row = { m: m, kind: 'breather', items: [], coins: [] };
    let powerAt = -1;
    if (--sp.toPower <= 0 && m >= POWERUPS.fromMeters) {
      const w = {};
      for (const k in POWERUPS.weights) if (k !== sp.lastPower) w[k] = POWERUPS.weights[k];
      const type = pickWeighted(rng, w);
      sp.lastPower = type;
      sp.toPower = Math.floor(rr(rng, POWERUPS.everyRooms[0], POWERUPS.everyRooms[1] + 0.999));
      powerAt = 2;
      row.power = { type: type, x: 0, yOff: 0 };
    }
    if (rng() < HAZARDS.rooms.hintCoins || powerAt >= 0) {
      // trail: from one side of the entrance, rising toward it
      const x0 = Math.max(40, Math.min(width - 40, ex + (rng() < 0.5 ? -1 : 1) * rr(rng, 50, 90)));
      const fr = [0.18, 0.32, 0.48, 0.64, 0.8];
      if (powerAt >= 0) { // the power-up takes a trail spot that is clear of every hazard's full area
        const near = (sp.lastRows || []).slice();
        for (const r of rows) for (const it of r.items) near.push({ item: it, y: -(start + r.dm) / METERS_PER_PX });
        const order = [2, 1, 3, 0, 4];
        powerAt = -1;
        for (const i of order) {
          const x = lerp(x0, ex, i / (fr.length - 1)), y = -m / METERS_PER_PX - bpx * fr[i];
          if (powerSpotClear(near, x, y)) { powerAt = i; break; }
        }
        if (powerAt < 0) { delete row.power; sp.toPower = 1; sp.lastPower = ''; } // try again at the next breather
      }
      for (let i = 0; i < fr.length; i++) {
        const x = lerp(x0, ex, i / (fr.length - 1)), yOff = -bpx * fr[i];
        if (i === powerAt) { row.power.x = x; row.power.yOff = yOff; } else row.coins.push({ x: x, yOff: yOff });
      }
    } else if (rng() < 0.6) row.coins = coinCluster(rng, width);
    sp.queue.push(row);
  }
  sp.lastRows = [];
  for (const r of rows) {
    for (const it of r.items) sp.lastRows.push({ item: it, y: -(start + r.dm) / METERS_PER_PX });
    sp.queue.push({ m: start + r.dm, kind: id, items: r.items, coins: r.coins, room: id });
    sp.rows++;
  }
  sp.rooms++;
  if (!intro) { sp.recent.push(id); while (sp.recent.length > HAZARDS.rooms.roomNoRepeat) sp.recent.shift(); }
  if (sp.roomLog.length < 400) sp.roomLog.push({ id: id, m: Math.round(start) });
  const last = rows[rows.length - 1];
  sp.nextM = start + (last ? last.dm : 0) + pairLerp(HAZARDS.rowSpacing, hzT(start)) * rr(rng, 0.92, 1.15);
}
