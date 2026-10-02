function update(dt) {
  frame++;
  if (state !== 'playing' || paused) return;
  if (drawing) syncDrawingWorld();

  const meters = worldToMeters(ninja.y);
  const diff = difficultyAt(meters);
  atmosCache = atmosphereAt(meters);

  if (bounceCooldown > 0) bounceCooldown--;
  if (stretch > 0) stretch *= 0.85;
  if (shake > 0) shake *= 0.88;

  const prevX = ninja.x, prevY = ninja.y;
  const onBand = elastic && elastic.phase === 'stretching';

  // Skip free integration while pinned to the trampoline so we cannot fall through
  if (ninja.rocketT > 0 && !ninja.dead) {
    rocketStep(); // power-up: automatic ascent, no gravity (see world/powerups.js)
  } else if (!onBand) {
    let g = GRAVITY_BASE * diff.gravityScale;
    const BF = HAZARDS.bumpFloat;
    const floating = ninja.floatT > 0 && !ninja.dead;
    if (floating) { g *= 1 - (1 - BF.gravity) * (ninja.floatT / BF.frames); ninja.floatT--; }
    ninja.vy += g;
    if (floating && ninja.vy > BF.maxFall) ninja.vy = BF.maxFall;
    ninja.x += ninja.vx;
    ninja.y += ninja.vy;
    ninja.vx *= 0.995;
  } else {
    ninja.vx *= 0.85;
    ninja.vy = 0;
  }
  if (ninja.spinning > 0) ninja.spinning -= 0.05;
  if (ninja.bonks > 0 && ++ninja.bonkT > HAZARDS.bonk.resetFrames) { ninja.bonks = 0; ninja.bonkT = 0; }

  if (ninja.x < NINJA_R) {
    const into = -ninja.vx;
    ninja.x = NINJA_R; ninja.vx = Math.abs(ninja.vx) * 0.5;
    if (into > WALL_KICK_MIN_SPEED && !onBand) startWallKick(-1);
  }
  if (ninja.x > W - NINJA_R) {
    const into = ninja.vx;
    ninja.x = W - NINJA_R; ninja.vx = -Math.abs(ninja.vx) * 0.5;
    if (into > WALL_KICK_MIN_SPEED && !onBand) startWallKick(1);
  }

  // Ground (start of the run): idle hops. Only while the ground is on screen — once the camera has
  // climbed past it, falling below the view ends the run as before.
  if (groundY && !ninja.dead && !onBand && ninja.vy >= 0 && ninja.y + NINJA_R >= groundY && groundY - camera.y <= H) {
    ninja.y = groundY - NINJA_R;
    ninja.vy = -GROUND_HOP_VY;
    ninja.vx *= 0.5;
    ninja.floatT = 0;
    ninja.spinning = 0;
    ninjaPose.crouch = Math.max(ninjaPose.crouch, 0.7);
    ninjaPose.launch = 1;
    debugStats.groundHops++;
    if (particles.length < 200) {
      for (let i = 0; i < 4; i++) {
        particles.push({ x: ninja.x + (i - 1.5) * 7, y: groundY - 1, vx: (i - 1.5) * 0.5, vy: -0.4 - Math.random() * 0.5,
          life: 16, max: 16, color: 'rgba(255,255,255,0.6)', size: 2 + Math.random() * 1.5 });
      }
    }
  }

  // Super-jump spin: turns around his own body during the whole ascent, slowing with
  // the upward speed; at the top it finishes the current turn and he falls normally.
  if (ninja.superSpin) {
    if (onBand) {
      ninja.superSpin = false; ninja.spinAngle = 0;
    } else if (ninja.vy < 0) {
      ninja.spinAngle += ninja.spinRate0 * Math.pow(Math.min(1, -ninja.vy / ninja.spinV0), ninja.spinPow || 1);
      if (ninja.vy < -3 && frame % 3 === 0 && particles.length < 220) {
        particles.push({
          x: ninja.x + (Math.random() - 0.5) * 14, y: ninja.y + 10 + Math.random() * 8,
          vx: (Math.random() - 0.5) * 1.2, vy: 0.6 + Math.random(),
          life: 26 + Math.random() * 14, max: 40, size: 3 + Math.random() * 2.5,
          color: Math.random() < 0.5 ? '#fff3a0' : atmosCache.accent,
          star: true, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3
        });
      }
    } else {
      const TWO_PI = Math.PI * 2;
      const frac = ((ninja.spinAngle % TWO_PI) + TWO_PI) % TWO_PI;
      const rem = frac < 0.25 ? -frac : TWO_PI - frac;
      if (Math.abs(rem) < 0.02) { ninja.superSpin = false; ninja.spinAngle = 0; }
      else ninja.spinAngle += rem > 0 ? Math.min(rem, Math.max(0.06, rem * 0.25)) : rem * 0.5;
    }
  }

  // Ratchet camera: only scrolls UP. When the ninja starts falling the view
  // locks at the highest point reached — no downward scroll, no recoil.
  const followY = ninja.y - H * 0.4;
  if (followY < camera.y && !ninja.dead) {
    // Need to go higher (more negative camera.y) — chase while ascending
    const riseLerp = ninja.vy < -4 ? 0.4 : 0.28;
    camera.y += (followY - camera.y) * riseLerp;
    // Snap if still lagging upward so peak never "bounces" back
    if (followY < camera.y - 2) {
      camera.y = Math.min(camera.y, followY);
    }
  }
  // Never increase camera.y (that would scroll the frame down / recoil)
  if (camera.y > 0) camera.y = 0;

  if (meters > maxHeightReached && !ninja.dead) maxHeightReached = meters;
  bestHeight = Math.floor(maxHeightReached);

  // Update corner theme name only (no center popup)
  if (atmosCache.name !== lastThemeName) {
    lastThemeName = atmosCache.name;
    themeName.textContent = atmosCache.name;
  }

  // Elastic trampoline: ready → stretching (sag) → launch
  if (elastic && !ninja.dead) {
    const hitPad = lerp(12, 6, smoothstep(0, 300, meters));
    const { nx, ny } = elasticUpNormal(elastic);
    const angle = Math.atan2(elastic.y2 - elastic.y1, elastic.x2 - elastic.x1);

    if (elastic.phase === 'ready' && !elastic.used && bounceCooldown <= 0 && !(ninja.rocketT > 0)) {
      const hit = pathHitsElastic(prevX, prevY, ninja.x, ninja.y, elastic, hitPad);
      const approaching = (ninja.vx * nx + ninja.vy * ny) < -0.25 || ninja.vy > 0.6;
      if (hit && approaching && insideAnyGhost()) {
        snapElastic(elastic);
      } else if (hit && approaching) {
        elastic.phase = 'stretching';
        elastic.hitT = hit.t;
        elastic.impactSpeed = Math.hypot(ninja.vx, ninja.vy);
        elastic.speedIn = Math.max(0, -(ninja.vx * nx + ninja.vy * ny)); // speed into the band (fall energy)
        elastic.stretchFrames = 0;
        elastic.maxSag = Math.min(ELASTIC_SAG_MAX, ELASTIC_SAG_BASE + elastic.impactSpeed * ELASTIC_SAG_PER_SPEED +
          ELASTIC_SAG_FALL_EXTRA * Math.max(0, elastic.speedIn - FALL_ENERGY_FREE_SPEED));
        elastic.sag = 0;
        ninja.vx = 0;
        ninja.vy = 0;
        stretchDir = angle;
      }
    }

    if (elastic.phase === 'stretching') {
      elastic.stretchFrames++;
      const dur = Math.max(10, Math.min(20, 12 + elastic.impactSpeed * 0.25));
      const progress = Math.min(1, elastic.stretchFrames / dur);
      // Ease toward peak sag (visible droop under the ninja)
      elastic.sag = elastic.maxSag * Math.sin(progress * Math.PI * 0.5);
      stretch = 0.35 + progress * 0.75;

      const mx = elastic.x1 + (elastic.x2 - elastic.x1) * elastic.hitT;
      const my = elastic.y1 + (elastic.y2 - elastic.y1) * elastic.hitT;
      // Pin on band, offset along downward normal (-up)
      ninja.x = mx - nx * elastic.sag;
      ninja.y = my - ny * elastic.sag;
      ninja.vx = 0;
      ninja.vy = 0;

      if (elastic.stretchFrames >= dur) {
        const rawLen = elasticLength(elastic);
        let strength = BASE_IMPULSE * diff.impulseBonus * elasticPower(rawLen);
        const fallMult = fallBounceMult(elastic.speedIn || 0, strength + elastic.impactSpeed * 0.28);
        // Short-elastic streak: the SUPER_STREAK-th short bounce in a row is a super jump
        const isShort = elasticT(rawLen) <= SHORT_ELASTIC_T;
        shortStreak = isShort ? shortStreak + 1 : 0;
        const isSuper = isShort && shortStreak >= SUPER_STREAK;
        if (isSuper) {
          shortStreak = 0;
          strength = Math.max(strength * SUPER_JUMP_MULT, SUPER_JUMP_MIN, strength * fallMult);
        }
        updateStreakHud();
        // Launch along upward normal — do NOT multiply by an extra -1. Short lines: straightened
        // toward vertical (their tilt is usually accidental and would waste height).
        const straighten = isShort ? SHORT_STRAIGHTEN * (1 - elasticT(rawLen) / SHORT_ELASTIC_T) : 0;
        let lx = nx * (1 - straighten), ly = ny * (1 - straighten) - straighten;
        const ll = Math.hypot(lx, ly) || 1;
        lx /= ll; ly /= ll;
        const boost = elastic.impactSpeed * 0.28;
        const fm = isSuper ? 1 : fallMult; // no stacking with the super jump (it already took the bigger one)
        ninja.vx = lx * (strength + boost * 0.45) * fm;
        ninja.vy = ly * (strength + boost) * fm;
        if (fm > 1.1 && !isSuper) fallBounceFx(fm);
        ninja.facing = ninja.vx >= 0 ? 1 : -1;
        if (!ninja.bonkedSinceLaunch) ninja.bonks = 0; // a jump with no bonk ends the bonk streak
        ninja.bonkedSinceLaunch = false;
        debugStats.bounces++;
        debugStats.last = { len: Math.round(rawLen), short: isShort, superJump: isSuper, vy: ninja.vy, streak: shortStreak,
          speedIn: +(elastic.speedIn || 0).toFixed(2), fallMult: +fm.toFixed(3), sag: +elastic.maxSag.toFixed(1) };
        if (isSuper) {
          debugStats.supers++;
          debugStats.superFrame = frame;
          ninja.spinning = 0;
          ninja.superSpin = true;
          ninja.spinAngle = 0;
          // Plan the spin so it slows linearly with the rising speed and ends upright at the top
          const g = GRAVITY_BASE * diff.gravityScale;
          const v0 = Math.max(1, -ninja.vy);
          const T = v0 / g;
          // rate = rate0 * (speed / launch speed)^pow -> total angle = rate0 * T / (pow + 1).
          // Pick a whole number of turns, then the slow-down curve so the launch rate stays at the nominal one.
          const nominal = SUPER_SPIN_TURNS_PER_SEC * Math.PI * 2 / 60;
          const turns = Math.max(1, Math.round(nominal * T / (Math.PI * 2) / 1.5));
          const pow = Math.max(0.3, Math.min(3, nominal * T / (Math.PI * 2 * turns) - 1));
          ninja.spinPow = pow;
          ninja.spinRate0 = turns * Math.PI * 2 * (pow + 1) / T;
          ninja.spinV0 = v0;
          superBurst(ninja.x, ninja.y);
        } else {
          ninja.spinning = 1;
        }
        stretch = 1;
        stretchDir = angle;

        elastic.phase = 'launching';
        elastic.used = true;
        elastic.wobble = 1;
        bounceCooldown = 12;
        const ecol = atmosCache.elastic;
        burst(ninja.x, ninja.y, ecol, 14, 4);
        burst(ninja.x, ninja.y, '#fff', 8, 2.5);
        beep(220 + strength * 12, 0.12, 'sine', 0.1);
        beep(440 + strength * 8, 0.08, 'triangle', 0.06);
        elastic.clearIn = 13; // ~220 ms at 60 updates/s, counted in game frames (was a wall-clock setTimeout)
      }
    } else if (elastic.phase === 'launching' || elastic.used) {
      if (elastic.sag > 0) elastic.sag *= 0.82;
    }

    elastic.age++;
    if (elastic.wobble > 0) elastic.wobble *= 0.9;
    if (elastic.phase === 'snapped') {
      if (++elastic.snapT >= HAZARDS.ghostPlatform.snapFrames) elastic = null;
    } else if (elastic.used && elastic.clearIn > 0 && --elastic.clearIn === 0) elastic = null;
    else if (!elastic.used && elastic.phase === 'ready' && elastic.age >= ELASTIC_LIFETIME) {
      snapElastic(elastic); // unused for 1.5 s: it snaps (both halves whip back)
      debugStats.expired++;
    }
  }

  // Hazards: move, then continuous collision along this frame's path
  updateHazards();
  if (!ninja.dead) {
    if (ninja.ghost > 0) ninja.ghost--;
    tickPowerTimers();
    if (ninja.rocketT > 0) { // rocket: passes through every hazard
      ninja.still = 0; ninja.embedded = 0; ninja.stillX = ninja.x; ninja.stillY = ninja.y;
    } else {
      collideHazards(prevX, prevY, onBand);
      antiStuck();
    }
    pickupPowerups();
  } else ninja.deathSpin += 0.22;
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y -= 0.9; f.life--;
    if (f.life <= 0) floaters.splice(i, 1);
  }

  // Coins
  for (const c of coins) {
    if (c.collected) continue;
    c.sparkle += 0.15;
    if (c.y > camera.y + H + 80) { c.collected = true; continue; }
    if (ninja.magnetT > 0 && !ninja.dead) magnetPull(c);
    if (!ninja.dead && Math.hypot(ninja.x - c.x, ninja.y - c.y) < NINJA_R + c.r + 4) {
      c.collected = true;
      runCoins++;
      burst(c.x, c.y, atmosCache.accent, 10, 3);
      beep(880, 0.06, 'sine', 0.07);
      beep(1320, 0.08, 'triangle', 0.05);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.star) { p.vy += 0.035; p.vx *= 0.975; p.vy *= 0.975; p.rot += p.vr; }
    else p.vy += 0.08;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.r += 2 + 7 * r.life;
    r.life -= 0.045;
    if (r.life <= 0) rings.splice(i, 1);
  }

  // Drift clouds
  for (const c of cloudLayer) {
    c.x += c.speed * 0.4;
    if (c.x > W * 2.2) c.x = -80;
  }

  spawnAhead();

  // Lose only after falling fully off the bottom of the (following) camera
  if (ninja.y - camera.y > H + 80) gameOver();

  updateHud(meters);
}
