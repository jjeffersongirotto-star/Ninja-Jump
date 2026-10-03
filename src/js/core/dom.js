// --- Storage keys, canvas and DOM element references ---
const LS_METERS = 'ninjaJump_bestMeters';
const LS_COINS = 'ninjaJump_bestCoins';
const LS_OLD_METERS = 'ninjaElastico_bestMeters';
const LS_OLD_COINS = 'ninjaElastico_bestCoins';
const LS_WALLET = 'ninjaJump_wallet';      // coins collected over all runs (spent on characters)
const LS_SKINS = 'ninjaJump_skinsOwned';   // comma-separated owned character ids
const LS_SKIN = 'ninjaJump_skin';          // selected character id
const LS_SOUND = 'ninjaJump_sound';        // '0' = audio off

const canvas = document.getElementById('game');
// `let`: the character previews temporarily point it at their own small canvases
let ctx = (function () {
  try { return canvas.getContext('2d'); } catch (e) { logErr('getContext', e); return null; }
})();
if (!ctx) { fatal('canvas 2D indisponível'); return; }
// ellipse() is missing on some old WebViews: same shape via a scaled arc
const CtxProto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
if (typeof ctx.ellipse !== 'function') {
  (CtxProto && typeof CtxProto.ellipse !== 'function' ? CtxProto : ctx).ellipse = function (x, y, rx, ry, rot, a0, a1, ccw) {
    this.save();
    this.translate(x, y);
    this.rotate(rot || 0);
    this.scale(Math.max(rx, 0.0001), Math.max(ry, 0.0001));
    this.arc(0, 0, 1, a0, a1, !!ccw);
    this.restore();
  };
}
let W = 0, H = 0, dpr = 1;

const metersEl = document.getElementById('meters');
const metersVal = document.getElementById('metersVal');
const progressEl = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const hud = document.getElementById('hud');
const coinsHud = document.getElementById('coinsHud');
const themeName = document.getElementById('themeName');
const overlay = document.getElementById('overlay');
const overlaySub = document.getElementById('overlaySub');
const playBtn = document.getElementById('playBtn');
const bestM = document.getElementById('bestM');
const bestC = document.getElementById('bestC');
const goStats = document.getElementById('goStats');
const goMeters = document.getElementById('goMeters');
const goCoins = document.getElementById('goCoins');
const newRec = document.getElementById('newRec');
const recordsBox = document.getElementById('recordsBox');
const streakEl = document.getElementById('streak');
const streakPips = streakEl ? streakEl.getElementsByTagName('i') : [];
const titleEl = document.querySelector('.title');
const walletVal = document.getElementById('walletVal');
const walletVal2 = document.getElementById('walletVal2');
const charsList = document.getElementById('charsList');
const charsMsg = document.getElementById('charsMsg');
const dlgEl = document.getElementById('dlg');
const soundToggle = document.getElementById('soundToggle');
const soundLabel = document.getElementById('soundLabel');
const countdownEl = document.getElementById('countdown');
const SCREENS = { main: 'scrMain', chars: 'scrChars', options: 'scrOptions', audio: 'scrAudio', controls: 'scrControls', pause: 'scrPause' };
const SCREEN_TITLES = { chars: 'Personagens', options: 'Opções', audio: 'Áudio', controls: 'Controles', pause: 'Pausado' };
const LS_CONTROLS = 'ninjaJump_controls';  // 'auto' | 'touch' | 'mouse'
