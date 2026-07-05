// KPSS v2 — Web Audio API ses efektleri
const Sounds = (() => {
  let _ctx = null;
  let _tickPhase = false;

  function _getCtx() {
    if (!_ctx) {
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  function _enabled() {
    try {
      const s = JSON.parse(localStorage.getItem('kpss_v2_settings')) || {};
      return s.soundEnabled !== false;
    } catch { return true; }
  }

  // Kısa buton pop sesi
  function click() {
    if (!_enabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.055);
    gain.gain.setValueAtTime(0.13, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.085);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  }

  // Tik-tak (son 5 saniyelik geri sayım için)
  function tick() {
    if (!_enabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const freq = _tickPhase ? 500 : 760;
    _tickPhase = !_tickPhase;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  function resetTickPhase() { _tickPhase = false; }

  return { click, tick, resetTickPhase };
})();
