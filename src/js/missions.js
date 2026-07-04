// Günlük & genel görevler
const Missions = (() => {
  const DEFS = [
    {
      id: 'daily-1test', icon: '📝', title: 'Günlük Test',
      desc: 'Bugün en az 1 test çöz', pts: 10,
      check: () => {
        const today = new Date().toDateString();
        return Storage.getAttempts().some(a => new Date(a.tarih).toDateString() === today);
      }
    },
    {
      id: 'daily-30q', icon: '🔥', title: '30 Soru',
      desc: 'Bugün toplam 30 soru çöz', pts: 20,
      check: () => {
        const today = new Date().toDateString();
        const total = Storage.getAttempts()
          .filter(a => new Date(a.tarih).toDateString() === today)
          .reduce((s, a) => s + a.toplam, 0);
        return total >= 30;
      }
    },
    {
      id: 'daily-70pct', icon: '⭐', title: '%70 Başarı',
      desc: 'Herhangi bir testte %70+ al', pts: 15,
      check: () => {
        const today = new Date().toDateString();
        return Storage.getAttempts().some(a =>
          new Date(a.tarih).toDateString() === today && a.skor >= 70
        );
      }
    },
    {
      id: 'weekly-3topics', icon: '📚', title: '3 Farklı Konu',
      desc: 'Bu hafta 3 farklı konuyu çalış', pts: 25,
      check: () => {
        const weekAgo = Date.now() - 7 * 86400000;
        const topics = new Set(
          Storage.getAttempts()
            .filter(a => new Date(a.tarih).getTime() > weekAgo)
            .map(a => a.topicId)
        );
        return topics.size >= 3;
      }
    },
    {
      id: 'weekly-deneme', icon: '🎯', title: 'Deneme Sınavı',
      desc: 'Bu hafta 1 deneme sınavı çöz', pts: 30,
      check: () => {
        const weekAgo = Date.now() - 7 * 86400000;
        return Storage.getAttempts().some(a =>
          a.isFullTest && new Date(a.tarih).getTime() > weekAgo
        );
      }
    },
  ];

  function getAll() {
    return DEFS.map(d => ({ ...d, done: d.check(), progress: d.check() }));
  }

  function checkAll() {
    const newly = [];
    DEFS.forEach(d => {
      if (!Storage.isMissionDone(d.id) && d.check()) {
        Storage.markMissionDone(d.id);
        newly.push(d);
      }
    });
    return newly;
  }

  // Motivasyonel günlük öneri
  function getTodaySuggestion(subjects) {
    if (!subjects || !subjects.length) return null;
    const completed = Storage.getCompletedTopics();
    const notDone = [];
    subjects.forEach(s => {
      if (!s.data) return;
      s.data.konular.forEach(t => {
        if (!completed[t.id]) notDone.push({ s, t });
      });
    });
    if (!notDone.length) return null;
    const pick = notDone[Math.floor(Date.now() / 86400000) % notDone.length];
    return pick;
  }

  return { getAll, checkAll, getTodaySuggestion };
})();
