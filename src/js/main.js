// --- Startup: each piece isolated so one failure can't block the others ---
function step(name, fn) {
  try { fn(); return true; } catch (err) { logErr(name, err); return false; }
}
step('play button', bindPlayButton);
step('menus', bindMenus);
step('settings', function () { loadSound(); loadSkin(); refreshWallet(); });
step('app', bindApp);
step('controls', bindControls);
step('input', bindInput);
step('page guards', bindPageGuards);
step('resize listeners', bindResize);
step('fullscreen', bindFullscreen);
const sized = step('resize', resize);
step('records', loadRecords);
ninja = { x: W / 2, y: H * 0.38, vx: 0, vy: 0, facing: 1, spinning: 0 };
camera = { y: 0 };
const looping = step('loop', function () { requestFrame(loop); });
if (!sized || !looping) fatal(!sized ? 'falha ao preparar a tela' : 'falha ao iniciar a animação');
window.__ninjaReady = true;
