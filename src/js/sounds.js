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

  // ── Sınav ortamı odaklanma sesleri ──
  let _focusNodes = null;
  let _focusBurstTimer = null;

  function _brownNoiseBuffer(ctx, seconds) {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    return buffer;
  }

  function _noiseBuffer(ctx, seconds, shape) {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * shape(i / bufferSize);
    }
    return buffer;
  }

  // Kağıt hışırtısı — birkaç örtüşen, dalgalı genlikli gürültü patlaması
  function _paperRustle(ctx) {
    const t = ctx.currentTime;
    const layers = 2 + Math.floor(Math.random() * 2);
    for (let l = 0; l < layers; l++) {
      const dur = 0.12 + Math.random() * 0.2;
      const src = ctx.createBufferSource();
      src.buffer = _noiseBuffer(ctx, dur, x => Math.sin(Math.PI * x) * (0.6 + 0.4 * Math.random()));
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800 + Math.random() * 2200;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.05 + Math.random() * 0.05;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(t + l * 0.05);
    }
  }

  // Sayfa çevirme — filtre frekansı süpürülen bir "swoosh"
  function _pageTurn(ctx) {
    const t = ctx.currentTime;
    const dur = 0.3;
    const src = ctx.createBufferSource();
    src.buffer = _noiseBuffer(ctx, dur, x => Math.sin(Math.PI * x));
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + dur);
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(t);
  }

  // Kalem/kurşun kalem sesi — art arda kısa, tırmalayan gürültü vuruşları
  function _pencilScratch(ctx) {
    const t = ctx.currentTime;
    const strokes = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < strokes; i++) {
      const st = t + i * (0.045 + Math.random() * 0.03);
      const src = ctx.createBufferSource();
      src.buffer = _noiseBuffer(ctx, 0.02, x => 1 - x);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3500 + Math.random() * 2000;
      const gain = ctx.createGain();
      gain.gain.value = 0.03 + Math.random() * 0.02;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(st);
    }
  }

  // Hafif, uzaktan öksürük — düşük frekanslı "thump" + boğuk gürültü gövdesi
  function _softCough(ctx) {
    const t = ctx.currentTime;
    const bodyDur = 0.22;
    const body = ctx.createBufferSource();
    body.buffer = _noiseBuffer(ctx, bodyDur, x => Math.exp(-x * 6));
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.value = 450;
    bodyFilter.Q.value = 0.9;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.09;
    body.connect(bodyFilter); bodyFilter.connect(bodyGain); bodyGain.connect(ctx.destination);
    body.start(t);

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(160, t);
    thump.frequency.exponentialRampToValueAtTime(70, t + 0.15);
    thumpGain.gain.setValueAtTime(0.1, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    thump.connect(thumpGain); thumpGain.connect(ctx.destination);
    thump.start(t); thump.stop(t + 0.2);
  }

  // Sandalye/masa gıcırtısı — yavaş perde kaymalı, alçak bir gürültü
  function _chairCreak(ctx) {
    const t = ctx.currentTime;
    const dur = 0.5 + Math.random() * 0.3;
    const src = ctx.createBufferSource();
    src.buffer = _noiseBuffer(ctx, dur, x => Math.sin(Math.PI * x) * 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 4;
    const startFreq = 250 + Math.random() * 150;
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.linearRampToValueAtTime(startFreq + (Math.random() < 0.5 ? 120 : -80), t + dur);
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(t);
  }

  // Sınav salonu olayları — rastgele ama gerçekçi ağırlıklarla seçilir
  const _AMBIENCE_EVENTS = [
    { fn: _paperRustle, weight: 5 },
    { fn: _pageTurn, weight: 3 },
    { fn: _pencilScratch, weight: 5 },
    { fn: _chairCreak, weight: 2 },
    { fn: _softCough, weight: 1 },
  ];
  function _playRandomAmbienceEvent(ctx) {
    const total = _AMBIENCE_EVENTS.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of _AMBIENCE_EVENTS) {
      if ((r -= e.weight) <= 0) { e.fn(ctx); return; }
    }
  }

  function startFocusAmbience() {
    if (_focusNodes) return;
    const ctx = _getCtx(); if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = _brownNoiseBuffer(ctx, 4);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start();
    _focusNodes = { src, gain };
    const scheduleNext = () => {
      _focusBurstTimer = setTimeout(() => {
        _playRandomAmbienceEvent(ctx);
        scheduleNext();
      }, 1800 + Math.random() * 3200);
    };
    scheduleNext();
  }

  function stopFocusAmbience() {
    if (_focusNodes) {
      try { _focusNodes.src.stop(); } catch { /* already stopped */ }
      _focusNodes = null;
    }
    if (_focusBurstTimer) { clearTimeout(_focusBurstTimer); _focusBurstTimer = null; }
  }

  function isFocusPlaying() { return !!_focusNodes; }

  return { click, tick, resetTickPhase, startFocusAmbience, stopFocusAmbience, isFocusPlaying };
})();
