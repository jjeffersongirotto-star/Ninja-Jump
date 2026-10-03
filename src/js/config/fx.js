// --- Visual effects: ALL tuning lives here (purely cosmetic, gameplay never depends on it) ---
// Everything heavy is pre-rendered once (per screen size / stage) into small offscreen canvases and only
// blitted per frame: glow sprites instead of shadowBlur, cached skyline strips, wall strips and texture
// tiles. Each feature can be switched off here. On slow phones the adaptive quality (world/setup.js)
// also sheds effects: 1st drop = no vignette / far layers, 2nd drop = no wall details.
const FX = {
  shake: true,          // screen shake on strong hits (false = never shakes)
  shakeScale: 0.7,      // x every shake amount (kept subtle)
  shakeMax: 9,          // px cap
  glow: true,           // soft glow sprites on coins, items, elastics, rocket fire, combo light on the walls
  vignette: true,       // dark edges
  vignetteAlpha: 0.38,  // darkness at the corners
  particles: true,      // extra particles: wall-kick dust, defeat sparks, coin flip, rocket embers
  maxParticles: 260,    // hard cap (oldest removed first)
  parallax: true,       // extra far layers: ridge (day), skyline (sunset/night), galaxy band (space)
  textures: true,       // textured walls/platforms per stage (stone, bamboo, ice, metal)
  wallWidth: 6,         // px of textured wall shown at each screen edge (the edge IS the wall)
  // stage materials by altitude (m): crossfade over `blend` m around each change
  materials: [[0, 'stone'], [280, 'bamboo'], [430, 'ice'], [700, 'metal']],
  blend: 30,
  // ninja motion: lean with side speed, tuck when rising, arms up when falling, flutter with speed
  ninjaLean: 0.16,      // max body tilt (rad) from side speed
  ninjaAirEase: 0.14    // how fast the rise/fall in-between pose follows the vertical speed
};
