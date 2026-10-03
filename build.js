#!/usr/bin/env node
// Builds the single-file game (NinjaJump.html) from the sources in src/.
//
//   node build.js           build NinjaJump.html
//   node build.js --check   fail if NinjaJump.html is not up to date with src/ (used by CI)
//   node build.js --watch   rebuild on every change in src/
//
// The game files in src/js/ are NOT separate modules: they are pieces of one function body,
// concatenated in the order below, so they all share the same scope (a function or variable
// declared in one file can be used in any other). Order matters for top-level code that runs
// immediately (constants and `let` values must be declared before they are read at startup).
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'NinjaJump.html');

const GAME_FILES = [
  'core/compat.js',             // polyfills / old WebView helpers
  'core/dom.js',                // storage keys, canvas, DOM element references
  'core/audio.js',              // beeps (Web Audio)
  'core/color.js',              // color math helpers
  'config/atmosphere.js',       // scenery bands by height + physics difficulty curve
  'config/physics.js',          // gravity, elastic power, super jump, ground
  'config/hazards.js',          // hazards & difficulty progression (all tuning)
  'config/powerups.js',         // power-ups: magnet, shield, rocket (all tuning)
  'config/fx.js',               // visual effects: glow, vignette, particles, textures (all tuning)
  'core/state.js',              // game state variables, debug stats
  'core/storage.js',            // localStorage + records
  'world/setup.js',             // resize, scenery seeds, new run, meters <-> world
  'world/hazard-generator.js',  // hazard/coin row generator + gap validator
  'world/rooms.js',             // hand-built obstacle rooms + the room spawner
  'world/hazards.js',           // hazards in the world: collisions, bumps, stomps, ghost platforms
  'world/elastic.js',           // drawing the elastic, particle bursts
  'world/powerups.js',          // power-ups in the world: pickup and effects
  'world/update.js',            // per-frame game logic
  'ui/hud.js',                  // HUD, game over, start of a run
  'ui/screens.js',              // menu screens, wallet & characters, options, pause
  'render/fx.js',               // cached glow sprites, vignette, stage textures, walls, far layers
  'render/background.js',       // parallax scenery
  'render/elastic.js',          // elastic drawing
  'config/skins.js',            // characters (palettes and prices)
  'render/skins.js',            // character accessories, trails and auras (cosmetic)
  'render/ninja.js',            // ninja sprite and pose
  'render/hazards.js',          // hazard sprites
  'render/coins-effects.js',    // coins, ground, floaters, particles
  'render/powerups.js',         // power-up items, shield bubble, rocket flame, HUD timers
  'render/frame.js',            // render() + fixed-timestep game loop
  'input/controls.js',          // control mode: touch / computer (mouse) / automatic, keyboard shortcuts
  'input/pointer.js',           // touch / pointer / mouse input
  'ui/buttons.js',              // button and page bindings
  'ui/fullscreen.js',           // fullscreen button (top-right) + keeping the game fullscreen
  'core/app.js',                // installable app (PWA): offline service worker + "Instalar app" button
  'main.js'                     // startup
];

const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8').replace(/\r\n/g, '\n');
const indent = (text) => text.replace(/\n+$/, '').split('\n').map((l) => (l ? '  ' + l : l)).join('\n');

function build() {
  const game = GAME_FILES.map((f) => indent(read('js/' + f))).join('\n\n');
  const blocks = {
    css: '<style>\n' + indent(read('style.css')) + '\n</style>',
    boot: '<script>\n' + read('boot.js').replace(/\n+$/, '') + '\n</script>',
    game: '<script>\n(function () {\n  \'use strict\';\n\n' + game + '\n})();\n</script>'
  };
  const html = read('index.html').replace(/<!-- build:(\w+) -->/g, (m, name) => {
    if (!(name in blocks)) throw new Error('Unknown build marker: ' + m);
    return blocks[name];
  });
  return html.replace(/\n*$/, '\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current !== build()) {
      console.error('NinjaJump.html is out of date: edit the files in src/ and run "node build.js".');
      process.exit(1);
    }
    console.log('NinjaJump.html is up to date.');
    return;
  }
  const write = () => {
    try {
      fs.writeFileSync(OUT, build());
      console.log('Built ' + path.relative(process.cwd(), OUT) + ' (' + new Date().toLocaleTimeString() + ')');
    } catch (err) {
      console.error('Build failed: ' + err.message);
    }
  };
  write();
  if (args.includes('--watch')) {
    let timer = null;
    fs.watch(SRC, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(write, 100);
    });
    console.log('Watching src/ for changes...');
  }
}

main();
