// --- Compatibility helpers (old Android WebViews, in-app viewers, sandboxed iframes) ---
function logErr(where, err) {
  try { if (window.console && console.error) console.error('[Ninja Jump] ' + where + ':', err); } catch (e) {}
}
function fatal(detail) {
  try { if (typeof window.__ninjaFatal === 'function') window.__ninjaFatal(detail); } catch (e) {}
}
if (typeof Math.hypot !== 'function') {
  Math.hypot = function () {
    let s = 0;
    for (let i = 0; i < arguments.length; i++) s += arguments[i] * arguments[i];
    return Math.sqrt(s);
  };
}
const nowMs = (window.performance && typeof window.performance.now === 'function')
  ? function () { return window.performance.now(); }
  : function () { return Date.now(); };
const nativeRaf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || null;
function requestFrame(cb) {
  if (nativeRaf) {
    try { return nativeRaf.call(window, cb); } catch (e) {}
  }
  return setTimeout(function () { cb(nowMs()); }, 16);
}
// { passive: false } where supported (same as before); plain `false` on engines without options objects
let passiveSupported = false;
try {
  const probe = Object.defineProperty({}, 'passive', { get: function () { passiveSupported = true; return false; } });
  window.addEventListener('ninjaprobe', null, probe);
  window.removeEventListener('ninjaprobe', null, probe);
} catch (e) {}
const ACTIVE = passiveSupported ? { passive: false } : false;
