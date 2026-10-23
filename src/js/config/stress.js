// --- Stress test (DEV ONLY, not a player feature): open the game with ?stress=1 ---
// Everything on at once to check the 60 FPS budget: magnet pulling every coin on screen, coins
// refilled across the whole screen, 2-hit platform break, immune to red enemies and spikes (and kills
// them), power-ups and the special x3, and an autopilot that keeps bouncing up to STRESS.goalM.
// Without the URL flag STRESS.on is false and none of this runs (normal play is unchanged).
const STRESS = {
  on: (function () { try { return /[?&]stress=1(&|$)/.test(window.location.search); } catch (e) { return false; } })(),
  goalM: 10000,
  coinsOnScreen: 90,                // active coins kept inside the view (refilled every frame)
  superMult: 3,                     // special: launch speed x3 (ascent 3x longer)
  ability: { platformBreakHits: 2, powerupDuration: 3, specialRedKills: Infinity }
};
