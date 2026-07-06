const Timer = (() => {
  const AUTO_SECS_PER_Q = 65; // KPSS GY-GK oranı

  let _id = null, _remaining = 0, _onTick = null, _onExpire = null;

  function _readSettings() {
    try {
      const u = localStorage.getItem('kpss_v2_active_user') || '';
      const pre = u
        ? `kpss_v2_${u.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_').slice(0, 40)}_`
        : 'kpss_v2_legacy_';
      return JSON.parse(localStorage.getItem(pre + 'settings')) || {};
    } catch { return {}; }
  }

  function _getSecsPerQ() {
    const s = _readSettings();
    if (s.timerMode === 'perq') return Number(s.secsPerQ) || AUTO_SECS_PER_Q;
    return AUTO_SECS_PER_Q;
  }

  function durationFor(n) { return n * _getSecsPerQ(); }

  function format(s) {
    const m = Math.floor(Math.abs(s) / 60).toString().padStart(2, '0');
    const sec = Math.floor(Math.abs(s) % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function start(total, tick, expire) {
    stop();
    _remaining = total; _onTick = tick; _onExpire = expire;
    if (tick) tick(_remaining);
    _id = setInterval(() => {
      _remaining -= 1;
      if (_onTick) _onTick(_remaining);
      if (_remaining <= 0) { stop(); if (_onExpire) _onExpire(); }
    }, 1000);
  }

  function stop() { if (_id) { clearInterval(_id); _id = null; } }

  function elapsed(total) { return total - _remaining; }

  function getRemaining() { return _remaining; }

  return { durationFor, format, start, stop, elapsed, getRemaining };
})();
