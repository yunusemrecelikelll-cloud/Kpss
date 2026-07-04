// Rozet tanımları ve kontrol mantığı
const Badges = (() => {
  const DEFS = [
    { id: 'ilk-adim',    icon: '🌱', name: 'İlk Adım',       desc: 'İlk testini çözdün!' },
    { id: 'hizli-basla', icon: '🚀', name: 'Hızlı Başla',    desc: '3 farklı konu testi çözdün' },
    { id: 'yukselen',    icon: '⭐', name: 'Yükselen Yıldız', desc: 'Herhangi bir konuda %70+ skoru aştın' },
    { id: 'ustun',       icon: '👑', name: 'Üstün Performans', desc: 'Bir testde %90+ aldın' },
    { id: 'devam-et',    icon: '🔥', name: 'Devam Et!',       desc: '3 günlük seri yaptın' },
    { id: 'azimli',      icon: '💎', name: 'Azimli',          desc: '7 günlük seri yaptın' },
    { id: 'turkce-uzm',  icon: '📖', name: 'Türkçe Ustası',   desc: 'Türkçe\'nin tüm konularını tamamladın' },
    { id: 'mat-uzm',     icon: '🔢', name: 'Matematik Ustası', desc: 'Matematiğin tüm konularını tamamladın' },
    { id: 'tarih-uzm',   icon: '🏛️', name: 'Tarihçi',        desc: 'Tarihin tüm konularını tamamladın' },
    { id: 'cog-uzm',     icon: '🗺️', name: 'Gezgin',         desc: 'Coğrafyanın tüm konularını tamamladın' },
    { id: 'vat-uzm',     icon: '⚖️', name: 'Vatandaş',       desc: 'Vatandaşlığın tüm konularını tamamladın' },
    { id: 'gk-uzm',      icon: '📰', name: 'Güncel Takip',    desc: 'Güncel Bilgiler konularını tamamladın' },
    { id: 'deneme-sav',  icon: '🎯', name: 'Deneme Savaşçısı', desc: 'İlk 120 soruluk deneme testini tamamladın' },
    { id: 'mucadeleci',  icon: '🏅', name: 'Mücadeleci',      desc: 'Yanlış sorular bankasından 20+ soru çözdün' },
    { id: 'sifir-yanlis',icon: '✨', name: 'Mükemmel',        desc: 'Bir testde hiç yanlış yapmadın' },
    { id: 'toplam-100',  icon: '💯', name: '100 Soru',        desc: 'Toplamda 100 soru çözdün' },
    { id: 'toplam-500',  icon: '🌟', name: '500 Soru',        desc: 'Toplamda 500 soru çözdün' },
  ];

  function getAll() { return DEFS; }

  function check(subjects) {
    const newly = [];

    function earn(id) {
      const unlocked = Storage.unlockBadge(id);
      if (unlocked) newly.push(DEFS.find(d => d.id === id));
    }

    const overall = Storage.computeOverall();
    const attempts = Storage.getAttempts();
    const completed = Storage.getCompletedTopics();
    const streak = Storage.getStreak();
    const badges = Storage.getUnlockedBadges();

    if (attempts.length >= 1) earn('ilk-adim');
    const uniqueTopics = new Set(attempts.map(a => a.topicId)).size;
    if (uniqueTopics >= 3) earn('hizli-basla');
    if (attempts.some(a => a.skor >= 70)) earn('yukselen');
    if (attempts.some(a => a.skor >= 90)) earn('ustun');
    if (attempts.some(a => a.yanlis === 0 && a.toplam >= 5)) earn('sifir-yanlis');
    if (streak.count >= 3) earn('devam-et');
    if (streak.count >= 7) earn('azimli');
    if (overall.solved >= 100) earn('toplam-100');
    if (overall.solved >= 500) earn('toplam-500');

    if (attempts.some(a => a.isFullTest)) earn('deneme-sav');
    if (Storage.getWrongBank().length >= 20) earn('mucadeleci');

    // subject completion badges
    subjects.forEach(s => {
      if (!s.data) return;
      const allDone = s.data.konular.every(t => completed[t.id]);
      if (allDone) {
        const map = { turkce:'turkce-uzm', matematik:'mat-uzm', tarih:'tarih-uzm', cografya:'cog-uzm', vatandaslik:'vat-uzm', guncel:'gk-uzm' };
        if (map[s.id]) earn(map[s.id]);
      }
    });

    return newly;
  }

  return { getAll, check };
})();
