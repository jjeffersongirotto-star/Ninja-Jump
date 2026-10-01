// --- Audio ---
let audioCtx = null;
let soundOn = true;
function ensureAudio() {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  try {
    if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      const pr = audioCtx.resume();
      if (pr && typeof pr.catch === 'function') pr.catch(function () {});
    }
  } catch (e) {}
}
function beep(freq, dur, type, vol) {
  if (!audioCtx || !soundOn) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain ? audioCtx.createGain() : audioCtx.createGainNode();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.08;
    o.connect(g); g.connect(audioCtx.destination);
    if (o.start) o.start(); else o.noteOn(0);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    if (o.stop) o.stop(audioCtx.currentTime + dur); else o.noteOff(audioCtx.currentTime + dur);
  } catch (e) {}
}
