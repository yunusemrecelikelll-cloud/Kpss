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
      const u = localStorage.getItem('kpss_v2_active_user') || '';
      const pre = u
        ? `kpss_v2_${u.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_').slice(0, 40)}_`
        : 'kpss_v2_legacy_';
      const s = JSON.parse(localStorage.getItem(pre + 'settings')) || {};
      return s.soundEnabled !== false;
    } catch { return true; }
  }

  // Dolgun tık — hızlı frekans düşüşü, tok vuruş hissi
  function click() {
    if (!_enabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.07);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Tik-tak (son 5 saniyelik geri sayım)
  function tick() {
    if (!_enabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    const freq = _tickPhase ? 480 : 820;
    _tickPhase = !_tickPhase;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.12);
  }

  function resetTickPhase() { _tickPhase = false; }

  return { click, tick, resetTickPhase };
})();
