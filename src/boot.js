// Boot (ES5 on purpose, runs even on very old WebViews): hides the "no JavaScript" notice
// and shows a friendly message if the game fails to start (including a parse error below).
(function () {
  var root = document.documentElement;
  root.className = (' ' + root.className + ' ').replace(' nojs ', ' ') + 'js';
  function showFatal(detail) {
    try {
      if (window.__ninjaFailed) return;
      window.__ninjaFailed = true;
      root.className += ' game-failed';
      var ov = document.getElementById('overlay');
      if (ov) ov.className = (' ' + ov.className + ' ').replace(' hidden ', ' ');
      var d = document.getElementById('errDetail');
      if (d && detail) d.textContent = 'Detalhe: ' + String(detail).slice(0, 180);
    } catch (e) {}
  }
  window.__ninjaFatal = showFatal;
  window.onerror = function (msg, src, line) {
    if (!window.__ninjaReady) showFatal(msg + (line ? ' (linha ' + line + ')' : ''));
    return false;
  };
  if (window.addEventListener) {
    window.addEventListener('load', function () {
      if (!window.__ninjaReady) showFatal('o script do jogo não rodou');
    }, false);
  }
})();
