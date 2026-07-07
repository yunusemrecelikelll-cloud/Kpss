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

  // Yumuşak "tık" sesi — iki katmanlı: keskin ön vuruş + hafif rezonans
  function click() {
    if (!_enabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const t = ctx.currentTime;

    // Üst katman: keskin ön vuruş
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1200, t);
    osc1.frequency.exponentialRampToValueAtTime(600, t + 0.03);
    g1.gain.setValueAtTime(0.14, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.start(t); osc1.stop(t + 0.05);

    // Alt katman: hafif dolgunluk
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(420, t);
    osc2.frequency.exponentialRampToValueAtTime(280, t + 0.1);
    g2.gain.setValueAtTime(0.07, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(t); osc2.stop(t + 0.11);
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
