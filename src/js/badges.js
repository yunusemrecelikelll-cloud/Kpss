// Rozet tanımları ve kontrol mantığı
const Badges = (() => {
  const DEFS = [
    // — Başlangıç —
    { id: 'ilk-adim',      icon: '🌱', name: 'İlk Adım',           desc: 'İlk testini çözdün!' },
    { id: 'hizli-basla',   icon: '🚀', name: 'Hızlı Başla',        desc: '3 farklı konu testi çözdün' },
    { id: 'pratisyen',     icon: '📝', name: 'Pratisyen',           desc: '10 farklı konu testi çözdün' },
    { id: 'uzman',         icon: '🧠', name: 'Uzman',              desc: '20 test çözdün' },

    // — Başarı —
    { id: 'yukselen',      icon: '⭐', name: 'Yükselen Yıldız',    desc: 'Bir konuda %70+ aldın' },
    { id: 'ustun',         icon: '👑', name: 'Üstün Performans',   desc: 'Bir testde %90+ aldın' },
    { id: 'mukemmel',      icon: '✨', name: 'Mükemmel',           desc: 'Bir testde hiç yanlış yapmadın' },
    { id: 'mukemmeliyetci',icon: '💫', name: 'Mükemmeliyetçi',     desc: '3 farklı konuda %90+ aldın' },
    { id: 'genel-uzman',   icon: '🎓', name: 'Genel Uzman',        desc: 'Genel başarı oranın %70 üzeri' },
    { id: 'surekli-gelisim',icon:'📈', name: 'Sürekli Gelişim',    desc: 'Aynı konuda skoru %10+ artırdın' },

    // — Seri & Çalışma —
    { id: 'devam-et',      icon: '🔥', name: 'Devam Et!',          desc: '3 günlük seri yaptın' },
    { id: 'seri-5',        icon: '🌋', name: 'Ateş Halkası',       desc: '5 günlük seri yaptın' },
    { id: 'azimli',        icon: '💎', name: 'Azimli',             desc: '7 günlük seri yaptın' },
    { id: 'sabahci',       icon: '🌅', name: 'Sabahçı',            desc: 'Sabah 6-10 arası test çözdün' },
    { id: 'gece-kusu',     icon: '🌙', name: 'Gece Kuşu',          desc: 'Gece 22-02 arası test çözdün' },

    // — Soru Sayısı —
    { id: 'toplam-50',     icon: '🌸', name: '50 Soru',            desc: 'Toplamda 50 soru çözdün' },
    { id: 'toplam-100',    icon: '💯', name: '100 Soru',           desc: 'Toplamda 100 soru çözdün' },
    { id: 'toplam-500',    icon: '🌟', name: '500 Soru',           desc: 'Toplamda 500 soru çözdün' },
    { id: 'toplam-1000',   icon: '🏆', name: 'Efsane',             desc: 'Toplamda 1000 soru çözdün' },
    { id: 'dogru-100',     icon: '🎯', name: '100 Doğru',          desc: 'Toplamda 100 doğru cevap verdin' },

    // — Çeşitlilik —
    { id: 'koleksiyoncu',  icon: '🗂️', name: 'Koleksiyoncu',       desc: '5 farklı derste test çözdün' },
    { id: 'hizli',         icon: '⚡', name: 'Hızlı Düşünen',      desc: 'Bir testi 2 dk\'dan kısa sürede tamamladın' },
    { id: 'mucadeleci',    icon: '🏅', name: 'Mücadeleci',         desc: 'Yanlış sorular bankasından 20+ soru çözdün' },
    { id: 'deneme-sav',    icon: '🎯', name: 'Deneme Savaşçısı',   desc: 'İlk 120 soruluk deneme testini tamamladın' },

    // — Ders Ustalıkları —
    { id: 'turkce-uzm',   icon: '📖', name: 'Türkçe Ustası',      desc: 'Türkçe\'nin tüm konularını tamamladın' },
    { id: 'mat-uzm',      icon: '🔢', name: 'Matematik Ustası',   desc: 'Matematiğin tüm konularını tamamladın' },
    { id: 'tarih-uzm',    icon: '🏛️', name: 'Tarihçi',           desc: 'Tarihin tüm konularını tamamladın' },
    { id: 'cog-uzm',      icon: '🗺️', name: 'Gezgin',            desc: 'Coğrafyanın tüm konularını tamamladın' },
    { id: 'vat-uzm',      icon: '⚖️', name: 'Vatandaş',          desc: 'Vatandaşlığın tüm konularını tamamladın' },
    { id: 'gk-uzm',       icon: '📰', name: 'Güncel Takip',       desc: 'Güncel Bilgiler konularını tamamladın' },
    { id: 'tam-kpss',     icon: '👸', name: 'KPSS Prensi',        desc: 'Tüm ders konularını tamamladın!' },
  ];

  function getAll() { return DEFS; }

  function check(subjects) {
    const newly = [];
    function earn(id) {
      if (!DEFS.find(d => d.id === id)) return;
      if (Storage.unlockBadge(id)) newly.push(DEFS.find(d => d.id === id));
    }

    const overall  = Storage.computeOverall();
    const attempts = Storage.getAttempts();
    const completed = Storage.getCompletedTopics();
    const streak   = Storage.getStreak();
    const totalSolved = overall.solved;
    const totalCorrect = overall.correct;

    // — Başlangıç / çeşitlilik —
    if (attempts.length >= 1) earn('ilk-adim');
    const uniqueTopics = new Set(attempts.map(a => a.topicId)).size;
    if (uniqueTopics >= 3) earn('hizli-basla');
    if (uniqueTopics >= 10) earn('pratisyen');
    if (attempts.length >= 20) earn('uzman');

    // — Başarı —
    if (attempts.some(a => a.skor >= 70)) earn('yukselen');
    if (attempts.some(a => a.skor >= 90)) earn('ustun');
    if (attempts.some(a => a.yanlis === 0 && a.toplam >= 5)) earn('mukemmel');
    if (overall.rate >= 70 && attempts.length >= 5) earn('genel-uzman');

    // Mükemmeliyetçi: 3 farklı konuda %90+
    const highScoreTopics = new Set(attempts.filter(a => a.skor >= 90).map(a => a.topicId));
    if (highScoreTopics.size >= 3) earn('mukemmeliyetci');

    // Sürekli gelişim: aynı konuda skor artışı
    const topicGroups = {};
    attempts.forEach(a => { (topicGroups[a.topicId] = topicGroups[a.topicId] || []).push(a.skor); });
    const improved = Object.values(topicGroups).some(scores => {
      if (scores.length < 2) return false;
      return scores[scores.length - 1] - scores[0] >= 10;
    });
    if (improved) earn('surekli-gelisim');

    // — Seri —
    if (streak.count >= 3) earn('devam-et');
    if (streak.count >= 5) earn('seri-5');
    if (streak.count >= 7) earn('azimli');

    // Sabahçı / Gece Kuşu
    const hours = attempts.map(a => new Date(a.tarih).getHours());
    if (hours.some(h => h >= 6 && h < 10)) earn('sabahci');
    if (hours.some(h => h >= 22 || h < 2)) earn('gece-kusu');

    // — Soru sayısı —
    if (totalSolved >= 50)   earn('toplam-50');
    if (totalSolved >= 100)  earn('toplam-100');
    if (totalSolved >= 500)  earn('toplam-500');
    if (totalSolved >= 1000) earn('toplam-1000');
    if (totalCorrect >= 100) earn('dogru-100');

    // — Çeşitlilik —
    const uniqueSubjects = new Set(attempts.map(a => a.subjectId)).size;
    if (uniqueSubjects >= 5) earn('koleksiyoncu');

    // Hızlı: herhangi bir test 120 sn'den az sürede tamamlandı (soru sayısı >=5)
    if (attempts.some(a => a.sureSn > 0 && a.sureSn <= 120 && a.toplam >= 5)) earn('hizli');

    if (attempts.some(a => a.isFullTest)) earn('deneme-sav');
    if (Storage.getWrongBank().length >= 20) earn('mucadeleci');

    // — Ders ustalıkları —
    const subMap = { turkce:'turkce-uzm', matematik:'mat-uzm', tarih:'tarih-uzm', cografya:'cog-uzm', vatandaslik:'vat-uzm', guncel:'gk-uzm' };
    let allSubjectsDone = true;
    subjects.forEach(s => {
      if (!s.data) { allSubjectsDone = false; return; }
      const allDone = s.data.konular.every(t => completed[t.id]);
      if (allDone && subMap[s.id]) earn(subMap[s.id]);
      if (!allDone) allSubjectsDone = false;
    });
    if (allSubjectsDone && subjects.length >= 5) earn('tam-kpss');

    return newly;
  }

  return { getAll, check };
})();
