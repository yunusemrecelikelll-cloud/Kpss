// KPSS v2 — Ana uygulama mantığı
const SUBJECTS = [
  { id: 'guncel', ad: 'Güncel Bilgiler', icon: '📰', dosya: 'data/guncel.json' },
  { id: 'vatandaslik', ad: 'Vatandaşlık', icon: '⚖️', dosya: 'data/vatandaslik.json' },
  { id: 'cografya', ad: 'Coğrafya', icon: '🗺️', dosya: 'data/cografya.json' },
  { id: 'tarih', ad: 'Tarih', icon: '🏛️', dosya: 'data/tarih.json' },
  { id: 'matematik', ad: 'Matematik-Geometri', icon: '🔢', dosya: 'data/matematik.json' },
  { id: 'turkce', ad: 'Türkçe', icon: '📖', dosya: 'data/turkce.json' },
];

// Tam deneme sınavı dağılımı (toplam 120 soru)
const FULL_TEST_DIST = {
  turkce: 30, matematik: 30, tarih: 24, cografya: 24, vatandaslik: 8, guncel: 4
};

// Ders sınavı: her konudan kaç soru
const SUBJECT_EXAM_Q_PER_TOPIC = 3;

// Premium karakter seçenekleri
const CHARACTER_OPTS = ['🦉', '🦁', '🐯', '🦄', '🐼', '🚀', '🏆', '📚'];

let _view = 'home', _params = {}, _loadErr = false;
let _perqTimerIndex = -1; // soru başına süre modunda zamanlayıcının başlatıldığı son soru indeksi
let _perqRemaining = []; // her sorunun kalan süresi (soru başına süre modu, geri dönünce korunsun diye)

const esc = s => { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
const $ = id => document.getElementById(id);
const sub = id => SUBJECTS.find(s => s.id === id);
const topic = (s, tid) => s.data?.konular.find(t => t.id === tid);

function isPremiumUser() {
  return Storage.isPremiumUser();
}

function renderPlanPill() {
  return `<span class="plan-pill ${isPremiumUser() ? 'premium' : 'free'}">${isPremiumUser() ? 'Premium' : 'Ücretsiz'}</span>`;
}

function openPremiumPage() {
  navigate('premium');
}

function computeKpssPoints(result) {
  const net = Number((result.dogru - result.yanlis * 0.25).toFixed(2));
  const p3 = Math.max(40, Math.round(120 + net * 0.95));
  const p93 = Math.max(40, Math.round(67 + net * 0.65));
  const p94 = Math.max(40, Math.round(62 + net * 0.68));
  return { net, p3, p93, p94 };
}

// ── Ses efekti: global tıklama ──
document.addEventListener('click', e => {
  const el = e.target.closest('button, .btn, .crumb, .subject-card, .topic-row, .theme-swatch, .nav-pill, .badge-item, .mission-row');
  if (!el) return;
  if (el.closest('.q-opt')) return; // şık seçiminde ses çıkmasın
  if (el.closest('.toggle-switch')) return;
  Sounds.click();
}, true);

// ── Üstten düşen bildirim ──
let _notifTimer = null;
function toast(msg, type = 'info', dur = 3000) {
  const el = $('top-notif');
  const icon = $('top-notif-icon');
  const text = $('top-notif-text');
  if (!el) return;

  const icons = { info: 'ℹ️', success: '✨', error: '❌', badge: '🏅' };
  icon.textContent = icons[type] || 'ℹ️';
  text.textContent = msg;

  el.className = 'top-notif';
  if (type === 'badge') el.style.borderColor = 'rgba(251,191,36,0.5)';
  else if (type === 'success') el.style.borderColor = 'rgba(52,211,153,0.45)';
  else if (type === 'error') el.style.borderColor = 'rgba(251,113,133,0.45)';
  else el.style.borderColor = 'rgba(139,92,246,0.4)';

  requestAnimationFrame(() => { el.classList.add('show'); });
  clearTimeout(_notifTimer);
  _notifTimer = setTimeout(() => {
    el.classList.remove('show');
    el.classList.add('hide-up');
    setTimeout(() => el.classList.remove('hide-up'), 500);
  }, dur);
}

// ── Particles ──
function spawnParticles() {
  const colors = ['#8b5cf6', '#f472b6', '#34d399', '#fbbf24', '#38bdf8'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = Math.random() * 4 + 2;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * 18}s;animation-duration:${14 + Math.random() * 12}s`;
    document.body.appendChild(p);
  }
}

// ── Router ──
function navigate(view, params = {}) {
  Timer.stop();
  Sounds.resetTickPhase();
  if (window.speechSynthesis) speechSynthesis.cancel();
  _view = view; _params = params;
  render();
  window.scrollTo(0, 0);
}

function render() {
  const v = _view;
  if (v === 'home') return renderHome();
  if (v === 'subject') return renderSubject(_params.sid);
  if (v === 'topic') return renderTopic(_params.sid, _params.tid);
  if (v === 'quiz') return renderQuizView();
  if (v === 'result') return renderResult(_params.result);
  if (v === 'badges') return renderBadges();
  if (v === 'wrong') return renderWrongBank();
  if (v === 'profile') return renderProfile();
  if (v === 'settings') return renderSettings();
  if (v === 'premium') return renderPremiumPage();
  if (v === 'fulltest') return startFullTest();
  if (v === 'subjectexam') return startSubjectExam(_params.sid);
  if (v === 'missions') return renderMissions();
  if (v === 'tools') return renderToolsHub();
  if (v === 'cardgame') return renderCardGame();
  if (v === 'cardgame2') return renderGameSubjectPicker('cardgame2');
  if (v === 'cardgame2-topics') return renderGameTopicPicker('cardgame2', _params.sid);
  if (v === 'cardgame2-play') return renderGame2Play(_params.sid, _params.tid);
  if (v === 'solitaire') return renderGameSubjectPicker('solitaire');
  if (v === 'solitaire-topics') return renderGameTopicPicker('solitaire', _params.sid);
  if (v === 'solitaire-play') return renderSolitairePlay(_params.sid, _params.tid);
  if (v === 'mnemonics') return renderMnemonics();
  if (v === 'predictor') return renderPredictor();
  if (v === 'league') return renderLeague();
  if (v === 'stopwatch') return renderStopwatch();
  if (v === 'mentor') return renderMentor();
}

// ── Soru bankası: ücretsiz/premium havuz büyüklüğü ──
const FREE_POOL_PER_TOPIC = 20;
const PREMIUM_POOL_PER_TOPIC = 100;

// ── Soru bankası: tekrarsız rastgele seçim ──
function pickQuestions(allQuestionsFull, count, topicId) {
  const cap = isPremiumUser() ? PREMIUM_POOL_PER_TOPIC : FREE_POOL_PER_TOPIC;
  const allQuestions = allQuestionsFull.slice(0, cap);
  const usedKeys = topicId ? Storage.getUsedQuestions(topicId) : [];
  const unused = allQuestions.filter(q => !usedKeys.includes(q.soru.slice(0, 50)));

  // Tercih: kullanılmamış sorular; eğer yetmiyorsa tüm havuzdan tamamla
  let pool;
  if (unused.length >= count) {
    pool = unused;
  } else if (unused.length > 0) {
    const used = allQuestions.filter(q => usedKeys.includes(q.soru.slice(0, 50)));
    pool = [...unused, ...used.sort(() => Math.random() - 0.5)];
  } else {
    pool = [...allQuestions];
  }

  // Fisher-Yates karıştır
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

const FREE_MAX_ATTEMPTS_PER_TOPIC = 2;
const FREE_MAX_FULLTEST_ATTEMPTS = 3;
function maxAttemptsPerTopic() { return isPremiumUser() ? Infinity : FREE_MAX_ATTEMPTS_PER_TOPIC; }

function setRoot(html) { $('view-root').innerHTML = html; }

// ── Load ──
async function loadAllSubjects() {
  const results = await Promise.allSettled(SUBJECTS.map(s => fetch(s.dosya).then(r => r.json())));
  results.forEach((r, i) => { if (r.status === 'fulfilled') SUBJECTS[i].data = r.value; });
}

// ── Streak + missions check after each result ──
function postResultChecks(result) {
  Storage.touchStreak();
  const newBadges = Badges.check(SUBJECTS);
  const newMissions = Missions.checkAll();
  newBadges.forEach(b => setTimeout(() => toast(`🏅 Yeni rozet: ${b.name}!`, 'badge', 4000), 800));
  newMissions.forEach(m => setTimeout(() => toast(`✅ Görev tamamlandı: ${m.title}!`, 'success', 4000), 1600));
}

// ── Cinsiyet bazlı hitap yardımcıları ──
function _titleFor(gender, name) {
  if (gender === 'k') return `Prenses ${name}`;
  if (gender === 'e') return `${name}`;
  return name;
}
function _heroGreeting(gender, name) {
  if (gender === 'k') return `Merhaba, <span>Prenses ${esc(name)}</span>! 👸`;
  if (gender === 'e') return `Selam, <span>${esc(name)}</span>! Hazır mısın? 🚀`;
  return `Merhaba, <span>${esc(name)}</span>! 🌸`;
}
function _motivationsFor(gender, streak) {
  const seriBilgi = streak.count > 1
    ? `${streak.count} günlük serideysin!`
    : 'Bugün yeni bir seri başlat!';
  if (gender === 'k') return [
    '👸 Prenses, her doğru cevap seni taçlandırıyor!',
    '💜 Canım, büyük sınav günü geldiğinde hazır olacaksın!',
    '🌸 Güzelim, bugün çalıştığın her dakika sınav günü gülümsetecek.',
    '✨ Kraliçem, sen bunu başarabilirsin — devam et!',
    `🏆 ${seriBilgi}`,
  ];
  if (gender === 'e') return [
    '💪 Her doğru cevap hedefine bir adım daha yaklaştırıyor!',
    '🔥 Bugün çalıştığın her dakika, sınav gününde güç olacak.',
    '✨ Devam et — başarı adım adım inşa edilir.',
    '🦁 Aslanım, bu sınavı fethedeceksin!',
    `🏆 ${seriBilgi}`,
  ];
  return [
    '💪 Her doğru cevap seni hedefe bir adım yaklaştırıyor!',
    '🌟 Bugün çalıştığın her dakika sınav günü gülümsetecek.',
    '✨ Sen bunu başarabilirsin — devam et!',
    '🔥 Seri bozulmasın, bugün en az bir test çöz!',
    `🏆 ${seriBilgi}`,
  ];
}

// ── Home ──
function renderHome() {
  const name = Storage.getActiveUser() || Storage.getUserName() || 'Aday';
  const gender = Storage.getUserGender();
  const overall = Storage.computeOverall();
  const completed = Storage.getCompletedTopics();
  const streak = Storage.getStreak();
  const totalTopics = SUBJECTS.reduce((s, x) => s + (x.data?.konular.length || 0), 0);
  const doneTopics = SUBJECTS.reduce((s, x) => s + (x.data?.konular.filter(t => completed[t.id]).length || 0), 0);

  const motivations = _motivationsFor(gender, streak);
  const motivMsg = motivations[new Date().getDate() % motivations.length];

  const suggestion = Missions.getTodaySuggestion(SUBJECTS);
  const suggestHtml = suggestion ? `
    <div style="margin-top:14px;padding:12px 14px;background:rgba(244,114,182,0.1);border:1px solid rgba(244,114,182,0.25);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
      <span style="font-size:13.5px;color:var(--text-dim)">✨ <b style="color:var(--rose)">Bugün önerilen:</b> ${esc(suggestion.s.icon)} ${esc(suggestion.s.ad)} — <b>${esc(suggestion.t.baslik)}</b></span>
      <button class="btn btn-secondary" style="padding:6px 14px;font-size:12.5px;white-space:nowrap" id="go-suggest">Başla</button>
    </div>` : '';

  const subCards = SUBJECTS.filter(s => s.data).map(s => {
    const cnt = s.data.konular.length;
    const done = s.data.konular.filter(t => completed[t.id]).length;
    const pct = cnt ? Math.round(done / cnt * 100) : 0;
    const avg = Storage.computeSubjectAvg(s.id);
    return `
      <div class="card subject-card" data-sid="${s.id}">
        <div class="subject-icon">${s.icon}</div>
        <div class="subject-name">${esc(s.ad)}</div>
        <div class="progress-wrap" style="margin-bottom:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="subject-meta">
          <div class="progress-label">${done}/${cnt} konu</div>
          <div class="subject-check-ring ${done === cnt && cnt > 0 ? 'done' : ''}">${done === cnt && cnt > 0 ? '✓' : ''}</div>
        </div>
        ${avg !== null ? `<div style="font-size:11.5px;color:var(--text-faint);margin-top:6px">Ort. %${avg}</div>` : ''}
      </div>`;
  }).join('');

  const subAvgs = SUBJECTS.filter(s => s.data).map(s => ({ s, avg: Storage.computeSubjectAvg(s.id) })).filter(x => x.avg !== null);
  const bestSub = subAvgs.length ? subAvgs.reduce((a, b) => a.avg >= b.avg ? a : b) : null;
  const worstSub = subAvgs.length ? subAvgs.reduce((a, b) => a.avg <= b.avg ? a : b) : null;

  const draft = Storage.getDraft();
  const dailyMnemonic = isPremiumUser() ? _dailyMnemonic() : null;
  const widgetHtml = dailyMnemonic ? `
    <div class="card widget-card anim-fade">
      <div class="widget-card-head">🔒 Günün Kilit Ekranı Kodu</div>
      <div class="widget-card-eyebrow">${esc(dailyMnemonic.sad)} • ${esc(dailyMnemonic.tbaslik)}</div>
      <div class="widget-card-text">${esc(dailyMnemonic.text)}</div>
      <div class="widget-card-note">📱 Gerçek kilit ekranı widget'ı mobil (iOS/Android) uygulamasında sunulacak — bu, uygulama içi önizlemesidir.</div>
    </div>` : '';
  const fulltestDone = Storage.getAttempts().filter(a => a.topicId === 'full-test').length;
  const fulltestQuotaHtml = isPremiumUser()
    ? `<div class="fulltest-quota premium">✨ Sınırsız deneme hakkın var</div>`
    : `<div class="fulltest-quota">${Math.max(0, FREE_MAX_FULLTEST_ATTEMPTS - fulltestDone)} / ${FREE_MAX_FULLTEST_ATTEMPTS} deneme hakkın kaldı — <a id="fulltest-premium-link">Premium'da sınırsız</a></div>`;

  setRoot(`
    ${draft ? `
      <div class="draft-banner">
        <p>🔄 Yarım kalan test: <strong>${esc(draft.topicBaslik || 'Deneme')}</strong> — kaldığın yerden devam edebilirsin.</p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-gold" style="padding:7px 14px;font-size:13px" id="resume-btn">Devam Et</button>
          <button class="btn btn-ghost" style="padding:7px 12px;font-size:13px" id="discard-btn">Sil</button>
        </div>
      </div>` : ''}

    <div class="card hero-card anim-fade">
      <div class="hero-greeting">${_heroGreeting(gender, name)}</div>
      <p class="hero-sub">2026 Ortaöğretim KPSS hazırlığında bugün ne çalışmak istersin?</p>
      <div class="hero-plan">${renderPlanPill()} ${isPremiumUser() ? 'Tüm Premium özelliklere erişimin var.' : 'Premium ile günlük görevler, VIP rozet, yanlışlar testi ve daha fazlası açılır.'}</div>
      <div class="hero-motivation">${motivMsg}</div>
      ${suggestHtml}
    </div>

    <div class="card plan-summary-card anim-fade">
      <div class="plan-summary-title">${isPremiumUser() ? 'Premium ayrıcalıkların açık.' : 'Ücretsiz plan kullanıyorsun.'}</div>
      <div class="plan-summary-text">${isPremiumUser() ? 'Canlı online deneme, gelişmiş istatistikler ve özel VIP rozetin gibi özelliklerin aktif.' : 'Premium’a geçerek yanlışlar testi, VIP rozet, sesli özetler ve özel liglere erişebilirsin.'}</div>
    </div>

    ${widgetHtml}

    <div class="stat-grid anim-fade">
      <div class="card stat-card">
        <span class="stat-icon">🎯</span>
        <div class="stat-value">${overall.rate}%</div>
        <div class="stat-label">Genel Başarı</div>
      </div>
      <div class="card stat-card">
        <span class="stat-icon">📝</span>
        <div class="stat-value">${overall.solved}</div>
        <div class="stat-label">Çözülen Soru</div>
      </div>
      <div class="card stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-value">${doneTopics}/${totalTopics}</div>
        <div class="stat-label">Konu</div>
      </div>
      <div class="card stat-card">
        <span class="stat-icon">🔥</span>
        <div class="stat-value">${streak.count}</div>
        <div class="stat-label">Günlük Seri</div>
      </div>
    </div>

    ${bestSub && worstSub ? `
      <div class="card" style="padding:14px 18px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap">
        <div style="font-size:13.5px">🏆 <b style="color:var(--mint)">En iyi dersin:</b> ${esc(bestSub.s.icon)} ${esc(bestSub.s.ad)} (%${bestSub.avg})</div>
        <div style="font-size:13.5px">📌 <b style="color:var(--rose)">Çalışman gereken:</b> ${esc(worstSub.s.icon)} ${esc(worstSub.s.ad)} (%${worstSub.avg})</div>
      </div>` : ''}

    <div class="card full-test-card anim-fade" style="margin-bottom:28px">
      <div class="info">
        <h3>🎯 Tam Deneme Sınavı</h3>
        <p>Gerçek KPSS formatında 120 soru, 130 dakika</p>
        <div class="test-tags">
          <span class="tag">📖 Türkçe 30</span>
          <span class="tag">🔢 Mat. 30</span>
          <span class="tag">🏛️ Tarih 24</span>
          <span class="tag">🗺️ Coğ. 24</span>
          <span class="tag">⚖️ Vat. 8</span>
          <span class="tag">📰 Güncel 4</span>
        </div>
        ${fulltestQuotaHtml}
      </div>
      <button class="btn btn-gold" id="fulltest-btn">Sınava Gir ➜</button>
    </div>

    <div class="section-title">Dersler</div>
    <div class="subject-grid anim-fade">${subCards}</div>

    ${subAvgs.length > 1 ? `
      <div class="section-title" style="margin-top:28px">Ders Başarı Grafiği</div>
      <div class="card" style="padding:24px">
        <div id="subject-chart"></div>
      </div>` : ''}
  `);

  if (subAvgs.length > 1) {
    Charts.barChart('subject-chart', subAvgs.map(x => ({ id: x.s.id, label: x.s.ad, value: x.avg || 0 })));
  }

  document.querySelectorAll('.subject-card').forEach(el => el.addEventListener('click', () => navigate('subject', { sid: el.dataset.sid })));
  $('fulltest-btn')?.addEventListener('click', () => navigate('fulltest'));
  $('fulltest-premium-link')?.addEventListener('click', (e) => { e.stopPropagation(); navigate('premium'); });
  $('resume-btn')?.addEventListener('click', resumeDraft);
  $('discard-btn')?.addEventListener('click', () => { Storage.clearDraft(); render(); });
  $('go-suggest')?.addEventListener('click', () => suggestion && navigate('topic', { sid: suggestion.s.id, tid: suggestion.t.id }));
  $('plan-cta')?.addEventListener('click', openPremiumPage);
}

// ── Subject ──
function renderSubject(sid) {
  const s = sub(sid);
  if (!s || !s.data) return navigate('home');
  const completed = Storage.getCompletedTopics();
  const totalTopicQs = s.data.konular.reduce((sum, t) => sum + (t.sorular?.length || 0), 0);
  const examQCount = s.data.konular.length * SUBJECT_EXAM_Q_PER_TOPIC;
  const examDur = Math.round(Timer.durationFor(examQCount) / 60);

  const rows = s.data.konular.map(t => {
    const done = !!completed[t.id];
    const best = Storage.getBestScore(t.id);
    const badgeCls = best === null ? '' : best >= 70 ? 'high' : best < 50 ? 'low' : '';
    return `
      <div class="card topic-row" data-tid="${t.id}">
        <div class="topic-left">
          <div class="topic-check ${done ? 'done' : ''}">${done ? '✓' : ''}</div>
          <div>
            <div class="topic-title">${esc(t.baslik)}</div>
            <div class="topic-meta">${t.sorular?.length || 0} soru • ${best !== null ? '%' + best + ' en iyi' : 'Henüz çözülmedi'}</div>
          </div>
        </div>
        <div class="topic-row-right">
          ${best !== null ? `<span class="score-badge ${badgeCls}">%${best}</span>` : ''}
          <span style="color:var(--text-faint);font-size:18px">›</span>
        </div>
      </div>`;
  }).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="home">Anasayfa</span><span class="sep">›</span><span>${esc(s.ad)}</span></div>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 6px">${s.icon} ${esc(s.ad)}</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:16px">${s.data.konular.length} konu • Sırayla çalışmanı öneririz, ama istediğin konudan başlayabilirsin.</p>

    <!-- Ders Sınavı Kartı -->
    <div class="card" style="padding:16px 20px;margin-bottom:20px;background:rgba(167,139,250,0.07);border-color:rgba(167,139,250,0.3);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:15px;font-weight:700;margin-bottom:4px">📝 ${esc(s.ad)} Sınavı</div>
        <div style="font-size:13px;color:var(--text-faint)">${examQCount} soru (her konudan ${SUBJECT_EXAM_Q_PER_TOPIC}) • ~${examDur} dakika</div>
      </div>
      <button class="btn btn-primary" id="subjectexam-btn">Sınava Gir ➜</button>
    </div>

    <div class="topic-list">${rows}</div>
  `);

  document.querySelectorAll('.crumb').forEach(el => el.dataset.go === 'home' && el.addEventListener('click', () => navigate('home')));
  document.querySelectorAll('.topic-row').forEach(el => el.addEventListener('click', () => navigate('topic', { sid, tid: el.dataset.tid })));
  $('subjectexam-btn')?.addEventListener('click', () => navigate('subjectexam', { sid }));
}

// ── Topic ──
function renderTopic(sid, tid) {
  const s = sub(sid); if (!s?.data) return navigate('home');
  const t = topic(s, tid); if (!t) return navigate('subject', { sid });
  const a = t.anlatim || {};
  const qCount = t.sorular?.length || 0;
  const poolSize = Math.min(qCount, 10);
  const dur = Math.round(Timer.durationFor(poolSize) / 60);
  const ytUrl = `https://www.youtube.com/results?search_query=KPSS+${encodeURIComponent(t.baslik)}+konu+anlat%C4%B1m%C4%B1`;
  const attempts = Storage.getAttemptsForTopic(tid);
  const attCount = attempts.length;
  const premium = isPremiumUser();
  const maxAtt = maxAttemptsPerTopic();
  const maxed = attCount >= maxAtt;

  const pointsHtml = (a.anahtarNoktalar || []).map(p => `<li>${esc(p)}</li>`).join('');
  const parasHtml = (a.icerik || []).map(p => `<p class="lecture-para">${esc(p)}</p>`).join('');

  const historyHtml = attempts.length ? `
    <div class="section-title" style="margin-top:22px">📊 Geçmiş Testlerin</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${attempts.map((a, i) => {
    const d = new Date(a.tarih).toLocaleDateString('tr-TR');
    const cls = a.skor >= 70 ? 'high' : a.skor < 50 ? 'low' : '';
    return `
          <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:14px">
            <div style="font-weight:700;color:var(--text-faint);font-size:13px">${i + 1}. Test</div>
            <div style="flex:1;font-size:13.5px;color:var(--text-dim)">${d} • ${a.dogru} doğru / ${a.yanlis} yanlış</div>
            <span class="score-badge ${cls}">%${a.skor}</span>
          </div>`;
  }).join('')}
    </div>` : '';

  const startBar = maxed ? `
    <div class="card" style="padding:18px 22px;background:rgba(251,191,36,0.08);border-color:rgba(251,191,36,0.3)">
      <p style="margin:0 0 12px;font-size:14px;color:var(--text-dim)">
        🎓 Ücretsiz pakette bu konuyu <b>${maxAtt} kez</b> çözdün. Sınırsız test için Premium'a geç ya da sıfırlayıp yeniden başla.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-gold" id="reset-btn">🔄 Testleri Sıfırla</button>
        <button class="btn btn-primary" id="topic-go-premium">💎 Premium'a Geç</button>
      </div>
    </div>` : `
    <div class="card start-bar">
      <div class="start-info">
        ${qCount} soruluk havuz &nbsp;•&nbsp; her seferinde farklı 10 soru &nbsp;•&nbsp;
        <b>${premium ? 'Sınırsız test hakkın var ✨' : `${maxAtt - attCount} hak kaldı`}</b>
      </div>
      <button class="btn btn-primary" id="start-btn">
        ${attCount > 0 ? 'Tekrar Çöz →' : 'Teste Başla →'}
      </button>
    </div>`;

  setRoot(`
    <div class="breadcrumb">
      <span class="crumb" data-go="home">Anasayfa</span><span class="sep">›</span>
      <span class="crumb" data-go="sub">${esc(s.ad)}</span><span class="sep">›</span>
      <span>${esc(t.baslik)}</span>
    </div>
    <div class="topic-eyebrow">${esc(s.ad)} • Konu Anlatımı</div>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 18px">${esc(t.baslik)}</h2>

    <div class="card lecture-card">
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
        <button class="btn ${premium ? 'btn-secondary' : 'btn-ghost'}" id="tts-btn" style="padding:8px 16px;font-size:13px">
          ${premium ? '🎧 Sesli Dinle' : '🔒 Sesli Özet (Premium)'}
        </button>
      </div>
      ${a.ozet ? `<div class="lecture-ozet">${esc(a.ozet)}</div>` : ''}
      ${parasHtml}
      ${pointsHtml ? `<ul class="lecture-points">${pointsHtml}</ul>` : ''}
      <a class="yt-link" id="yt-link" target="_blank">▶ YouTube'da "${esc(t.baslik)}" ara</a>
    </div>

    ${historyHtml}
    ${startBar}
  `);

  $('yt-link').href = ytUrl;
  document.querySelectorAll('.crumb').forEach(el => {
    if (el.dataset.go === 'home') el.addEventListener('click', () => navigate('home'));
    if (el.dataset.go === 'sub') el.addEventListener('click', () => navigate('subject', { sid }));
  });
  $('start-btn')?.addEventListener('click', () => {
    const qs = pickQuestions(t.sorular, 10, tid);
    beginQuiz(sid, s.ad, tid, t.baslik, qs, false);
  });
  $('tts-btn')?.addEventListener('click', () => {
    if (!premium) { navigate('premium'); return; }
    if (!('speechSynthesis' in window)) { toast('Tarayıcın sesli okumayı desteklemiyor.', 'error'); return; }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      $('tts-btn').textContent = '🎧 Sesli Dinle';
      return;
    }
    const text = [t.baslik, a.ozet, ...(a.icerik || [])].filter(Boolean).join('. ');
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'tr-TR';
    utter.rate = 0.98;
    utter.onend = () => { const b = $('tts-btn'); if (b) b.textContent = '🎧 Sesli Dinle'; };
    speechSynthesis.speak(utter);
    $('tts-btn').textContent = '⏹ Durdur';
  });
  $('topic-go-premium')?.addEventListener('click', () => navigate('premium'));
  $('reset-btn')?.addEventListener('click', () => {
    Storage.resetTopicAttempts(tid);
    toast('Test hakları sıfırlandı!', 'success');
    renderTopic(sid, tid);
  });
}

// ── Subject Exam ──
function startSubjectExam(sid) {
  const s = sub(sid);
  if (!s?.data) { navigate('home'); return; }

  const allQs = [];
  s.data.konular.forEach(t => {
    const pool = (t.sorular || []);
    const picked = pickQuestions(pool, SUBJECT_EXAM_Q_PER_TOPIC, null); // no used-q tracking for exams
    picked.forEach(q => allQs.push({ ...q, _topicBaslik: t.baslik }));
  });

  if (allQs.length < 3) { toast('Yeterli soru yüklenemedi.', 'error'); navigate('subject', { sid }); return; }

  const examId = sid + '-sinav';
  const examTitle = s.ad + ' Sınavı';
  beginQuiz(sid, s.ad, examId, examTitle, allQs, false);
}

// ── Full Test ──
function startFullTest() {
  if (!isPremiumUser()) {
    const doneCount = Storage.getAttempts().filter(a => a.topicId === 'full-test').length;
    if (doneCount >= FREE_MAX_FULLTEST_ATTEMPTS) {
      toast(`Ücretsiz pakette ${FREE_MAX_FULLTEST_ATTEMPTS} deneme hakkın var. Sınırsız deneme için Premium'a geç.`, 'error', 4000);
      navigate('premium');
      return;
    }
  }

  const allQs = [];
  SUBJECTS.forEach(s => {
    if (!s.data) return;
    const n = FULL_TEST_DIST[s.id] || 0;
    if (!n) return;
    const pool = [];
    s.data.konular.forEach(t => (t.sorular || []).forEach(q => pool.push({ ...q, _sid: s.id, _sad: s.ad })));
    allQs.push(...pickQuestions(pool, n, `full-${s.id}`));
  });

  if (allQs.length < 10) { toast('Yeterli soru yüklenemedi. Lütfen bekleyin.', 'error'); navigate('home'); return; }

  beginQuiz('full', 'Genel Deneme', 'full-test', '120 Soruluk Deneme Sınavı', allQs, true);
}

// ── Begin quiz (with draft check) ──
function beginQuiz(sid, sad, tid, tbaslik, questions, isFullTest) {
  Timer.stop();
  const draft = Storage.getDraft();
  if (draft && draft.topicId === tid && draft.answers) {
    if (confirm(`"${tbaslik}" için yarım kalan testine devam etmek ister misin?`)) {
      Quiz.restoreFromDraft(draft);
      _perqTimerIndex = -1; _perqRemaining = [];
      navigate('quiz'); // renderQuizView timer'ı başlatır
      const _sd = Storage.getSettings();
      if (_sd.timerMode !== 'perq') Timer.start(draft.durationSec, updateTimer, () => finishQuiz());
      return;
    }
    Storage.clearDraft();
  }
  Quiz.start(sid, sad, tid, tbaslik, questions, isFullTest);
  _perqTimerIndex = -1; _perqRemaining = [];
  navigate('quiz'); // renderQuizView timer'ı başlatır
  const _s = Storage.getSettings();
  if (_s.timerMode !== 'perq') Timer.start(Quiz.getState().durationSec, updateTimer, () => finishQuiz());
}

function resumeDraft() {
  const draft = Storage.getDraft();
  if (!draft) return;
  Quiz.restoreFromDraft(draft);
  _perqTimerIndex = -1; _perqRemaining = [];
  navigate('quiz');
  const _sd = Storage.getSettings();
  if (_sd.timerMode !== 'perq') Timer.start(draft.durationSec, updateTimer, () => finishQuiz());
}

// ── Quiz ──
function updateTimer(rem) {
  const el = $('quiz-timer');
  if (!el) return;
  el.textContent = Timer.format(rem);
  el.classList.toggle('warning', rem <= 60);
  el.classList.toggle('danger', rem <= 5);
  // Son 5 saniye tik-tak sesi
  if (rem <= 5 && rem > 0) Sounds.tick();
}

function renderQuizView() {
  const st = Quiz.getState();
  if (!st) { navigate('home'); return; }
  const q = st.questions[st.currentIndex];
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const _qs = Storage.getSettings();

  // Gösterilecek süreyi DOM'u oluşturmadan ÖNCE belirle — böylece her render'da
  // (şık seçme dahil) ekranda kısa süreliğine yanlış bir değer (ör. testin toplam süresi) görünmez.
  const isNewPerqQuestion = _qs.timerMode === 'perq' && _perqTimerIndex !== st.currentIndex;
  let displaySecs;
  if (_qs.timerMode === 'perq') {
    const secsPerQ = Number(_qs.secsPerQ) || 65;
    if (_perqRemaining.length !== st.questions.length) _perqRemaining = st.questions.map(() => secsPerQ);
    displaySecs = isNewPerqQuestion ? (_perqRemaining[st.currentIndex] ?? secsPerQ) : Timer.getRemaining();
  } else {
    displaySecs = Timer.getRemaining() || st.durationSec;
  }

  // Soru başına süre modunda, bu sorunun süresi daha önce dolduysa artık cevap değiştirilemez
  const isExpiredQuestion = _qs.timerMode === 'perq' && displaySecs <= 0;

  const dots = st.questions.map((_, i) => `
    <div class="q-dot ${st.answers[i] !== null ? 'answered' : ''} ${i === st.currentIndex ? 'current' : ''}" data-i="${i}">${i + 1}</div>
  `).join('');

  const opts = q.secenekler.map((o, i) => `
    <div class="q-opt ${st.answers[st.currentIndex] === i ? 'selected' : ''} ${isExpiredQuestion ? 'locked' : ''}" data-oi="${i}">
      <div class="opt-letter">${letters[i]}</div>
      <div class="opt-text">${esc(o)}</div>
    </div>`).join('');

  const topicTag = q._topicBaslik ? `<span style="font-size:11px;color:var(--violet);margin-left:8px;opacity:.7">[${esc(q._topicBaslik)}]</span>` : '';
  const kaynak = q.kaynak ? `<span style="font-size:11px;color:var(--text-faint);margin-left:8px">${esc(q.kaynak)}</span>` : '';
  const expiredWarning = isExpiredQuestion
    ? `<div class="q-expired-warning">⏱️ Bu sorunun süresi doldu — cevabını artık değiştiremezsin.</div>`
    : '';

  setRoot(`
    <div class="quiz-header">
      <div>
        <div class="quiz-meta"><b>${esc(st.subjectAd)}</b> • ${esc(st.topicBaslik)}</div>
        <div class="quiz-meta">Soru <b>${st.currentIndex + 1}</b> / ${st.questions.length}</div>
      </div>
      <div class="quiz-timer" id="quiz-timer">${Timer.format(displaySecs)}</div>
    </div>
    <div class="quiz-dots">${dots}</div>
    ${expiredWarning}
    <div class="card q-card">
      <div class="q-number">Soru ${st.currentIndex + 1}${topicTag}${kaynak}</div>
      <div class="q-text">${esc(q.soru)}</div>
      <div class="q-options">${opts}</div>
    </div>
    <div class="quiz-nav">
      <div class="quiz-nav-left">
        <button class="btn btn-ghost" id="q-prev" ${st.currentIndex === 0 ? 'disabled' : ''}>← Önceki</button>
        <button class="btn btn-primary" id="q-finish">Testi Bitir</button>
      </div>
      <div class="quiz-nav-right">
        ${st.currentIndex < st.questions.length - 1 ? `<button class="btn btn-secondary" id="q-next">Sonraki →</button>` : ''}
      </div>
    </div>
  `);

  document.querySelectorAll('.q-dot').forEach(el => el.addEventListener('click', () => { Quiz.goTo(Number(el.dataset.i)); renderQuizView(); }));
  document.querySelectorAll('.q-opt').forEach(el => el.addEventListener('click', () => {
    if (isExpiredQuestion) return;
    const oi = Number(el.dataset.oi);
    const already = Quiz.getState().answers[Quiz.getState().currentIndex];
    Quiz.answer(already === oi ? null : oi);
    renderQuizView();
  }));
  $('q-prev')?.addEventListener('click', () => { Quiz.prev(); renderQuizView(); });
  $('q-next')?.addEventListener('click', () => { Quiz.next(); renderQuizView(); });
  $('q-finish')?.addEventListener('click', () => {
    const unanswered = Quiz.getState().answers.filter(a => a === null).length;
    if (unanswered > 0 && !confirm(`${unanswered} soru boş. Yine de bitirmek istiyor musun?`)) return;
    finishQuiz();
  });

  // Soru başına geri sayım modu — sadece gerçekten yeni bir soruya geçildiğinde yeniden başlat
  // (şık seçmek/değiştirmek renderQuizView'i tekrar çağırır ama süreyi sıfırlamamalı).
  // Önceki soruya dönülürse, o sorunun kaldığı süreden devam eder.
  if (isNewPerqQuestion) {
    if (_perqTimerIndex !== -1 && _perqTimerIndex < _perqRemaining.length) {
      _perqRemaining[_perqTimerIndex] = Timer.getRemaining();
    }
    _perqTimerIndex = st.currentIndex;
    Timer.stop();
    Sounds.resetTickPhase();
    Timer.start(displaySecs, updateTimer, () => {
      const _st = Quiz.getState();
      if (!_st) return;
      if (_st.currentIndex < _st.questions.length - 1) {
        Quiz.next();
        renderQuizView();
      } else {
        finishQuiz();
      }
    });
  }
}

// ── Finish quiz ──
async function finishQuiz() {
  const st = Quiz.getState();
  if (!st) return;
  const elapsed = Math.round((Date.now() - st.startedAt) / 1000);
  Timer.stop();
  const result = Quiz.finish(elapsed);
  Storage.addAttempt({ ...result });

  // Konu testi ise kullanılan soruları kaydet
  if (result.topicId && result.topicId !== 'full-test' && !result.topicId.endsWith('-sinav')) {
    const usedKeys = result.review.map(r => r.soru.slice(0, 50));
    Storage.addUsedQuestions(result.topicId, usedKeys);
  }

  // Tam deneme ise ders bazlı kullanılan soruları kaydet (bir sonraki denemede farklı sorular gelsin)
  if (result.topicId === 'full-test') {
    const bySubject = {};
    st.questions.forEach((q, i) => {
      const sid = q._sid;
      if (!sid) return;
      if (!bySubject[sid]) bySubject[sid] = [];
      bySubject[sid].push(result.review[i].soru.slice(0, 50));
    });
    Object.keys(bySubject).forEach(sid => Storage.addUsedQuestions(`full-${sid}`, bySubject[sid]));
  }

  if (result.skor === 100 || result.skor >= 60) Storage.markTopicCompleted(result.topicId);

  postResultChecks(result);
  await Leaderboard.submitResult(result);

  navigate('result', { result });
}

// ── Result ──
function renderResult(result) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const name = Storage.getActiveUser() || Storage.getUserName() || 'Aday';
  const gender = Storage.getUserGender();
  const title = _titleFor(gender, name);

  function msg(skor) {
    if (gender === 'k') {
      if (skor >= 85) return `Prenses ${name}, muhteşemsin! 👸✨ Bu konuyu tamamen kavramışsın, canım!`;
      if (skor >= 70) return `Aferin güzelim! 💜 Küçük eksiklerini gider, bu konu senin prenses!`;
      if (skor >= 50) return `Fena değil, kraliçem! 🌸 Biraz daha çalışırsan harika olacaksın.`;
      return `Üzülme canım, bu konu biraz zorluyordu! 🤗 Anlatımı tekrar oku, sen yaparsın prenses!`;
    }
    if (gender === 'e') {
      if (skor >= 85) return `Aslanım ${name}, muhteşemsin! 🦁💥 Bu konuyu tamamen kavramışsın!`;
      if (skor >= 70) return `Aferin ${name}! 💪 Harika iş çıkardın, küçük eksiklerini tamamla!`;
      if (skor >= 50) return `Fena değil ${name}! 🔥 Biraz daha çalışırsan harika olacaksın.`;
      return `Üzülme ${name}, bu konu biraz zorluyordu! 💪 Anlatımı tekrar oku ve yeniden dene — sen yaparsın!`;
    }
    if (skor >= 85) return `${name}, muhteşem! 🌟 Bu konuyu tamamen kavramışsın!`;
    if (skor >= 70) return `${name}, çok iyi! 💪 Küçük eksiklerini gider, bu konu sende!`;
    if (skor >= 50) return `${name}, fena değil! 🌱 Biraz daha çalışırsan harika olacaksın.`;
    return `${name}, bu konu biraz zorluyordu ama sorun değil! 🤗 Anlatımı tekrar oku ve yeniden dene.`;
  }

  const reviewHtml = result.review.map((r, i) => {
    const opts = r.secenekler.map((o, idx) => {
      let cls = '';
      if (idx === r.dogruIndex) cls = 'is-correct';
      else if (idx === r.verilenIndex) cls = 'is-wrong';
      return `<div class="review-opt ${cls}">${letters[idx]}) ${esc(o)}</div>`;
    }).join('');

    const distractorHtml = (r.status === 'yanlis' && r.distractorAciklama)
      ? (isPremiumUser()
        ? `<div class="review-distractor"><b>🤔 Büyük ihtimalle neden seçtin?</b> ${esc(r.distractorAciklama)}</div>`
        : `<div class="review-lock">Premium kullanıcılar için detaylı yanılgı analizi burada gösterilir.</div>`)
      : '';

    return `
      <div class="card review-item ${r.status}">
        <div class="review-head">
          <span class="review-badge ${r.status}">${r.status === 'dogru' ? 'Doğru ✓' : r.status === 'yanlis' ? 'Yanlış ✗' : 'Boş'}</span>
          <span class="review-qnum">Soru ${i + 1}${r.kaynak ? ` • ${esc(r.kaynak)}` : ''}</span>
        </div>
        <div class="review-q">${esc(r.soru)}</div>
        ${opts}
        <div class="review-explain">💡 ${esc(r.aciklama)}</div>
        ${distractorHtml}
      </div>`;
  }).join('');

  const isTopicTest = result.topicId && result.topicId !== 'full-test' && !result.topicId.endsWith('-sinav');
  const isSubjectExam = result.topicId && result.topicId.endsWith('-sinav');

  setRoot(`
    <div class="card result-hero anim-bounce">
      <div class="score-ring" style="--score-pct:${result.skor * 3.6}deg">
        <div class="score-num">%${result.skor}</div>
      </div>
      <div class="result-topic">${esc(result.subjectAd)} • ${esc(result.topicBaslik)}</div>
      <div class="result-msg">${esc(msg(result.skor))}</div>
      <div class="result-stats">
        <div class="res-stat dogru"><div class="res-stat-val">${result.dogru}</div><div class="res-stat-lbl">Doğru ✓</div></div>
        <div class="res-stat yanlis"><div class="res-stat-val">${result.yanlis}</div><div class="res-stat-lbl">Yanlış ✗</div></div>
        <div class="res-stat bos"><div class="res-stat-val">${result.bos}</div><div class="res-stat-lbl">Boş —</div></div>
      </div>
      <div class="result-kpss">
        ${(() => {
      const k = computeKpssPoints(result);
      return `<div class="kpss-axis">Net: ${k.net.toFixed(2)}</div>
          <div class="kpss-scores">
            <div><strong>P3</strong> ${k.p3}</div>
            <div><strong>P93</strong> ${k.p93}</div>
            <div><strong>P94</strong> ${k.p94}</div>
          </div>`;
    })()}
      </div>
      <div class="result-actions">
        ${isTopicTest ? `<button class="btn btn-secondary" id="r-topic">Konuya Dön</button>` : ''}
        ${isSubjectExam ? `<button class="btn btn-secondary" id="r-subject">Derse Dön</button>` : ''}
        <button class="btn btn-ghost" id="r-retry">Tekrar Çöz</button>
        <button class="btn btn-primary" id="r-home">Anasayfa</button>
        <button class="btn btn-ghost" id="r-badges" style="border-color:rgba(251,191,36,0.4);color:var(--gold)">🎖 Rozetler</button>
      </div>
    </div>
    <div class="section-title">Soru Soru Değerlendirme</div>
    <div class="review-list">${reviewHtml}</div>
  `);

  $('r-topic')?.addEventListener('click', () => navigate('topic', { sid: result.subjectId, tid: result.topicId }));
  $('r-subject')?.addEventListener('click', () => navigate('subject', { sid: result.subjectId }));
  $('r-retry')?.addEventListener('click', () => {
    if (result.topicId === 'full-test') { navigate('fulltest'); return; }
    if (isSubjectExam) { navigate('subjectexam', { sid: result.subjectId }); return; }
    const s2 = sub(result.subjectId);
    const t2 = s2 && topic(s2, result.topicId);
    if (t2) {
      const attempts = Storage.getAttemptsForTopic(result.topicId);
      if (attempts.length >= maxAttemptsPerTopic()) { toast('Bu konu için maksimum test hakkını kullandın. Konuya git ve sıfırla.', 'error', 4000); return; }
      beginQuiz(result.subjectId, result.subjectAd, result.topicId, result.topicBaslik, pickQuestions(t2.sorular, 10, result.topicId), false);
    }
  });
  $('r-home')?.addEventListener('click', () => navigate('home'));
  $('r-badges')?.addEventListener('click', () => { navigate('badges'); setActiveNav('nav-badges'); });
}

// ── Leaderboard ──
async function renderLeaderboard() {
  setRoot(`<div class="empty"><span class="empty-icon">🏆</span><p>Sıralama yükleniyor...</p></div>`);
  const list = await Leaderboard.getTopList(30);
  const myName = Storage.getUserName();
  const isOnline = Leaderboard.isOnline();

  if (!isOnline) {
    setRoot(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">🏆 Sıralama</h2>
      <div class="card" style="padding:22px 24px;margin-bottom:20px;border-color:rgba(251,191,36,0.3)">
        <p style="margin:0;font-size:14px;color:var(--text-dim)">🔌 <b style="color:var(--warn)">Çevrimdışı mod</b> — Diğer kullanıcılarla karşılaştırabilmek için <b>Ayarlar</b>'dan bir Firebase URL gir (ücretsiz, 2 dk kurulum).</p>
        <button class="btn btn-secondary" style="margin-top:12px" id="go-settings">⚙️ Ayarlara Git</button>
      </div>
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--text-faint)">Kendi skorların</h3>
      ${renderLocalScores()}
    `);
    $('go-settings')?.addEventListener('click', () => navigate('settings'));
    return;
  }

  const rows = list.map((entry, i) => {
    const rank = i + 1;
    const rankCls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const isMe = entry.name === myName;
    return `
      <div class="lb-row">
        <div class="lb-rank ${rankCls}">${rankEmoji}</div>
        <div class="lb-name">${esc(entry.name)}${isMe ? '<span class="lb-you">Sen</span>' : ''}</div>
        <div>
          <div class="lb-score">%${entry.skor}</div>
          <div class="lb-detail">${esc(entry.subject || 'Deneme')} • ${entry.dogru}D/${entry.yanlis}Y</div>
        </div>
      </div>`;
  }).join('');

  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 18px">🏆 Sıralama</h2>
    <div class="card" style="padding:6px 8px">${rows || '<div class="lb-status">Henüz skor yok. İlk testi çöz!</div>'}</div>
  `);
}

function renderLocalScores() {
  const attempts = Storage.getAttempts().slice(-10).reverse();
  if (!attempts.length) return '<div class="lb-status">Henüz çözülen test yok.</div>';
  return `<div class="card" style="padding:6px 8px">${attempts.map((a, i) => `
    <div class="lb-row">
      <div class="lb-rank">${i + 1}</div>
      <div class="lb-name">${esc(a.topicBaslik || 'Test')}</div>
      <div><div class="lb-score">%${a.skor}</div><div class="lb-detail">${a.dogru}D/${a.yanlis}Y</div></div>
    </div>`).join('')}</div>`;
}

// ── Badges ──
function renderBadges() {
  const all = Badges.getAll();
  const items = all.map(b => {
    const unlocked = Storage.isBadgeUnlocked(b.id);
    return `
      <div class="card badge-item ${unlocked ? 'unlocked' : ''}">
        <span class="badge-icon ${unlocked ? '' : 'locked'}">${b.icon}</span>
        <div class="badge-name" style="${unlocked ? '' : 'color:var(--text-faint)'}">${esc(b.name)}</div>
        <div class="badge-desc">${esc(b.desc)}</div>
        ${unlocked ? '<div style="font-size:10px;color:var(--mint);margin-top:4px;font-weight:700">Kazanıldı ✓</div>' : ''}
      </div>`;
  }).join('');

  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🎖 Rozetler</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:22px">${Storage.getUnlockedBadges().length} / ${all.length} kazanıldı</p>
    <div class="badges-grid">${items}</div>
  `);
}

// ── Wrong Bank ──
function renderWrongBank() {
  if (!isPremiumUser()) {
    setRoot(`
      <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🔒 Yanlışlarım</h2>
      <div class="card locked-card" style="padding:24px;text-align:left;">
        <p style="margin:0 0 14px;font-size:14.5px;color:var(--text-dim)">Bu bölüm sadece Premium kullanıcılar için aktif.</p>
        <p style="margin:0 0 18px;color:var(--text-faint);line-height:1.7">Yanlış soruların özel testlerine erişmek, hatalarını hedeflemek ve hata analizini derinleştirmek için Premium planına geç.</p>
        <button class="btn btn-primary" id="go-premium">Premium’a Geç</button>
      </div>
    `);
    $('go-premium')?.addEventListener('click', () => navigate('premium'));
    return;
  }

  const bank = Storage.getWrongBank();
  if (!bank.length) {
    setRoot(`<div class="empty"><span class="empty-icon">🌟</span><p>Yanlış sorular bankan boş! Harika gidiyorsun.</p></div>`);
    return;
  }

  const grouped = {};
  bank.forEach(q => { (grouped[q.subjectAd] = grouped[q.subjectAd] || []).push(q); });

  const summary = Object.entries(grouped).map(([sad, qs]) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px" class="card" style="margin-bottom:8px">
      <div style="font-weight:700">${esc(sad)}</div>
      <div style="color:var(--danger);font-weight:700">${qs.length} yanlış</div>
    </div>`).join('');

  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">❌ Yanlışlarım</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:18px">${bank.length} soru birikmiş</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">${summary}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-primary" id="wb-test">Yanlışlarımı Sına →</button>
      <button class="btn btn-danger" id="wb-clear">Bankayı Temizle</button>
    </div>
  `);

  $('wb-test').addEventListener('click', () => {
    const qs = [...bank].sort(() => Math.random() - 0.5).slice(0, 20);
    beginQuiz('wrong', 'Yanlışlarım', 'wrong-bank', 'Yanlışlar Testi', qs, false);
  });
  $('wb-clear').addEventListener('click', () => {
    if (confirm('Tüm yanlış soru bankasını temizlemek istiyor musun?')) {
      Storage.clearWrongBank();
      toast('Yanlış soru bankası temizlendi.', 'success');
      renderWrongBank();
    }
  });
}

// ── Premium kilit ekranı (ortak) ──
function renderLockedFeature(title, desc) {
  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🔒 ${esc(title)}</h2>
    <div class="card locked-card" style="padding:24px;text-align:left;">
      <p style="margin:0 0 18px;color:var(--text-faint);line-height:1.7">${esc(desc)}</p>
      <button class="btn btn-primary" id="lock-go-premium">Premium’a Geç</button>
    </div>
  `);
  $('lock-go-premium')?.addEventListener('click', () => navigate('premium'));
}

// ── Oyunlar Hub (eski adıyla "Araçlar") ──
function renderToolsHub() {
  const premium = isPremiumUser();
  const cg = Storage.getCardGameState();
  const cgLeft = premium ? '∞' : Math.max(0, FREE_CARDGAME_DAILY - cg.plays);
  const g2 = Storage.getGamePlayState('cardgame2');
  const g2Left = premium ? '∞' : Math.max(0, FREE_GAME_DAILY - g2.plays);
  const solP = Storage.getGamePlayState('solitaire');
  const solLeft = premium ? '∞' : Math.max(0, FREE_GAME_DAILY - solP.plays);

  const games = [
    { id: 'cardgame', icon: '🃏', title: 'Kart Eşleştirme Oyunu', desc: premium ? 'Sınırsız oyna.' : `Bugün ${cgLeft} hakkın kaldı.`, locked: false },
    { id: 'cardgame2', icon: '🃏', title: 'Kart Oyunu V2', desc: 'Ders/konu seç, açık kartları eşleştir. ' + (premium ? 'Sınırsız oyna.' : `Bugün ${g2Left} hakkın kaldı.`), locked: false },
    { id: 'solitaire', icon: '🂡', title: 'Solitaire', desc: 'Ders/konu seç, kartları sırayla temizle. ' + (premium ? 'Sınırsız oyna.' : `Bugün ${solLeft} hakkın kaldı.`), locked: false },
  ];

  const tools = [
    { id: 'mnemonics', icon: '🧠', title: 'Akılda Kalıcı Kodlama', desc: 'Konuların kısa, şifreli özetleriyle hızlı tekrar.', locked: !premium },
    { id: 'predictor', icon: '🎯', title: 'Bugün Sınava Girsen Kaç Alırsın?', desc: 'Geçmiş performansına göre tahmini puan.', locked: !premium },
    { id: 'league', icon: '🏆', title: 'Özel Lig', desc: 'Başarı seviyene göre lig rütbeni gör.', locked: !premium },
    { id: 'stopwatch', icon: '⏱️', title: 'Çalışma Kronometresi', desc: 'Ders bazlı çalışma sürelerini kaydet ve analiz et.', locked: !premium },
    { id: 'mentor', icon: '🎓', title: 'Mentörlük Seansları', desc: 'Sınav stratejileri ve haftalık plan önerileri.', locked: !premium },
  ];

  const cardHtml = it => `
    <div class="card premium-item tools-item" data-go="${it.id}" data-locked="${it.locked}" style="cursor:pointer">
      <div class="premium-icon">${it.locked ? '🔒' : it.icon}</div>
      <div class="premium-title">${esc(it.title)}</div>
      <div class="premium-desc">${esc(it.desc)}</div>
    </div>`;

  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🎮 Oyunlar</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:20px">Çalışmanı güçlendirecek oyunlar ve ekstra araçlar.</p>

    <div class="section-title">🎮 Oyunlar</div>
    <div class="premium-grid" style="margin-bottom:26px">${games.map(cardHtml).join('')}</div>

    <div class="section-title">🧰 Diğer Araçlar</div>
    <div class="premium-grid">${tools.map(cardHtml).join('')}</div>

    <div class="section-title" style="margin-top:28px">🎧 Sınav Ortamı Odaklanma Sesleri</div>
    <div class="card" style="padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div style="font-size:13.5px;color:var(--text-dim)">${premium ? 'Sınav salonu atmosferi sesleriyle odaklan: kağıt hışırtısı, sayfa çevirme, hafif fon uğultusu.' : 'Premium ile sınav salonu odaklanma sesleri açılır.'}</div>
      ${premium ? `<button class="btn btn-secondary" id="focus-toggle">${Sounds.isFocusPlaying() ? '⏸ Durdur' : '▶ Başlat'}</button>` : `<button class="btn btn-primary" id="focus-premium">Premium’a Geç</button>`}
    </div>
  `);

  document.querySelectorAll('.tools-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.locked === 'true') { navigate('premium'); return; }
      navigate(el.dataset.go);
    });
  });
  $('focus-premium')?.addEventListener('click', () => navigate('premium'));
  $('focus-toggle')?.addEventListener('click', () => {
    if (Sounds.isFocusPlaying()) { Sounds.stopFocusAmbience(); }
    else { Sounds.startFocusAmbience(); }
    renderToolsHub();
  });
}

// ── Kart Eşleştirme Oyunu ──
const FREE_CARDGAME_DAILY = 3;

function renderCardGame() {
  const premium = isPremiumUser();
  const cg = Storage.getCardGameState();
  if (!premium && cg.plays >= FREE_CARDGAME_DAILY) {
    renderLockedFeature('Kart Eşleştirme Oyunu', `Bugünkü ${FREE_CARDGAME_DAILY} ücretsiz hakkını kullandın. Yarın tekrar oynayabilir ya da Premium'a geçip sınırsız oynayabilirsin.`);
    return;
  }
  const availableSubjects = SUBJECTS.filter(s => s.data);
  CardGame.start(availableSubjects, 6);
  Storage.useCardGamePlay();
  renderCardGameBoard();
}

function renderCardGameBoard() {
  const st = CardGame.getState();
  if (!st || !st.cards.length) {
    setRoot(`<div class="empty"><span class="empty-icon">🃏</span><p>Kart havuzu için önce ders içeriklerinin yüklenmesini bekle.</p></div>`);
    return;
  }
  const premium = isPremiumUser();
  const remaining = premium ? '∞' : Math.max(0, FREE_CARDGAME_DAILY - Storage.getCardGameState().plays);

  const cardsHtml = st.cards.map((c, i) => {
    const flippedNow = st.flipped.includes(i) || c.matched;
    return `<button class="match-card ${flippedNow ? 'flipped' : ''} ${c.matched ? 'matched' : ''}" data-i="${i}">
      ${flippedNow ? esc(c.text) : '❓'}
    </button>`;
  }).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Kart Eşleştirme</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🃏 Kart Eşleştirme Oyunu</h2>
    <p style="font-size:13px;color:var(--text-faint);margin-bottom:16px">Terimi tanımıyla eşleştir. Hamle: <b>${st.moves}</b>${premium ? '' : ` • Kalan günlük hakkın: <b>${remaining}</b>`}</p>
    <div class="match-grid">${cardsHtml}</div>
    <div style="margin-top:18px"><button class="btn btn-ghost" id="cg-new">🔄 Yeni Oyun</button></div>
  `);

  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
  document.querySelectorAll('.match-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      const res = CardGame.flip(i);
      if (!res || res.status === 'ignored') return;
      renderCardGameBoard();
      if (res.status === 'match') Sounds.click();
      if (res.status === 'pending-nomatch') {
        setTimeout(() => { CardGame.clearPending(); renderCardGameBoard(); }, 900);
      }
      if (CardGame.isComplete()) {
        setTimeout(() => toast('🎉 Tebrikler, tüm kartları eşleştirdin!', 'success', 3500), 300);
      }
    });
  });
  $('cg-new')?.addEventListener('click', () => navigate('cardgame'));
}

// ── Ders/Konu bazlı oyunlar (Kart Oyunu V2, Solitaire): ortak seçim ekranları ──
const FREE_GAME_DAILY = 3;
const GAME2_MAX_MISTAKES = 3;
const GAME_TITLES = { cardgame2: { title: 'Kart Oyunu V2', icon: '🃏' }, solitaire: { title: 'Solitaire', icon: '🂡' } };

function renderGameSubjectPicker(gameId) {
  const { title, icon } = GAME_TITLES[gameId];
  const premium = isPremiumUser();
  const gp = Storage.getGamePlayState(gameId);
  const left = premium ? '∞' : Math.max(0, FREE_GAME_DAILY - gp.plays);
  const progress = Storage.getGameProgress(gameId);

  const subCards = SUBJECTS.filter(s => s.data).map(s => {
    const topics = s.data.konular;
    const passedCount = topics.filter(t => progress[t.id]?.passed).length;
    const pct = topics.length ? Math.round(passedCount / topics.length * 100) : 0;
    return `
      <div class="card subject-card" data-sid="${s.id}">
        <div class="subject-icon">${s.icon}</div>
        <div class="subject-name">${esc(s.ad)}</div>
        <div class="progress-wrap" style="margin-bottom:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="subject-meta"><div class="progress-label">${passedCount}/${topics.length} konu geçildi</div></div>
      </div>`;
  }).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>${esc(title)}</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">${icon} ${esc(title)}</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:18px">Bir ders seç.${premium ? ' Sınırsız oynarsın.' : ` Bugün ${left} hakkın kaldı.`}</p>
    <div class="subject-grid">${subCards}</div>
  `);
  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
  document.querySelectorAll('.subject-card').forEach(el => el.addEventListener('click', () => navigate(gameId + '-topics', { sid: el.dataset.sid })));
}

function renderGameTopicPicker(gameId, sid) {
  const { title, icon } = GAME_TITLES[gameId];
  const s = sub(sid);
  if (!s?.data) { navigate(gameId); return; }
  const progress = Storage.getGameProgress(gameId);

  const rows = s.data.konular.map(t => {
    const passed = !!progress[t.id]?.passed;
    const eligible = gameId === 'cardgame2'
      ? CardGameV2.buildPairsForTopic(t).length >= 3
      : (t.sorular || []).length >= 5;
    return `
      <div class="card topic-row" data-tid="${t.id}" data-eligible="${eligible}" style="${eligible ? '' : 'opacity:0.5'}">
        <div class="topic-left">
          <div class="topic-check ${passed ? 'done' : ''}">${passed ? '✓' : ''}</div>
          <div>
            <div class="topic-title">${esc(t.baslik)}</div>
            <div class="topic-meta">${passed ? 'Geçildi ✓' : eligible ? 'Henüz geçilmedi' : 'Bu oyun için yeterli içerik yok'}</div>
          </div>
        </div>
        <span style="color:var(--text-faint);font-size:18px">›</span>
      </div>`;
  }).join('');

  setRoot(`
    <div class="breadcrumb">
      <span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span>
      <span class="crumb" data-go="game">${esc(title)}</span><span class="sep">›</span>
      <span>${esc(s.ad)}</span>
    </div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 18px">${icon} ${esc(title)} — ${esc(s.ad)}</h2>
    <div class="topic-list">${rows}</div>
  `);
  document.querySelectorAll('.crumb').forEach(el => {
    if (el.dataset.go === 'tools') el.addEventListener('click', () => navigate('tools'));
    if (el.dataset.go === 'game') el.addEventListener('click', () => navigate(gameId));
  });
  document.querySelectorAll('.topic-row').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.eligible !== 'true') { toast('Bu konu için yeterli içerik yok.', 'error'); return; }
      navigate(gameId + '-play', { sid, tid: el.dataset.tid });
    });
  });
}

function _checkGameDailyLimit(gameId) {
  if (isPremiumUser()) return true;
  const gp = Storage.getGamePlayState(gameId);
  if (gp.plays >= FREE_GAME_DAILY) {
    const { title } = GAME_TITLES[gameId];
    renderLockedFeature(title, `Bugünkü ${FREE_GAME_DAILY} ücretsiz hakkını kullandın. Yarın tekrar oyna ya da Premium'a geçip sınırsız oyna.`);
    return false;
  }
  return true;
}

// ── Kart Oyunu V2 ──
function renderGame2Play(sid, tid) {
  const s = sub(sid); const t = s && topic(s, tid);
  if (!s?.data || !t) { navigate('tools'); return; }
  if (!_checkGameDailyLimit('cardgame2')) return;
  Storage.useGamePlay('cardgame2');
  CardGameV2.start(t, GAME2_MAX_MISTAKES);
  _renderGame2Board(sid, tid, t);
}

function _renderGame2Board(sid, tid, t) {
  const st = CardGameV2.getState();
  if (!st || st.pairsTotal < 2) {
    setRoot(`<div class="empty"><span class="empty-icon">🃏</span><p>Bu konu için yeterli içerik yok.</p></div>`);
    return;
  }

  const leftHtml = st.left.map((c, i) => `
    <button class="match2-card ${c.matched ? 'matched' : ''} ${st.selectedLeft === i ? 'selected' : ''} ${st.lastWrong?.leftIdx === i ? 'shake' : ''}" data-side="left" data-i="${i}" ${c.matched ? 'disabled' : ''}>${esc(c.text)}</button>
  `).join('');
  const rightHtml = st.right.map((c, i) => `
    <button class="match2-card ${c.matched ? 'matched' : ''} ${st.selectedRight === i ? 'selected' : ''} ${st.lastWrong?.rightIdx === i ? 'shake' : ''}" data-side="right" data-i="${i}" ${c.matched ? 'disabled' : ''}>${esc(c.text)}</button>
  `).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Kart Oyunu V2</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🃏 Kart Oyunu V2 — ${esc(t.baslik)}</h2>
    <p style="font-size:13px;color:var(--text-faint);margin-bottom:16px">Sol taraftaki terimi sağdaki tanımıyla eşleştir. Eşleşen: <b>${st.matchedCount}/${st.pairsTotal}</b> • Yanlış: <b>${st.mistakes}/${st.maxMistakes}</b></p>
    <div class="match2-board" id="match2-board">
      <div class="match2-col">${leftHtml}</div>
      <svg class="match2-lines" id="match2-lines"></svg>
      <div class="match2-col">${rightHtml}</div>
    </div>
  `);

  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
  _drawMatch2Lines(st);

  document.querySelectorAll('.match2-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const side = btn.dataset.side, i = Number(btn.dataset.i);
      const res = side === 'left' ? CardGameV2.selectLeft(i) : CardGameV2.selectRight(i);
      if (!res || res.status === 'ignored') return;
      if (res.status === 'match') Sounds.click();
      _renderGame2Board(sid, tid, t);
      if (res.status === 'nomatch') {
        const board = $('match2-board');
        board?.classList.add('flash-wrong');
        setTimeout(() => board?.classList.remove('flash-wrong'), 500);
      }
      _checkGame2End(sid, tid, t);
    });
  });
}

function _drawMatch2Lines(st) {
  requestAnimationFrame(() => {
    const svg = $('match2-lines');
    const board = $('match2-board');
    if (!svg || !board) return;
    const boardRect = board.getBoundingClientRect();
    svg.setAttribute('width', boardRect.width);
    svg.setAttribute('height', boardRect.height);
    let defs = `<defs><marker id="m2arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><polygon points="0 0, 8 4, 0 8" fill="var(--mint)"/></marker></defs>`;
    let lines = '';
    st.left.forEach((c, i) => {
      if (!c.matched) return;
      const rightIdx = st.right.findIndex(r => r.matched && r.pairId === c.pairId);
      if (rightIdx < 0) return;
      const leftEl = document.querySelector(`.match2-card[data-side="left"][data-i="${i}"]`);
      const rightEl = document.querySelector(`.match2-card[data-side="right"][data-i="${rightIdx}"]`);
      if (!leftEl || !rightEl) return;
      const lr = leftEl.getBoundingClientRect(), rr = rightEl.getBoundingClientRect();
      const x1 = lr.right - boardRect.left, y1 = lr.top + lr.height / 2 - boardRect.top;
      const x2 = rr.left - boardRect.left, y2 = rr.top + rr.height / 2 - boardRect.top;
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--mint)" stroke-width="2" marker-end="url(#m2arrow)" />`;
    });
    svg.innerHTML = defs + lines;
  });
}

function _checkGame2End(sid, tid, t) {
  if (CardGameV2.isComplete()) {
    Storage.setGameTopicPassed('cardgame2', tid, true);
    setTimeout(() => _renderGameResult('cardgame2', sid, tid, t, true), 500);
    return;
  }
  if (CardGameV2.isFailed()) {
    setTimeout(() => _renderGameResult('cardgame2', sid, tid, t, false), 500);
  }
}

function _renderGameResult(gameId, sid, tid, t, passed) {
  setRoot(`
    <div class="card" style="padding:40px;text-align:center;${passed ? '' : 'border-color:rgba(251,113,133,0.35)'}">
      <div style="font-size:48px">${passed ? '🎉' : '📚'}</div>
      <h2 style="margin:12px 0 6px">${passed ? 'Konuyu geçtin!' : 'Bu konuyu geçemedin'}</h2>
      <p style="color:var(--text-faint);margin-bottom:22px">${passed ? `${esc(t.baslik)} konusundaki tüm eşleşmeleri buldun.` : `${esc(t.baslik)} konusunu tekrar çalışman işini kolaylaştırır.`}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${passed ? '' : `<button class="btn btn-primary" id="gr-study">📖 Konuyu Tekrar Çalış</button>`}
        <button class="btn btn-secondary" id="gr-back">Konu Listesine Dön</button>
        <button class="btn btn-ghost" id="gr-retry">🔄 Tekrar Dene</button>
      </div>
    </div>
  `);
  $('gr-study')?.addEventListener('click', () => navigate('topic', { sid, tid }));
  $('gr-back')?.addEventListener('click', () => navigate(gameId + '-topics', { sid }));
  $('gr-retry')?.addEventListener('click', () => navigate(gameId + '-play', { sid, tid }));
}

// ── Solitaire ──
function renderSolitairePlay(sid, tid) {
  const s = sub(sid); const t = s && topic(s, tid);
  if (!s?.data || !t) { navigate('tools'); return; }
  if (!t.sorular || t.sorular.length < 5) {
    setRoot(`<div class="empty"><span class="empty-icon">🂡</span><p>Bu konu için yeterli soru yok.</p></div>`);
    return;
  }
  if (!_checkGameDailyLimit('solitaire')) return;
  Storage.useGamePlay('solitaire');
  const qs = pickQuestions(t.sorular, 8, 'solitaire-' + tid);
  Solitaire.start(qs);
  _renderSolitaireBoard(sid, tid, t);
}

function _renderSolitaireBoard(sid, tid, t) {
  const st = Solitaire.getState();
  if (!st) return;
  if (Solitaire.isFinished()) { _renderSolitaireEnd(sid, tid, t); return; }

  const cur = st.cards[st.cursor];
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const rowHtml = st.cards.map((c, i) => {
    let cls = 'pending', label = String(i + 1);
    if (c.status === 'cleared') { cls = 'cleared'; label = '✅'; }
    else if (c.status === 'wrong') { cls = 'wrong'; label = '❌'; }
    else if (i === st.cursor) cls = 'active';
    return `<div class="sol-slot ${cls}">${label}</div>`;
  }).join('');

  const optsHtml = cur.q.secenekler.map((o, i) => {
    let cls = '';
    if (cur.status !== 'pending') {
      if (i === cur.q.dogruIndex) cls = 'is-correct';
      else if (i === cur.given) cls = 'is-wrong';
    }
    return `<div class="q-opt ${cls}" data-oi="${i}">
      <div class="opt-letter">${letters[i]}</div>
      <div class="opt-text">${esc(o)}</div>
    </div>`;
  }).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Solitaire</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🂡 Solitaire — ${esc(t.baslik)}</h2>
    <p style="font-size:13px;color:var(--text-faint);margin-bottom:16px">Kart ${st.cursor + 1} / ${st.cards.length}</p>
    <div class="sol-row">${rowHtml}</div>
    <div class="card q-card" style="margin-top:18px">
      <div class="q-text">${esc(cur.q.soru)}</div>
      <div class="q-options">${optsHtml}</div>
      ${cur.status !== 'pending' ? `<div class="review-explain" style="margin-top:14px">💡 ${esc(cur.q.aciklama)}</div>` : ''}
    </div>
    <div style="margin-top:16px;display:flex;justify-content:flex-end">
      ${cur.status !== 'pending' ? `<button class="btn btn-primary" id="sol-next">${st.cursor < st.cards.length - 1 ? 'Sonraki Kart →' : 'Bitir'}</button>` : ''}
    </div>
  `);

  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
  if (cur.status === 'pending') {
    document.querySelectorAll('.q-opt').forEach(el => el.addEventListener('click', () => {
      Solitaire.answer(Number(el.dataset.oi));
      Sounds.click();
      _renderSolitaireBoard(sid, tid, t);
    }));
  }
  $('sol-next')?.addEventListener('click', () => { Solitaire.advance(); _renderSolitaireBoard(sid, tid, t); });
}

function _renderSolitaireEnd(sid, tid, t) {
  const st = Solitaire.getState();
  const cleared = st.cards.filter(c => c.status === 'cleared').length;
  const passed = Solitaire.isPassed();
  Storage.addUsedQuestions('solitaire-' + tid, st.cards.map(c => c.q.soru.slice(0, 50)));
  if (passed) Storage.setGameTopicPassed('solitaire', tid, true);

  setRoot(`
    <div class="card" style="padding:40px;text-align:center;${passed ? '' : 'border-color:rgba(251,113,133,0.35)'}">
      <div style="font-size:48px">${passed ? '🎉' : '📚'}</div>
      <h2 style="margin:12px 0 6px">${passed ? 'Konuyu geçtin!' : 'Bu konuyu geçemedin'}</h2>
      <p style="color:var(--text-faint);margin-bottom:10px">${cleared} / ${st.cards.length} kartı doğru temizledin.</p>
      <p style="color:var(--text-faint);margin-bottom:22px">${passed ? `${esc(t.baslik)} konusunda iyi gidiyorsun.` : `${esc(t.baslik)} konusunu tekrar çalışman işini kolaylaştırır.`}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${passed ? '' : `<button class="btn btn-primary" id="gr-study">📖 Konuyu Tekrar Çalış</button>`}
        <button class="btn btn-secondary" id="gr-back">Konu Listesine Dön</button>
        <button class="btn btn-ghost" id="gr-retry">🔄 Tekrar Dene</button>
      </div>
    </div>
  `);
  $('gr-study')?.addEventListener('click', () => navigate('topic', { sid, tid }));
  $('gr-back')?.addEventListener('click', () => navigate('solitaire-topics', { sid }));
  $('gr-retry')?.addEventListener('click', () => navigate('solitaire-play', { sid, tid }));
}

// ── Akılda Kalıcı Kodlama ──
let _mnemonicIdx = 0;
function _collectMnemonics() {
  const items = [];
  SUBJECTS.filter(s => s.data).forEach(s => {
    (s.data.konular || []).forEach(t => {
      (t.anlatim?.anahtarNoktalar || []).forEach(p => items.push({ sad: s.ad, tbaslik: t.baslik, text: p }));
    });
  });
  return items;
}

function _dailyMnemonic() {
  const items = _collectMnemonics();
  if (!items.length) return null;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return items[dayOfYear % items.length];
}

function renderMnemonics() {
  if (!isPremiumUser()) {
    renderLockedFeature('Akılda Kalıcı Kodlama', 'Konuların kısa, şifreli özetleriyle hızlı tekrar yapmak için Premium\'a geç.');
    return;
  }
  const items = _collectMnemonics();
  if (!items.length) {
    setRoot(`<div class="empty"><span class="empty-icon">🧠</span><p>İçerik yükleniyor, birazdan tekrar dene.</p></div>`);
    return;
  }
  if (_mnemonicIdx >= items.length) _mnemonicIdx = 0;
  const it = items[_mnemonicIdx];

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Akılda Kalıcı Kodlama</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🧠 Akılda Kalıcı Kodlama</h2>
    <p style="font-size:13px;color:var(--text-faint);margin-bottom:18px">${_mnemonicIdx + 1} / ${items.length}</p>
    <div class="card mnemonic-card">
      <div class="mnemonic-eyebrow">${esc(it.sad)} • ${esc(it.tbaslik)}</div>
      <div class="mnemonic-text">${esc(it.text)}</div>
    </div>
    <div style="display:flex;gap:10px;margin-top:18px">
      <button class="btn btn-secondary" id="mn-prev">← Önceki</button>
      <button class="btn btn-primary" id="mn-shuffle">🔀 Karıştır</button>
      <button class="btn btn-secondary" id="mn-next">Sonraki →</button>
    </div>
  `);

  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
  $('mn-prev').addEventListener('click', () => { _mnemonicIdx = (_mnemonicIdx - 1 + items.length) % items.length; renderMnemonics(); });
  $('mn-next').addEventListener('click', () => { _mnemonicIdx = (_mnemonicIdx + 1) % items.length; renderMnemonics(); });
  $('mn-shuffle').addEventListener('click', () => { _mnemonicIdx = Math.floor(Math.random() * items.length); renderMnemonics(); });
}

// ── "Bugün Sınava Girsen Kaç Alırsın?" ──
function renderPredictor() {
  if (!isPremiumUser()) {
    renderLockedFeature('Bugün Sınava Girsen Kaç Alırsın?', 'Geçmiş performansına göre tahmini KPSS puanını görmek için Premium\'a geç.');
    return;
  }
  const overall = Storage.computeOverall();
  if (overall.tests < 1) {
    setRoot(`<div class="empty"><span class="empty-icon">🎯</span><p>Tahmin üretmek için önce birkaç test çöz.</p></div>`);
    return;
  }
  const overallRate = overall.rate / 100;
  let dogru = 0, yanlis = 0;
  Object.entries(FULL_TEST_DIST).forEach(([sid, n]) => {
    const avg = Storage.computeSubjectAvg(sid);
    const rate = avg !== null ? avg / 100 : overallRate;
    const d = Math.round(n * rate);
    dogru += d;
    yanlis += (n - d);
  });
  const k = computeKpssPoints({ dogru, yanlis });

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Sınav Tahmini</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🎯 Bugün Sınava Girsen Kaç Alırsın?</h2>
    <p style="font-size:13px;color:var(--text-faint);margin-bottom:18px">Geçmiş test performansına dayanan tahmini bir hesaplamadır, gerçek sınav sonucu farklı olabilir.</p>
    <div class="card result-kpss" style="margin-bottom:16px">
      <div class="kpss-axis">Tahmini Net: ${k.net.toFixed(2)} (${dogru} doğru / ${yanlis} yanlış — 120 soru üzerinden)</div>
      <div class="kpss-scores">
        <div><strong>P3</strong> ${k.p3}</div>
        <div><strong>P93</strong> ${k.p93}</div>
        <div><strong>P94</strong> ${k.p94}</div>
      </div>
    </div>
    <div class="card" style="padding:18px 20px">
      <div class="settings-sub">Bu tahmin, çözdüğün konu/ders testlerindeki ders bazlı başarı oranların 120 soruluk tam deneme dağılımına uygulanarak hesaplanır. Daha çok test çöz, tahmin daha isabetli olsun.</div>
    </div>
  `);
  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
}

// ── Özel Lig ──
function _tierFromRate(rate) {
  if (rate >= 80) return { name: 'Platin', icon: '💎' };
  if (rate >= 60) return { name: 'Altın', icon: '🥇' };
  if (rate >= 40) return { name: 'Gümüş', icon: '🥈' };
  return { name: 'Bronz', icon: '🥉' };
}
function _tierFromPercentile(pct) {
  if (pct >= 80) return { name: 'Platin', icon: '💎' };
  if (pct >= 60) return { name: 'Altın', icon: '🥇' };
  if (pct >= 35) return { name: 'Gümüş', icon: '🥈' };
  return { name: 'Bronz', icon: '🥉' };
}

async function renderLeague() {
  if (!isPremiumUser()) {
    renderLockedFeature('Özel Lig', 'Başarı seviyene göre lig rütbeni görmek için Premium\'a geç.');
    return;
  }
  setRoot(`<div class="empty"><span class="empty-icon">🏆</span><p>Ligin hesaplanıyor...</p></div>`);

  const overall = Storage.computeOverall();
  let tier, noteText;

  if (Leaderboard.isOnline()) {
    const list = await Leaderboard.getTopList(200);
    if (list.length) {
      const better = list.filter(e => e.skor > overall.rate).length;
      const percentile = Math.round((1 - better / list.length) * 100);
      tier = _tierFromPercentile(percentile);
      noteText = `Çevrimiçi ${list.length} kullanıcı arasında %${percentile} dilimdesin.`;
    } else {
      tier = _tierFromRate(overall.rate);
      noteText = 'Henüz karşılaştırılacak çevrimiçi veri yok, yerel başarı oranına göre hesaplandı.';
    }
  } else {
    tier = _tierFromRate(overall.rate);
    noteText = 'Çevrimiçi karşılaştırma için Ayarlar → Liderlik Tablosu\'ndan bir Firebase adresi ekleyebilirsin.';
  }

  const tiers = [
    { name: 'Bronz', icon: '🥉' }, { name: 'Gümüş', icon: '🥈' },
    { name: 'Altın', icon: '🥇' }, { name: 'Platin', icon: '💎' },
  ];
  const tiersHtml = tiers.map(t => `
    <div class="league-chip ${t.name === tier.name ? 'active' : ''}">${t.icon} ${t.name}</div>
  `).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Özel Lig</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🏆 Özel Lig</h2>
    <div class="card" style="padding:28px;text-align:center;margin-bottom:18px">
      <div style="font-size:52px">${tier.icon}</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">${tier.name} Lig</div>
      <div style="font-size:13px;color:var(--text-faint);margin-top:8px">${esc(noteText)}</div>
    </div>
    <div class="league-row">${tiersHtml}</div>
  `);
  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
}

// ── Çalışma Kronometresi ──
let _swInterval = null, _swSeconds = 0, _swRunning = false, _swSubject = null;
function _fmtDuration(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderStopwatch() {
  if (!isPremiumUser()) {
    renderLockedFeature('Çalışma Kronometresi ve Zaman Analizi', 'Ders bazlı çalışma sürelerini kaydetmek ve analiz etmek için Premium\'a geç.');
    return;
  }
  if (!_swSubject) _swSubject = SUBJECTS[0].id;
  const times = Storage.getStudyTime();
  const rows = SUBJECTS.map(s => ({ id: s.id, label: s.ad, value: Math.round((times[s.id] || 0) / 60) }));

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Çalışma Kronometresi</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 18px">⏱️ Çalışma Kronometresi ve Zaman Analizi</h2>
    <div class="card" style="padding:22px;margin-bottom:20px;text-align:center">
      <select id="sw-subject" class="modal-input" style="margin-bottom:16px;max-width:280px">
        ${SUBJECTS.map(s => `<option value="${s.id}" ${_swSubject === s.id ? 'selected' : ''}>${s.icon} ${esc(s.ad)}</option>`).join('')}
      </select>
      <div style="font-size:44px;font-weight:800;font-variant-numeric:tabular-nums" id="sw-display">${_fmtDuration(_swSeconds)}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <button class="btn btn-primary" id="sw-toggle">${_swRunning ? '⏸ Duraklat' : '▶ Başlat'}</button>
        <button class="btn btn-ghost" id="sw-reset">✅ Bitir ve Kaydet</button>
      </div>
    </div>
    <div class="section-title">Toplam Çalışma Süreleri (dk)</div>
    <div class="card" style="padding:24px"><div id="sw-chart"></div></div>
  `);
  Charts.barChart('sw-chart', rows);

  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
  $('sw-subject').addEventListener('change', e => { _swSubject = e.target.value; });
  $('sw-toggle').addEventListener('click', () => {
    _swRunning = !_swRunning;
    if (_swRunning) {
      _swInterval = setInterval(() => {
        _swSeconds++;
        const el = $('sw-display');
        if (el) el.textContent = _fmtDuration(_swSeconds);
      }, 1000);
    } else {
      clearInterval(_swInterval);
    }
    renderStopwatch();
  });
  $('sw-reset').addEventListener('click', () => {
    clearInterval(_swInterval);
    _swRunning = false;
    if (_swSeconds > 0) {
      Storage.addStudyTime(_swSubject, _swSeconds);
      toast(`${_fmtDuration(_swSeconds)} kaydedildi!`, 'success');
    }
    _swSeconds = 0;
    renderStopwatch();
  });
}

// ── Mentörlük Seansları ──
const MENTOR_TIPS = [
  { title: '⏳ Zaman Yönetimi', text: 'Sınavda bir soruya 60-70 saniyeden fazla takılma. Emin olamadığın soruyu işaretleyip geç, tur sonunda geri dön.' },
  { title: '🎯 Eleme Tekniği', text: 'Doğru şıkkı bilmesen bile önce kesin yanlış olan şıkları ele. 5 şıktan 2\'sini eleyip kalanlar arasından seçmek isabet oranını ciddi artırır.' },
  { title: '📉 Zayıf Konuya Öncelik Ver', text: 'Profil sayfandaki "çalışman gereken ders" önerisini haftada en az 2 kez tekrar et; en çok net, en zayıf dersten gelir.' },
  { title: '🧪 Deneme Ritmi', text: 'Haftada en az 1 tam deneme çöz ve gerçek sınav saatinde, gerçek süre baskısıyla otur. Zamana alışmak kadar önemli bir şey yok.' },
  { title: '🔁 Yanlış Tekrarı', text: 'Her denemeden sonra yanlışlarını 24 saat içinde tekrar et. Unutma eğrisi en hızlı ilk gün işler.' },
  { title: '😴 Sınav Öncesi Bakım', text: 'Sınavdan önceki gece erken yat, ağır yemekten kaçın. Dinlenmiş beyin, ezberden çok daha iyi çıkarım yapar.' },
];
function renderMentor() {
  if (!isPremiumUser()) {
    renderLockedFeature('Mentörlük Seansları', 'Sınav stratejileri ve haftalık çalışma planı önerileri için Premium\'a geç.');
    return;
  }
  const cardsHtml = MENTOR_TIPS.map(t => `
    <div class="card premium-item">
      <div class="premium-title">${esc(t.title)}</div>
      <div class="premium-desc">${esc(t.text)}</div>
    </div>`).join('');

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="tools">Oyunlar</span><span class="sep">›</span><span>Mentörlük</span></div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">🎓 Mentörlük Seansları</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:20px">Genel sınav stratejileri — kişiye özel canlı mentörlük için yakında sohbet özellikleri açılacak.</p>
    <div class="premium-grid">${cardsHtml}</div>
  `);
  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('tools')));
}

// ── Settings ──
function renderSettings() {
  const s = Storage.getSettings();
  const notif = Storage.getNotificationSettings();
  const particleOn = s.particleEnabled !== false;
  const pColor = s.particleColor || 'rainbow';
  const soundOn = s.soundEnabled !== false;
  const timerMode = s.timerMode || 'auto';
  const secsPerQ = s.secsPerQ || 65;

  const colorOpts = [
    { id: 'rainbow', label: '🌈', name: 'Gökkuşağı' },
    { id: 'violet', label: '💜', name: 'Mor' },
    { id: 'rose', label: '🌸', name: 'Pembe' },
    { id: 'gold', label: '✨', name: 'Altın' },
    { id: 'mint', label: '💚', name: 'Mint' },
    { id: 'white', label: '⚪', name: 'Gümüş' },
  ];

  const currentTheme = s.theme || 'default';
  const themes = [
    { id: 'default', icon: '🌙', name: 'Gece Yarısı', bg: 'linear-gradient(135deg,#0a0612,#200a3c)', txt: '#f1eeff' },
    { id: 'safak', icon: '🌤️', name: 'Şafak', bg: 'linear-gradient(135deg,#f3edff,#fdf4ff)', txt: '#1e0835' },
    { id: 'pembe', icon: '🌸', name: 'Pembe Rüya', bg: 'linear-gradient(135deg,#fff0f6,#fce7f3)', txt: '#3b0a2a' },
    { id: 'zumrut', icon: '🌿', name: 'Zümrüt', bg: 'linear-gradient(135deg,#020d0a,#0a3325)', txt: '#ecfdf5' },
    { id: 'gunbatimi', icon: '🌅', name: 'Gün Batımı', bg: 'linear-gradient(135deg,#120508,#3d0d1a)', txt: '#fff7ed' },
    { id: 'kutup', icon: '🧊', name: 'Kutup Gecesi', bg: 'linear-gradient(135deg,#010b18,#0a2a4a)', txt: '#f0f9ff' },
  ];

  const themeSwatches = themes.map(t => `
    <div class="theme-swatch ${currentTheme === t.id ? 'active' : ''}"
      data-tid="${t.id}"
      style="background:${t.bg};color:${t.txt}">
      <span>${t.icon}</span>${t.name}
    </div>`).join('');

  const colorBtns = colorOpts.map(c => `
    <button class="btn ${pColor === c.id ? 'btn-primary' : 'btn-secondary'} color-pick"
      data-color="${c.id}" style="padding:8px 14px;font-size:13px">${c.label} ${c.name}</button>
  `).join('');

  const secsOptions = [30, 45, 60, 90, 120];
  const secsBtns = secsOptions.map(n => `
    <button class="btn ${secsPerQ === n ? 'btn-primary' : 'btn-secondary'} secs-pick"
      data-secs="${n}" style="padding:8px 16px;font-size:13px">${n}s</button>
  `).join('');

  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 22px">⚙️ Ayarlar</h2>

    <!-- Temalar -->
    <div class="section-title">🎨 Uygulama Teması</div>
    <div class="card" style="padding:18px 20px;margin-bottom:16px">
      <div class="theme-grid">${themeSwatches}</div>
    </div>

    <!-- Ses -->
    <div class="section-title" style="margin-top:20px">🔊 Ses Efektleri</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div class="settings-title">Buton sesleri</div>
          <div class="settings-sub">Tıklamalarda ses çıkar; son 5 saniye tik-tak sesi gelir</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="s-sound-on" ${soundOn ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Süre Modu -->
    <div class="section-title" style="margin-top:20px">⏱️ Test Süresi</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      <div style="margin-bottom:16px">
        <div class="settings-title" style="margin-bottom:10px">Süre hesaplama modu</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn ${timerMode === 'auto' ? 'btn-primary' : 'btn-secondary'} timer-mode-btn"
            data-mode="auto" style="padding:9px 18px;font-size:13px">
            🤖 Otomatik (KPSS oranı — 65sn/soru)
          </button>
          <button class="btn ${timerMode === 'perq' ? 'btn-primary' : 'btn-secondary'} timer-mode-btn"
            data-mode="perq" style="padding:9px 18px;font-size:13px">
            ✏️ Soru başına süre — Sen belirle
          </button>
        </div>
      </div>
      <div id="secs-row" style="${timerMode === 'perq' ? '' : 'opacity:0.4;pointer-events:none'}">
        <div class="settings-sub" style="margin-bottom:10px">Her soru için süre:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${secsBtns}</div>
        <div style="margin-top:10px;font-size:12.5px;color:var(--text-faint)">
          Örnek: 10 soru × ${secsPerQ}sn = ${Math.round(10 * secsPerQ / 60)} dakika
        </div>
      </div>
    </div>

    <!-- Kullanıcılar -->
    <div class="section-title" style="margin-top:20px">👤 Kullanıcılar</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div class="settings-title">Aktif: <span style="color:var(--violet-l)">${esc(Storage.getActiveUser())}</span></div>
          <div class="settings-sub">${Storage.getUserList().length} kayıtlı kullanıcı</div>
        </div>
        <button class="btn btn-secondary" id="s-switch-user" style="padding:9px 18px">👤 Kullanıcı Değiştir</button>
      </div>
    </div>

    <!-- Abonelik -->
    <div class="section-title" style="margin-top:20px">💎 Abonelik</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div class="settings-title">Planın: ${renderPlanPill()}</div>
          <div class="settings-sub">Premium paketinde detaylı grafikler, özel testler ve VIP ayrıcalıklar yer alır.</div>
        </div>
        <button class="btn btn-primary" id="s-upgrade-plan" style="padding:9px 18px">Premium Ayrıntılarını Gör</button>
      </div>
    </div>

    <!-- Premium Karakter -->
    <div class="section-title" style="margin-top:20px">🦉 Premium Karakter</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      ${isPremiumUser() ? `
        <div class="settings-sub" style="margin-bottom:12px">Profilinde ve üst menüde görünecek karakteri seç.</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${CHARACTER_OPTS.map(c => `
          <button class="btn ${Storage.getUserCharacter() === c ? 'btn-primary' : 'btn-secondary'} character-pick" data-char="${c}" style="font-size:20px;padding:8px 14px">${c}</button>
        `).join('')}</div>
      ` : `
        <div class="settings-sub">Premium'a geçerek profilin için özel karakterler açabilirsin.</div>
      `}
    </div>

    <!-- Bildirimler -->
    <div class="section-title" style="margin-top:20px">🔔 Bildirimler</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px">
        <div>
          <div class="settings-title">Hatırlatma bildirimleri</div>
          <div class="settings-sub">Günlük soru hatırlatıcısı ve KPSS güncellemeleri al.</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="s-notify-reminders" ${Storage.getNotificationSettings().reminders ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
        <div>
          <div class="settings-title">Güncelleme bildirimleri</div>
          <div class="settings-sub">Yeni içerik ve duyuruları uygulama içinde gör.</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="s-notify-updates" ${Storage.getNotificationSettings().updates ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Bulut Yedekleme -->
    <div class="section-title" style="margin-top:20px">☁️ Bulut Yedekleme</div>
    <div class="card" style="padding:18px 22px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div class="settings-title">Bulut yedekleme</div>
          <div class="settings-sub">Profilini ve ilerlemeni çevrimiçi yedeklemeye hazırlık.</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="s-cloud-backup" ${Storage.getCloudBackupEnabled() ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Mouse efekti -->
    <div class="section-title" style="margin-top:20px">🖱️ Mouse Toz Efekti</div>
    <div class="card" style="padding:20px 22px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div class="settings-title">Mouse efekti</div>
          <div class="settings-sub">Fare hareket ettikçe toz parçacıkları çıkar</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="s-particle-on" ${particleOn ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div id="color-row" style="${particleOn ? '' : 'opacity:0.4;pointer-events:none'}">
        <div class="settings-sub" style="margin-bottom:10px">Renk teması:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${colorBtns}</div>
      </div>
    </div>
  `);

  // Tema seçimi
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.theme-swatch').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      applyTheme(el.dataset.tid);
      toast('Tema değiştirildi!', 'success');
    });
  });

  // Ses toggle
  $('s-sound-on').addEventListener('change', () => {
    Storage.saveSettings({ ...Storage.getSettings(), soundEnabled: $('s-sound-on').checked });
  });

  // Timer mode
  document.querySelectorAll('.timer-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      document.querySelectorAll('.timer-mode-btn').forEach(b => b.className = 'btn btn-secondary timer-mode-btn');
      btn.className = 'btn btn-primary timer-mode-btn';
      $('secs-row').style.opacity = mode === 'perq' ? '1' : '0.4';
      $('secs-row').style.pointerEvents = mode === 'perq' ? '' : 'none';
      Storage.saveSettings({ ...Storage.getSettings(), timerMode: mode });
      toast(mode === 'auto' ? 'Otomatik süre modu seçildi.' : 'Soru başına süre modu seçildi.', 'success');
    });
  });

  // Secs pick
  document.querySelectorAll('.secs-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.secs);
      document.querySelectorAll('.secs-pick').forEach(b => b.className = 'btn btn-secondary secs-pick');
      btn.className = 'btn btn-primary secs-pick';
      Storage.saveSettings({ ...Storage.getSettings(), secsPerQ: n });
      const ex = document.querySelector('#secs-row div:last-child');
      if (ex) ex.textContent = `Örnek: 10 soru × ${n}sn = ${Math.round(10 * n / 60)} dakika`;
      toast(`Soru başına ${n} saniye seçildi.`, 'success');
    });
  });

  // Particle toggle
  $('s-particle-on').addEventListener('change', () => {
    const on = $('s-particle-on').checked;
    $('color-row').style.opacity = on ? '1' : '0.4';
    $('color-row').style.pointerEvents = on ? '' : 'none';
    Storage.saveSettings({ ...Storage.getSettings(), particleEnabled: on });
  });

  // Color pick
  document.querySelectorAll('.color-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-pick').forEach(b => b.className = 'btn btn-secondary color-pick');
      btn.className = 'btn btn-primary color-pick';
      Storage.saveSettings({ ...Storage.getSettings(), particleColor: btn.dataset.color });
      toast('Mouse rengi değiştirildi!', 'success');
    });
  });

  // Abonelik işlemleri
  // Bildirim ayarları
  $('s-notify-reminders')?.addEventListener('change', () => {
    Storage.saveNotificationSettings({ reminders: $('s-notify-reminders').checked });
  });
  $('s-notify-updates')?.addEventListener('change', () => {
    Storage.saveNotificationSettings({ updates: $('s-notify-updates').checked });
  });

  // Karakter seçimi
  document.querySelectorAll('.character-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      Storage.setUserCharacter(btn.dataset.char);
      toast('Karakter güncellendi!', 'success');
      updateUserPill();
      renderSettings();
    });
  });
  $('s-cloud-backup')?.addEventListener('change', () => {
    Storage.setCloudBackupEnabled($('s-cloud-backup').checked);
    toast($('s-cloud-backup').checked ? 'Bulut yedekleme hazırlandı.' : 'Bulut yedekleme kapatıldı.', 'info');
  });

  // Kullanıcı değiştir
  $('s-switch-user')?.addEventListener('click', () => showUserSelect());
  $('s-upgrade-plan')?.addEventListener('click', () => navigate('premium'));
}

function renderPremiumPage() {
  const premium = isPremiumUser();
  const title = premium ? 'Premium Hesabı' : 'Premium’a Geçiş';
  const statusText = premium
    ? 'Tebrikler! Premium özelliklere erişimin aktif. VIP rozetin ve gelişmiş analiz araçların açıldı.'
    : 'Premium’a geçerek yanlışlarımı sına, sınırsız test hakkı, detaylı grafikler, sesli özetler ve özel raporlarla çalışma düzenini güçlendirirsin.';

  const statusCardHtml = `
    <div class="profile-card card" style="margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-size:15px;font-weight:700">Premium Plan</div>
          <div style="font-size:13px;color:var(--text-dim);margin-top:4px">Tam erişim, özel analiz ve VIP deneyim.</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span class="plan-pill premium">Aktif</span>
          <span class="user-plan-tag">VIP</span>
        </div>
      </div>
    </div>`;

  const pricingHtml = `
    <div class="pricing-grid">
      <div class="card pricing-card student">
        <div class="pricing-head">
          <div class="pricing-icon">🎓</div>
          <div class="pricing-name">Öğrenci Premium</div>
        </div>
        <div class="pricing-price">50,00 <span>TL</span></div>
        <button class="btn btn-secondary btn-block" id="upgrade-student">Öğrenci Premium Al</button>
        <p class="pricing-note">Premium ile birebir aynı özellikler var, öğrenci kardeşlerime ufak bir kıyak yapayım dedim 😊🎓 Hiç almasam daha iyi ama giderler için ufak bir mevla alıyorum 🙏 Şu an için kusura bakmayın, ilerleyen zamanlarda telafi ederim 🤝💜 Sizi seviyorum ❤️✨</p>
      </div>
      <div class="card pricing-card full">
        <span class="pricing-badge">💎 Tam Sürüm</span>
        <div class="pricing-head">
          <div class="pricing-icon">💎</div>
          <div class="pricing-name">Tam Premium</div>
        </div>
        <div class="pricing-price">199,90 <span>TL</span></div>
        <button class="btn btn-primary btn-block" id="upgrade-full">Tam Premium’a Geç</button>
      </div>
    </div>`;

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="home">Anasayfa</span><span class="sep">›</span><span>Premium</span></div>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 8px">💎 ${title}</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:10px">${statusText}</p>
    ${premium ? statusCardHtml : pricingHtml}

    <div class="premium-grid">
      <div class="card premium-item">
        <div class="premium-icon">🧠</div>
        <div class="premium-title">Yanlışlarımı Sına</div>
        <div class="premium-desc">Yanlış sorularından özel test oluştur, eksiklerini hedef al ve hızla düzelt.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">♾️</div>
        <div class="premium-title">Sınırsız Test</div>
        <div class="premium-desc">Konu testlerinde ve tam deneme sınavında hak sınırı olmadan istediğin kadar çöz.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">📊</div>
        <div class="premium-title">Detaylı İstatistik</div>
        <div class="premium-desc">Haftalık başarı grafikleri, konu bazlı analiz ve kişisel puan tahmini raporu.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🎧</div>
        <div class="premium-title">Sesli Özetler</div>
        <div class="premium-desc">Önemli KPSS konularını sesli özetlerle her yerde tekrar et.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">⭐</div>
        <div class="premium-title">VIP Rozet</div>
        <div class="premium-desc">Profilinde özel VIP etiketi, daha güçlü görünürlük ve öne çıkan deneyim.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🦉</div>
        <div class="premium-title">Premium Karakterler</div>
        <div class="premium-desc">Profilinde ve üst menüde görünecek özel karakteri seç.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🧠</div>
        <div class="premium-title">Akılda Kalıcı Kodlama</div>
        <div class="premium-desc">Konuların kısa, şifreli özetleriyle hızlı ve akılda kalıcı tekrar.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🎯</div>
        <div class="premium-title">Sınav Tahmini</div>
        <div class="premium-desc">"Bugün sınava girsen kaç alırsın?" — geçmiş performansına göre tahmini puan.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🏆</div>
        <div class="premium-title">Özel Lig</div>
        <div class="premium-desc">Başarı seviyene göre Bronz/Gümüş/Altın/Platin lig rütbeni gör.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">⏱️</div>
        <div class="premium-title">Çalışma Kronometresi</div>
        <div class="premium-desc">Ders bazlı çalışma sürelerini kaydet ve zaman analizini gör.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🎓</div>
        <div class="premium-title">Mentörlük Seansları</div>
        <div class="premium-desc">Sınav stratejileri ve haftalık çalışma planı önerileri.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🃏</div>
        <div class="premium-title">Sınırsız Kart Oyunu</div>
        <div class="premium-desc">Kart Eşleştirme Oyunu'nda günlük limit olmadan istediğin kadar oyna.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🎧</div>
        <div class="premium-title">Odaklanma Sesleri</div>
        <div class="premium-desc">Sınav salonu atmosferiyle çalışırken odaklanmanı artır.</div>
      </div>
      <div class="card premium-item">
        <div class="premium-icon">🔒</div>
        <div class="premium-title">Kilit Ekranı Kodu</div>
        <div class="premium-desc">Ana sayfanda günün akılda kalıcı kodlamasını gör (mobil widget yakında).</div>
      </div>
    </div>
    <div class="premium-actions">
      ${premium ? '<button class="btn btn-secondary" id="downgrade-plan">Ücretsiz Plan</button>' : ''}
      <button class="btn btn-ghost" id="premium-home">Anasayfaya Dön</button>
    </div>
  `);

  $('upgrade-student')?.addEventListener('click', () => {
    Storage.setUserPlan('premium');
    toast('Öğrenci Premium etkinleştirildi! 🎓💜', 'success');
    renderPremiumPage();
    updateUserPill();
  });

  $('upgrade-full')?.addEventListener('click', () => {
    Storage.setUserPlan('premium');
    toast('Tebrikler! Premium plan etkinleştirildi.', 'success');
    renderPremiumPage();
    updateUserPill();
  });

  $('downgrade-plan')?.addEventListener('click', () => {
    Storage.setUserPlan('free');
    toast('Ücretsiz plana geri döndün.', 'info');
    renderPremiumPage();
    updateUserPill();
  });

  $('premium-home')?.addEventListener('click', () => navigate('home'));
  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('home')));
}

function renderProfile() {
  const name = Storage.getActiveUser() || Storage.getUserName() || 'Aday';
  const premium = isPremiumUser();
  const overall = Storage.computeOverall();
  const streak = Storage.getStreak();
  const wrongCount = Storage.getWrongBank().length;
  const badgeCount = Storage.getUnlockedBadges().length;
  const subjectAverages = SUBJECTS.filter(s => s.data).map(s => ({ id: s.id, label: s.ad, avg: Storage.computeSubjectAvg(s.id) })).filter(x => x.avg !== null);
  const bestSub = subjectAverages.length ? subjectAverages.reduce((a, b) => a.avg >= b.avg ? a : b) : null;
  const worstSub = subjectAverages.length ? subjectAverages.reduce((a, b) => a.avg <= b.avg ? a : b) : null;

  setRoot(`
    <div class="breadcrumb"><span class="crumb" data-go="home">Anasayfa</span><span class="sep">›</span><span>Profil</span></div>
    <div class="profile-header card">
      <div>
        <div class="profile-title">👤 ${esc(name)} Profili</div>
        <div class="profile-sub">Ücretsiz hesabın temel özetini, Premium’da ise detaylı analizleri gör.</div>
      </div>
      <div class="profile-pill-row">
        <span class="plan-pill ${premium ? 'premium' : 'free'}">${premium ? 'Premium' : 'Ücretsiz'}</span>
        ${premium ? '<span class="user-plan-tag">VIP</span>' : ''}
      </div>
    </div>

    <div class="profile-summary-grid">
      <div class="card profile-stat-card">
        <div class="profile-stat-label">Genel Başarı</div>
        <div class="profile-stat-value">${overall.rate}%</div>
        <div class="profile-stat-foot">Çözdüğün soruların başarı oranı.</div>
      </div>
      <div class="card profile-stat-card">
        <div class="profile-stat-label">Çözülen Soru</div>
        <div class="profile-stat-value">${overall.solved}</div>
        <div class="profile-stat-foot">Toplam tamamlanan soru adedi.</div>
      </div>
      <div class="card profile-stat-card">
        <div class="profile-stat-label">Günlük Seri</div>
        <div class="profile-stat-value">${streak.count || 0}</div>
        <div class="profile-stat-foot">Kesintisiz çalışma gün sayısı.</div>
      </div>
      <div class="card profile-stat-card">
        <div class="profile-stat-label">Yanlışlar</div>
        <div class="profile-stat-value">${wrongCount}</div>
        <div class="profile-stat-foot">Yanlış soruların özel çalışma bankası.</div>
      </div>
    </div>

    <div class="profile-row">
      <div class="card profile-box">
        <div class="profile-box-title">${badgeCount} Rozet</div>
        <div class="profile-box-text">Topladığın rozetleri ve başarı puanlarını takip et.</div>
      </div>
      <div class="card profile-box">
        <div class="profile-box-title">${bestSub ? esc(bestSub.label) : 'Daha fazla çöz'} en iyi ders</div>
        <div class="profile-box-text">${bestSub ? `Başarı oranın %${bestSub.avg}` : 'Test çözerek ilk dersini belirle.'}</div>
      </div>
      <div class="card profile-box">
        <div class="profile-box-title">${worstSub ? esc(worstSub.label) : 'Henüz veri yok'} üzerinde çalış</div>
        <div class="profile-box-text">${worstSub ? `Başarı oranın %${worstSub.avg}` : 'Çözdüğün sorular burada listelenecek.'}</div>
      </div>
    </div>

    ${premium ? `
      <div class="card profile-chart-card">
        <div class="profile-chart-heading">📈 Konu Başarı Grafiği</div>
        <div id="profile-performance-chart"></div>
        <div class="profile-chart-note">Premium hesapta haftalık başarı trendi ve konu skorların görselleştirilir.</div>
      </div>
    ` : `
      <div class="card profile-plan-card locked-card">
        <div class="profile-plan-title">Premium İstatistiklere Geç</div>
        <div class="profile-plan-text">Ücretsiz hesapla temel verileri görürsün. Premium’da grafikler, konu analizi ve gelişmiş raporlar açılır.</div>
        <button class="btn btn-primary" id="profile-upgrade">Premium’a Geç →</button>
      </div>
    `}

    <div class="premium-actions">
      <button class="btn btn-secondary" id="profile-home">Anasayfaya Dön</button>
      ${premium ? '<button class="btn btn-ghost" id="profile-premium">Premium Ayrıntıları Gör</button>' : ''}
    </div>
  `);

  if (premium && subjectAverages.length > 0) {
    Charts.barChart('profile-performance-chart', subjectAverages.map(x => ({ id: x.id, label: x.label, value: x.avg })));
  }

  $('profile-upgrade')?.addEventListener('click', () => navigate('premium'));
  $('profile-home')?.addEventListener('click', () => navigate('home'));
  $('profile-premium')?.addEventListener('click', () => navigate('premium'));
  document.querySelectorAll('.crumb').forEach(el => el.addEventListener('click', () => navigate('home')));
}

// ── Missions ──
function renderMissions() {
  const all = Missions.getAll();
  const rows = all.map(m => `
    <div class="card mission-row">
      <div class="mission-icon">${m.icon}</div>
      <div class="mission-info">
        <div class="mission-title">${esc(m.title)}</div>
        <div class="mission-desc">${esc(m.desc)}</div>
        <div class="progress-wrap"><div class="progress-fill" style="width:${m.done ? 100 : 0}%"></div></div>
      </div>
      ${m.done ? '<div class="mission-done">✅</div>' : `<div class="mission-pts">+${m.pts} 🌟</div>`}
    </div>`).join('');

  setRoot(`
    <h2 style="font-size:20px;font-weight:800;margin:0 0 6px">📋 Görevler</h2>
    <p style="font-size:13.5px;color:var(--text-faint);margin-bottom:18px">Günlük ve haftalık görevleri tamamla!</p>
    <div style="display:flex;flex-direction:column;gap:10px">${rows}</div>
  `);
}

// ── Theme ──
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t || 'default');
  Storage.saveSettings({ ...Storage.getSettings(), theme: t || 'default' });
}

// ── Kullanıcı Seçim Ekranı ──
function showUserSelect() {
  $('main-app').classList.add('hidden');
  $('user-select-screen').classList.remove('hidden');
  renderUserCards();
}

function hideUserSelect() {
  $('user-select-screen').classList.add('hidden');
  $('main-app').classList.remove('hidden');
}

function renderUserCards() {
  const grid = $('user-cards-grid');
  const users = Storage.getUserList();

  const cards = users.map(name => {
    const stats = Storage.getUserStats(name);
    const color = Storage.userAvatarColor(name);
    const g = Storage.getUserGenderFor(name);
    const initial = name.charAt(0).toUpperCase();
    const gIcon = g === 'k' ? '👸' : g === 'e' ? '🤴' : '';
    const statsLine = stats.solved > 0
      ? `${stats.solved} soru • %${stats.rate} başarı`
      : 'Henüz test çözülmedi';
    const streakLine = stats.streak > 1 ? `🔥 ${stats.streak} günlük seri` : '';

    const planLabel = Storage.isPremiumUserFor(name) ? '<span class="user-plan-tag">VIP</span>' : '';
    return `
      <button class="user-card-btn" data-user="${esc(name)}">
        <button class="user-card-del" data-del="${esc(name)}" title="Kullanıcıyı Sil">✕</button>
        <div class="user-avatar-circle" style="background:${color}">
          ${initial}
        </div>
        <div class="user-card-name">${gIcon ? gIcon + ' ' : ''}${esc(name)} ${planLabel}</div>
        <div class="user-card-stats">${esc(statsLine)}${streakLine ? '<br>' + esc(streakLine) : ''}</div>
      </button>`;
  }).join('');

  const addBtn = `
    <button class="user-card-btn user-card-new" id="add-user-card-btn">
      <div class="user-avatar-circle">＋</div>
      <div class="user-card-name">Yeni Kullanıcı</div>
      <div class="user-card-stats">Hesap oluştur</div>
    </button>`;

  grid.innerHTML = cards + addBtn;

  // Events
  grid.querySelectorAll('.user-card-btn:not(.user-card-new)').forEach(btn => {
    btn.addEventListener('click', e => {
      if (e.target.closest('.user-card-del')) return;
      selectUser(btn.dataset.user);
    });
  });
  grid.querySelectorAll('.user-card-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const name = btn.dataset.del;
      if (confirm(`"${name}" kullanıcısını ve tüm verilerini silmek istiyor musun?`)) {
        Storage.deleteUser(name);
        renderUserCards();
      }
    });
  });
  $('add-user-card-btn')?.addEventListener('click', () => {
    $('new-user-form').classList.remove('hidden');
    $('new-user-input').focus();
  });
}

function selectUser(name) {
  Storage.setActiveUser(name);
  // Kullanıcının temasını uygula
  const theme = Storage.getSettings().theme || 'default';
  document.documentElement.setAttribute('data-theme', theme);
  updateUserPill();
  hideUserSelect();
  navigate('home');
}

function updateUserPill() {
  const btn = $('switch-user-btn');
  if (!btn) return;
  const name = Storage.getActiveUser();
  if (!name) { btn.textContent = '👤'; return; }
  const color = Storage.userAvatarColor(name);
  const character = isPremiumUser() ? Storage.getUserCharacter() : '';
  const initial = character || name.charAt(0).toUpperCase();
  btn.innerHTML = `
    <div class="user-switch-avatar" style="background:${color}">${initial}</div>
    <span>${esc(name)}${isPremiumUser() ? ' <span class="user-plan-tag">VIP</span>' : ''}</span>`;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  // Eski tek-kullanıcı verisini yeni formata taşı
  Storage.migrateOldData();

  // Tema önce uygula
  const savedTheme = Storage.getSettings().theme || 'default';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Yeni kullanıcı formu olayları
  $('new-user-submit').addEventListener('click', createNewUser);
  $('new-user-input').addEventListener('keydown', e => { if (e.key === 'Enter') createNewUser(); });
  $('new-user-cancel').addEventListener('click', () => {
    $('new-user-form').classList.add('hidden');
    $('new-user-input').value = '';
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
  });
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Kullanıcı değiştir butonu
  $('switch-user-btn').addEventListener('click', showUserSelect);

  // Ana uygulama nav olayları
  $('name-submit')?.addEventListener('click', submitName);
  $('name-input')?.addEventListener('keydown', e => e.key === 'Enter' && submitName());
  $('brand-home').addEventListener('click', () => { navigate('home'); setActiveNav('nav-home'); });
  $('nav-home').addEventListener('click', () => { navigate('home'); setActiveNav('nav-home'); });
  $('nav-badges').addEventListener('click', () => { navigate('badges'); setActiveNav('nav-badges'); });
  $('nav-wrong').addEventListener('click', () => { navigate('wrong'); setActiveNav('nav-wrong'); });
  $('nav-missions').addEventListener('click', () => { navigate('missions'); setActiveNav('nav-missions'); });
  $('nav-tools').addEventListener('click', () => { navigate('tools'); setActiveNav('nav-tools'); });
  $('nav-profile').addEventListener('click', () => { navigate('profile'); setActiveNav('nav-profile'); });
  $('nav-settings').addEventListener('click', () => { navigate('settings'); setActiveNav('nav-settings'); });

  // Veri yükle
  spawnParticles();
  await loadAllSubjects();

  // Kullanıcı kontrolü
  const users = Storage.getUserList();
  const active = Storage.getActiveUser();

  if (users.length === 0) {
    // Hiç kullanıcı yok → kullanıcı oluştur ekranı
    showUserSelect();
  } else if (!active || !users.includes(active)) {
    // Aktif kullanıcı yok veya listede değil → seçim ekranı
    showUserSelect();
  } else {
    // Kullanıcı var → direkt ana ekran
    hideUserSelect();
    updateUserPill();
    Storage.resetDailyMissions();
    navigate('home');
  }

  maybeShowDailyNotifications();
});

// ── Bildirimler (günlük hatırlatıcı + güncel bilgi) ──
function maybeShowDailyNotifications() {
  try {
    if (typeof Notification === 'undefined') return;
    const settings = Storage.getNotificationSettings();
    if (!settings.reminders && !settings.updates) return;

    if (Notification.permission === 'default') { Notification.requestPermission(); return; }
    if (Notification.permission !== 'granted') return;

    const lastKey = 'kpss_v2_last_notif_date';
    const today = new Date().toDateString();
    if (localStorage.getItem(lastKey) === today) return;
    localStorage.setItem(lastKey, today);

    if (settings.reminders) {
      const msgs = [
        'Bugün 10 soru çözmeye ne dersin? 📝',
        'KPSS\'ye bir adım daha yaklaş, hadi başla! 🚀',
        'Az kaldı, bugün de çalışmayı unutma! 🔥',
        'Serini bozma, bugün bir test daha çöz! 💪',
      ];
      new Notification('KPSS Hazırlık', { body: msgs[Math.floor(Math.random() * msgs.length)] });
    }
    if (settings.updates) {
      const guncel = SUBJECTS.find(s => s.id === 'guncel' && s.data);
      const points = guncel ? guncel.data.konular.flatMap(t => (t.anlatim?.anahtarNoktalar || []).map(p => ({ tbaslik: t.baslik, text: p }))) : [];
      const dm = points.length ? points[Math.floor(Math.random() * points.length)] : _dailyMnemonic();
      if (dm) {
        setTimeout(() => {
          new Notification('📰 Güncel Bilgi', { body: `${dm.tbaslik}: ${dm.text}`.slice(0, 180) });
        }, 4000);
      }
    }
  } catch { /* Notification API desteklenmiyor veya izin verilmedi */ }
}

function createNewUser() {
  const val = $('new-user-input').value.trim();
  if (!val) { $('new-user-input').focus(); return; }
  const selectedGender = document.querySelector('.gender-btn.selected')?.dataset.g || '';
  const name = Storage.addUser(val);
  $('new-user-input').value = '';
  $('new-user-form').classList.add('hidden');
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
  selectUser(name);
  Storage.setUserGender(selectedGender);
  Storage.resetDailyMissions();
  const toastMsg = selectedGender === 'k'
    ? `Hoş geldin, Prenses ${name}! 👸`
    : selectedGender === 'e'
      ? `Hoş geldin, ${name}! 🚀`
      : `Hoş geldin, ${name}! 🌸`;
  toast(toastMsg, 'success');
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-pill').forEach(el => el.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
}

function submitName() {
  const val = $('name-input').value.trim();
  if (!val) { $('name-input').focus(); return; }
  Storage.setUserName(val);
  $('name-modal')?.classList.add('hidden');
  Storage.touchStreak();
  render();
  toast(`Hoş geldin, ${Storage.getUserName()}! 🌸`, 'success');
}
