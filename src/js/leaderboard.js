// Liderboard — Firebase REST API veya JSONBin.io
// Çalışma mantığı:
//   - Settings'te firebase URL girilirse gerçek senkronizasyon
//   - Girilmezse offline/local modu (sadece kendi skorun)
const Leaderboard = (() => {
  let _cache = null;

  function getUrl() {
    const s = Storage.getSettings();
    return s.firebaseUrl ? s.firebaseUrl.replace(/\/$/, '') + '/leaderboard.json' : null;
  }

  async function fetchAll() {
    const url = getUrl();
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const data = await r.json();
      if (!data) return [];
      // Firebase returns object keyed by push id
      return Object.values(data).sort((a, b) => b.skor - a.skor);
    } catch { return null; }
  }

  async function postScore(entry) {
    const url = getUrl();
    if (!url) return false;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      return r.ok;
    } catch { return false; }
  }

  async function submitResult(attempt) {
    const settings = Storage.getSettings();
    const name = Storage.getUserName() || 'Aday';
    const entry = {
      name,
      skor: attempt.skor,
      dogru: attempt.dogru,
      yanlis: attempt.yanlis,
      toplam: attempt.toplam,
      subject: attempt.subjectAd || attempt.topicBaslik || 'Deneme',
      isFullTest: !!attempt.isFullTest,
      tarih: attempt.tarih,
      ts: Date.now(),
    };
    const ok = await postScore(entry);
    _cache = null; // invalidate cache
    return ok;
  }

  async function getTopList(limit = 20) {
    if (_cache) return _cache.slice(0, limit);
    const data = await fetchAll();
    if (!data) return getLocalTop(limit);
    _cache = data;
    return data.slice(0, limit);
  }

  function getLocalTop(limit = 20) {
    const name = Storage.getUserName() || 'Aday';
    const attempts = Storage.getAttempts();
    if (!attempts.length) return [];
    const best = { name, skor: Math.max(...attempts.map(a => a.skor)), dogru: 0, toplam: 0, isLocal: true };
    return [best];
  }

  function isOnline() { return !!getUrl(); }

  return { submitResult, getTopList, isOnline, getLocalTop };
})();
