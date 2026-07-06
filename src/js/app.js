// KPSS v2 — Ana uygulama mantığı
const SUBJECTS = [
  { id: 'guncel',      ad: 'Güncel Bilgiler',    icon: '📰', dosya: 'data/guncel.json' },
  { id: 'vatandaslik', ad: 'Vatandaşlık',        icon: '⚖️', dosya: 'data/vatandaslik.json' },
  { id: 'cografya',    ad: 'Coğrafya',           icon: '🗺️', dosya: 'data/cografya.json' },
  { id: 'tarih',       ad: 'Tarih',              icon: '🏛️', dosya: 'data/tarih.json' },
  { id: 'matematik',   ad: 'Matematik-Geometri', icon: '🔢', dosya: 'data/matematik.json' },
  { id: 'turkce',      ad: 'Türkçe',             icon: '📖', dosya: 'data/turkce.json' },
];

// Tam deneme sınavı dağılımı (toplam 120 soru)
const FULL_TEST_DIST = {
  turkce: 30, matematik: 30, tarih: 24, cografya: 24, vatandaslik: 8, guncel: 4
};

// Ders sınavı: her konudan kaç soru
const SUBJECT_EXAM_Q_PER_TOPIC = 3;

let _view = 'home', _params = {}, _loadErr = false;

const esc = s => { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
const $ = id => document.getElementById(id);
const sub = id => SUBJECTS.find(s => s.id === id);
const topic = (s, tid) => s.data?.konular.find(t => t.id === tid);

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
  const colors = ['#8b5cf6','#f472b6','#34d399','#fbbf24','#38bdf8'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = Math.random() * 4 + 2;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*18}s;animation-duration:${14+Math.random()*12}s`;
    document.body.appendChild(p);
  }
}

// ── Router ──
function navigate(view, params = {}) {
  Timer.stop();
  Sounds.resetTickPhase();
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
  if (v === 'settings') return renderSettings();
  if (v === 'fulltest') return startFullTest();
  if (v === 'subjectexam') return startSubjectExam(_params.sid);
  if (v === 'missions') return renderMissions();
}

// ── Soru bankası: tekrarsız rastgele seçim ──
function pickQuestions(allQuestions, count, topicId) {
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

const MAX_ATTEMPTS_PER_TOPIC = 3;

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
  if (gender === 'e') return `Prens ${name}`;
  return name;
}
function _motivationsFor(gender, streak) {
  const seriBilgi = streak.count > 1
    ? `${streak.count} günlük serideysin!`
    : 'Bugün yeni bir seri başlat!';
  if (gender === 'k') return [
    '👸 Prenses, her doğru cevap seni taçlandırıyor!',
    '💜 Büyük sınav günü geldiğinde hazır olacaksın, inan kendine!',
    '🌸 Canım, bugün çalıştığın her dakika sınav günü gülümsetecek.',
    '✨ Sen bunu başarabilirsin — devam et, prenses!',
    `🏆 ${seriBilgi}`,
  ];
  if (gender === 'e') return [
    '🤴 Prens, her doğru cevap seni zafere yaklaştırıyor!',
    '⚔️ Şampiyon olmak çalışmayı gerektirir — bunu sen bilirsin!',
    '🔥 Bugün çalıştığın her dakika sınav günü güç verecek.',
    '💪 Sen bunu başarabilirsin — devam et, prens!',
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
      <div class="hero-greeting">Merhaba, <span>${esc(_titleFor(gender, name))}</span>! ${gender === 'k' ? '👸' : gender === 'e' ? '🤴' : '🌸'}</div>
      <p class="hero-sub">2026 Ortaöğretim KPSS hazırlığında bugün ne çalışmak istersin?</p>
      <div class="hero-motivation">${motivMsg}</div>
      ${suggestHtml}
    </div>

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
  $('resume-btn')?.addEventListener('click', resumeDraft);
  $('discard-btn')?.addEventListener('click', () => { Storage.clearDraft(); render(); });
  $('go-suggest')?.addEventListener('click', () => suggestion && navigate('topic', { sid: suggestion.s.id, tid: suggestion.t.id }));
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
  const maxed = attCount >= MAX_ATTEMPTS_PER_TOPIC;

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
        🎓 Bu konuyu <b>${MAX_ATTEMPTS_PER_TOPIC} kez</b> çözdün. Sıfırlayıp yeniden başlayabilirsin.
      </p>
      <button class="btn btn-gold" id="reset-btn">🔄 Testleri Sıfırla</button>
    </div>` : `
    <div class="card start-bar">
      <div class="start-info">
        ${qCount} soruluk havuz &nbsp;•&nbsp; her seferinde farklı 10 soru &nbsp;•&nbsp;
        <b>${MAX_ATTEMPTS_PER_TOPIC - attCount} hak kaldı</b>
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
    if (el.dataset.go === 'sub')  el.addEventListener('click', () => navigate('subject', { sid }));
  });
  $('start-btn')?.addEventListener('click', () => {
    const qs = pickQuestions(t.sorular, 10, tid);
    beginQuiz(sid, s.ad, tid, t.baslik, qs, false);
  });
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
  const allQs = [];
  SUBJECTS.forEach(s => {
    if (!s.data) return;
    const n = FULL_TEST_DIST[s.id] || 0;
    if (!n) return;
    const pool = [];
    s.data.konular.forEach(t => (t.sorular || []).forEach(q => pool.push({ ...q, _sid: s.id, _sad: s.ad })));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    allQs.push(...shuffled.slice(0, n));
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
      navigate('quiz');
      Timer.start(draft.durationSec, updateTimer, () => finishQuiz());
      return;
    }
    Storage.clearDraft();
  }
  Quiz.start(sid, sad, tid, tbaslik, questions, isFullTest);
  navigate('quiz');
  Timer.start(Quiz.getState().durationSec, updateTimer, () => finishQuiz());
}

function resumeDraft() {
  const draft = Storage.getDraft();
  if (!draft) return;
  Quiz.restoreFromDraft(draft);
  navigate('quiz');
  Timer.start(draft.durationSec, updateTimer, () => finishQuiz());
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
  const letters = ['A','B','C','D','E'];

  const dots = st.questions.map((_, i) => `
    <div class="q-dot ${st.answers[i] !== null ? 'answered' : ''} ${i === st.currentIndex ? 'current' : ''}" data-i="${i}">${i+1}</div>
  `).join('');

  const opts = q.secenekler.map((o, i) => `
    <div class="q-opt ${st.answers[st.currentIndex] === i ? 'selected' : ''}" data-oi="${i}">
      <div class="opt-letter">${letters[i]}</div>
      <div class="opt-text">${esc(o)}</div>
    </div>`).join('');

  const topicTag = q._topicBaslik ? `<span style="font-size:11px;color:var(--violet);margin-left:8px;opacity:.7">[${esc(q._topicBaslik)}]</span>` : '';
  const kaynak = q.kaynak ? `<span style="font-size:11px;color:var(--text-faint);margin-left:8px">${esc(q.kaynak)}</span>` : '';

  setRoot(`
    <div class="quiz-header">
      <div>
        <div class="quiz-meta"><b>${esc(st.subjectAd)}</b> • ${esc(st.topicBaslik)}</div>
        <div class="quiz-meta">Soru <b>${st.currentIndex+1}</b> / ${st.questions.length}</div>
      </div>
      <div class="quiz-timer" id="quiz-timer">${Timer.format(st.durationSec)}</div>
    </div>
    <div class="quiz-dots">${dots}</div>
    <div class="card q-card">
      <div class="q-number">Soru ${st.currentIndex+1}${topicTag}${kaynak}</div>
      <div class="q-text">${esc(q.soru)}</div>
      <div class="q-options">${opts}</div>
    </div>
    <div class="quiz-nav">
      <button class="btn btn-ghost" id="q-prev" ${st.currentIndex === 0 ? 'disabled' : ''}>← Önceki</button>
      <div class="quiz-nav-right">
        ${st.currentIndex < st.questions.length - 1 ? `<button class="btn btn-secondary" id="q-next">Sonraki →</button>` : ''}
        <button class="btn btn-primary" id="q-finish">Testi Bitir</button>
      </div>
    </div>
  `);

  document.querySelectorAll('.q-dot').forEach(el => el.addEventListener('click', () => { Quiz.goTo(Number(el.dataset.i)); renderQuizView(); }));
  document.querySelectorAll('.q-opt').forEach(el => el.addEventListener('click', () => { Quiz.answer(Number(el.dataset.oi)); renderQuizView(); }));
  $('q-prev')?.addEventListener('click', () => { Quiz.prev(); renderQuizView(); });
  $('q-next')?.addEventListener('click', () => { Quiz.next(); renderQuizView(); });
  $('q-finish')?.addEventListener('click', () => {
    const unanswered = Quiz.getState().answers.filter(a => a === null).length;
    if (unanswered > 0 && !confirm(`${unanswered} soru boş. Yine de bitirmek istiyor musun?`)) return;
    finishQuiz();
  });
}

// ── Finish quiz ──
async function finishQuiz() {
  const st = Quiz.getState();
  if (!st) return;
  const total = st.durationSec;
  const elapsed = Timer.elapsed(total);
  Timer.stop();
  const result = Quiz.finish(elapsed);
  Storage.addAttempt({ ...result });

  // Konu testi ise kullanılan soruları kaydet
  if (result.topicId && result.topicId !== 'full-test' && !result.topicId.endsWith('-sinav')) {
    const usedKeys = result.review.map(r => r.soru.slice(0, 50));
    Storage.addUsedQuestions(result.topicId, usedKeys);
  }

  if (result.skor === 100 || result.skor >= 60) Storage.markTopicCompleted(result.topicId);

  postResultChecks(result);
  await Leaderboard.submitResult(result);

  navigate('result', { result });
}

// ── Result ──
function renderResult(result) {
  const letters = ['A','B','C','D','E'];
  const name = Storage.getActiveUser() || Storage.getUserName() || 'Aday';
  const gender = Storage.getUserGender();
  const title = _titleFor(gender, name);

  function msg(skor) {
    if (gender === 'k') {
      if (skor >= 85) return `${title}, muhteşemsin! 👸✨ Bu konuyu tamamen kavramışsın!`;
      if (skor >= 70) return `${title}, çok iyisin! 💜 Küçük eksiklerini gider, bu konu senin!`;
      if (skor >= 50) return `${title}, fena değil! 🌸 Biraz daha çalışırsan harika olacaksın.`;
      return `${title}, bu konu biraz zorluyordu ama sorun değil! 🤗 Anlatımı tekrar oku ve yeniden dene, sende olur!`;
    }
    if (gender === 'e') {
      if (skor >= 85) return `${title}, muhteşemsin! 🤴⚔️ Bu konuyu tamamen kavramışsın!`;
      if (skor >= 70) return `${title}, çok iyisin! 💪 Küçük eksiklerini gider, bu konu senin!`;
      if (skor >= 50) return `${title}, fena değil! 🔥 Biraz daha çalışırsan harika olacaksın.`;
      return `${title}, bu konu biraz zorluyordu ama sorun değil! 💪 Anlatımı tekrar oku ve yeniden dene, sen yaparsın!`;
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

    const distractorHtml = (r.status === 'yanlis' && r.distractorAciklama) ? `
      <div class="review-distractor"><b>🤔 Büyük ihtimalle neden seçtin?</b> ${esc(r.distractorAciklama)}</div>` : '';

    return `
      <div class="card review-item ${r.status}">
        <div class="review-head">
          <span class="review-badge ${r.status}">${r.status === 'dogru' ? 'Doğru ✓' : r.status === 'yanlis' ? 'Yanlış ✗' : 'Boş'}</span>
          <span class="review-qnum">Soru ${i+1}${r.kaynak ? ` • ${esc(r.kaynak)}` : ''}</span>
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
      if (attempts.length >= MAX_ATTEMPTS_PER_TOPIC) { toast('Bu konu için maksimum test hakkını kullandın. Konuya git ve sıfırla.', 'error', 4000); return; }
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
      <div class="lb-rank">${i+1}</div>
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

// ── Settings ──
function renderSettings() {
  const s = Storage.getSettings();
  const particleOn = s.particleEnabled !== false;
  const pColor = s.particleColor || 'rainbow';
  const soundOn = s.soundEnabled !== false;
  const timerMode = s.timerMode || 'auto';
  const secsPerQ = s.secsPerQ || 65;

  const colorOpts = [
    { id: 'rainbow', label: '🌈', name: 'Gökkuşağı' },
    { id: 'violet',  label: '💜', name: 'Mor' },
    { id: 'rose',    label: '🌸', name: 'Pembe' },
    { id: 'gold',    label: '✨', name: 'Altın' },
    { id: 'mint',    label: '💚', name: 'Mint' },
    { id: 'white',   label: '⚪', name: 'Gümüş' },
  ];

  const currentTheme = s.theme || 'default';
  const themes = [
    { id: 'default',    icon: '🌙', name: 'Gece Yarısı',  bg: 'linear-gradient(135deg,#0a0612,#200a3c)', txt: '#f1eeff' },
    { id: 'safak',      icon: '🌤️', name: 'Şafak',        bg: 'linear-gradient(135deg,#f3edff,#fdf4ff)', txt: '#1e0835' },
    { id: 'pembe',      icon: '🌸', name: 'Pembe Rüya',   bg: 'linear-gradient(135deg,#fff0f6,#fce7f3)', txt: '#3b0a2a' },
    { id: 'zumrut',     icon: '🌿', name: 'Zümrüt',       bg: 'linear-gradient(135deg,#020d0a,#0a3325)', txt: '#ecfdf5' },
    { id: 'gunbatimi',  icon: '🌅', name: 'Gün Batımı',   bg: 'linear-gradient(135deg,#120508,#3d0d1a)', txt: '#fff7ed' },
    { id: 'kutup',      icon: '🧊', name: 'Kutup Gecesi', bg: 'linear-gradient(135deg,#010b18,#0a2a4a)', txt: '#f0f9ff' },
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

  // Kullanıcı değiştir
  $('s-switch-user')?.addEventListener('click', () => showUserSelect());
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
    const stats  = Storage.getUserStats(name);
    const color  = Storage.userAvatarColor(name);
    const g      = Storage.getUserGenderFor(name);
    const initial = name.charAt(0).toUpperCase();
    const gIcon  = g === 'k' ? '👸' : g === 'e' ? '🤴' : '';
    const statsLine = stats.solved > 0
      ? `${stats.solved} soru • %${stats.rate} başarı`
      : 'Henüz test çözülmedi';
    const streakLine = stats.streak > 1 ? `🔥 ${stats.streak} günlük seri` : '';

    return `
      <button class="user-card-btn" data-user="${esc(name)}">
        <button class="user-card-del" data-del="${esc(name)}" title="Kullanıcıyı Sil">✕</button>
        <div class="user-avatar-circle" style="background:${color}">
          ${initial}
        </div>
        <div class="user-card-name">${gIcon ? gIcon + ' ' : ''}${esc(name)}</div>
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
  const initial = name.charAt(0).toUpperCase();
  btn.innerHTML = `
    <div class="user-switch-avatar" style="background:${color}">${initial}</div>
    <span>${esc(name)}</span>`;
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
});

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
  const titleWord = selectedGender === 'k' ? 'Prenses' : selectedGender === 'e' ? 'Prens' : '';
  const emoji = selectedGender === 'k' ? '👸' : selectedGender === 'e' ? '🤴' : '🌸';
  toast(`Hoş geldin, ${titleWord ? titleWord + ' ' : ''}${name}! ${emoji}`, 'success');
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
