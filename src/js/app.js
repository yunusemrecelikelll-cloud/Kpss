// Uygulama yönlendirme + ekran çizimi
const SUBJECTS = [
  { id: 'turkce', ad: 'Türkçe', icon: '📖', dosya: 'data/turkce.json' },
  { id: 'matematik', ad: 'Matematik', icon: '🔢', dosya: 'data/matematik.json' },
  { id: 'tarih', ad: 'Tarih', icon: '🏛️', dosya: 'data/tarih.json' },
  { id: 'cografya', ad: 'Coğrafya', icon: '🗺️', dosya: 'data/cografya.json' },
  { id: 'vatandaslik', ad: 'Vatandaşlık', icon: '⚖️', dosya: 'data/vatandaslik.json' }
];

let currentView = 'home';
let currentParams = {};

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function getSubject(id) {
  return SUBJECTS.find(s => s.id === id);
}

function getTopic(subject, topicId) {
  return subject.data.konular.find(t => t.id === topicId);
}

async function loadAllSubjects() {
  const results = await Promise.all(
    SUBJECTS.map(s => fetch(s.dosya).then(r => r.json()))
  );
  SUBJECTS.forEach((s, i) => { s.data = results[i]; });
}

function setRoot(html) {
  document.getElementById('view-root').innerHTML = html;
}

function navigate(view, params = {}) {
  Timer.stop();
  currentView = view;
  currentParams = params;
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (currentView === 'home') return renderHome();
  if (currentView === 'subject') return renderSubjectPage(currentParams.subjectId);
  if (currentView === 'topic') return renderTopicPage(currentParams.subjectId, currentParams.topicId);
  if (currentView === 'quiz') return renderQuizScreen();
  if (currentView === 'result') return renderResultScreen(currentParams.result);
}

/* ---------------- Anasayfa ---------------- */
function computeOverallStats() {
  const attempts = Storage.getAttempts();
  const completed = Storage.getCompletedTopics();
  const totalTopics = SUBJECTS.reduce((sum, s) => sum + s.data.konular.length, 0);
  const completedCount = SUBJECTS.reduce(
    (sum, s) => sum + s.data.konular.filter(t => completed[t.id]).length, 0
  );
  const totalSolved = attempts.reduce((sum, a) => sum + a.toplam, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.dogru, 0);
  const successRate = totalSolved ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  const subjectStats = SUBJECTS.map(s => {
    const subAttempts = attempts.filter(a => a.subjectId === s.id);
    const avg = subAttempts.length
      ? Math.round(subAttempts.reduce((sum, a) => sum + a.skor, 0) / subAttempts.length)
      : null;
    return { id: s.id, ad: s.ad, avg };
  });

  return { totalTopics, completedCount, totalSolved, successRate, subjectStats, attemptsCount: attempts.length };
}

function renderHome() {
  const name = Storage.getUserName();
  const stats = computeOverallStats();

  const subjectCards = SUBJECTS.map(s => {
    const total = s.data.konular.length;
    const completed = Storage.getCompletedTopics();
    const done = s.data.konular.filter(t => completed[t.id]).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
      <div class="card subject-card" data-subject="${s.id}">
        <div class="subject-icon">${s.icon}</div>
        <div class="subject-name">${esc(s.ad)}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">${done}/${total} konu tamamlandı</div>
      </div>`;
  }).join('');

  let strongest = '', weakest = '';
  const withAvg = stats.subjectStats.filter(s => s.avg !== null);
  if (withAvg.length) {
    const sorted = [...withAvg].sort((a, b) => b.avg - a.avg);
    strongest = sorted[0].ad;
    weakest = sorted[sorted.length - 1].ad;
  }

  setRoot(`
    <div class="card hero">
      <div class="hero-greeting">Merhaba, ${esc(name || 'Aday')}! 🌙</div>
      <p class="hero-sub">2026 Ortaöğretim KPSS hazırlığında bugün hangi konuyu çalışmak istersin?</p>
    </div>

    <div class="stat-grid">
      <div class="card stat-card">
        <div class="stat-value">${stats.successRate}%</div>
        <div class="stat-label">Genel Başarı Oranı</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${stats.totalSolved}</div>
        <div class="stat-label">Çözülen Soru</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${stats.completedCount}/${stats.totalTopics}</div>
        <div class="stat-label">Tamamlanan Konu</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${stats.attemptsCount}</div>
        <div class="stat-label">Çözülen Test</div>
      </div>
    </div>

    ${withAvg.length ? `
    <div class="card stat-card" style="margin-bottom:30px;">
      <div class="stat-label" style="margin-bottom:6px;">🏆 En güçlü dersin: <b style="color:var(--success)">${esc(strongest)}</b> &nbsp;•&nbsp; 🌱 Biraz daha çalışman gereken: <b style="color:var(--accent-2)">${esc(weakest)}</b></div>
    </div>` : ''}

    <div class="section-title">Dersler</div>
    <div class="subject-grid">${subjectCards}</div>
  `);

  document.querySelectorAll('.subject-card').forEach(el => {
    el.addEventListener('click', () => navigate('subject', { subjectId: el.dataset.subject }));
  });
}

/* ---------------- Ders / Konu Listesi ---------------- */
function renderSubjectPage(subjectId) {
  const subject = getSubject(subjectId);
  const completed = Storage.getCompletedTopics();

  const rows = subject.data.konular.map(t => {
    const done = !!completed[t.id];
    const best = Storage.getBestScoreForTopic(t.id);
    return `
      <div class="card topic-row" data-topic="${t.id}">
        <div class="topic-row-left">
          <div class="topic-check ${done ? 'done' : ''}">${done ? '✓' : ''}</div>
          <div>
            <div class="topic-title">${esc(t.baslik)}</div>
            ${best !== null ? `<div class="topic-best">En iyi skor: %${best}</div>` : `<div class="topic-best">Henüz çözülmedi</div>`}
          </div>
        </div>
        <div class="topic-arrow">›</div>
      </div>`;
  }).join('');

  setRoot(`
    <div class="breadcrumb">
      <span class="clickable" data-nav="home">Anasayfa</span><span>›</span><span>${esc(subject.ad)}</span>
    </div>
    <h2>${subject.icon} ${esc(subject.ad)}</h2>
    <p style="margin-bottom:24px;">Bu derste ${subject.data.konular.length} konu var. Sırayla çalışmanı öneririz, ama dilediğin konudan başlayabilirsin.</p>
    <div class="topic-list">${rows}</div>
  `);

  document.querySelector('[data-nav="home"]').addEventListener('click', () => navigate('home'));
  document.querySelectorAll('.topic-row').forEach(el => {
    el.addEventListener('click', () => navigate('topic', { subjectId, topicId: el.dataset.topic }));
  });
}

/* ---------------- Konu Anlatımı ---------------- */
function renderTopicPage(subjectId, topicId) {
  const subject = getSubject(subjectId);
  const topic = getTopic(subject, topicId);
  const a = topic.anlatim;
  const durationSec = Timer.durationForQuestionCount(topic.sorular.length);
  const durationMin = Math.round(durationSec / 60);

  setRoot(`
    <div class="breadcrumb">
      <span class="clickable" data-nav="home">Anasayfa</span><span>›</span>
      <span class="clickable" data-nav="subject">${esc(subject.ad)}</span><span>›</span>
      <span>${esc(topic.baslik)}</span>
    </div>

    <div class="topic-header">
      <div class="topic-eyebrow">${esc(subject.ad)} • Konu Anlatımı</div>
      <h2>${esc(topic.baslik)}</h2>
    </div>

    <div class="card lecture-card">
      <div class="lecture-summary">${esc(a.ozet)}</div>
      ${a.icerik.map(p => `<p class="lecture-paragraph">${esc(p)}</p>`).join('')}
      ${a.anahtarNoktalar && a.anahtarNoktalar.length ? `
        <ul class="lecture-points">
          ${a.anahtarNoktalar.map(k => `<li>${esc(k)}</li>`).join('')}
        </ul>` : ''}
    </div>

    <div class="card start-test-bar">
      <div class="start-test-info">${topic.sorular.length} soru • yaklaşık ${durationMin} dakika • gerçek sınav temposunda</div>
      <button class="btn btn-primary" id="start-test-btn">Teste Başla →</button>
    </div>
  `);

  document.querySelector('[data-nav="home"]').addEventListener('click', () => navigate('home'));
  document.querySelector('[data-nav="subject"]').addEventListener('click', () => navigate('subject', { subjectId }));
  document.getElementById('start-test-btn').addEventListener('click', () => goToQuiz(subjectId, topicId));
}

/* ---------------- Test Ekranı ---------------- */
function goToQuiz(subjectId, topicId) {
  const subject = getSubject(subjectId);
  const topic = getTopic(subject, topicId);
  Quiz.start(subject, topic);
  currentView = 'quiz';
  currentParams = { subjectId, topicId };
  renderQuizScreen();
  const state = Quiz.getState();
  Timer.start(state.durationSec, updateTimerDisplay, () => finishQuiz());
}

function updateTimerDisplay(remaining) {
  const el = document.getElementById('quiz-timer');
  if (!el) return;
  el.textContent = Timer.format(remaining);
  el.classList.toggle('warning', remaining <= 60);
}

function renderQuizScreen() {
  const state = Quiz.getState();
  if (!state) return;
  const q = state.questions[state.currentIndex];
  const selected = state.answers[state.currentIndex];
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const dots = state.questions.map((_, i) => `
    <div class="quiz-dot ${state.answers[i] !== null ? 'answered' : ''} ${i === state.currentIndex ? 'current' : ''}" data-goto="${i}">${i + 1}</div>
  `).join('');

  const options = q.secenekler.map((opt, i) => `
    <div class="option-row ${selected === i ? 'selected' : ''}" data-option="${i}">
      <div class="option-letter">${letters[i]}</div>
      <div class="option-text">${esc(opt)}</div>
    </div>
  `).join('');

  setRoot(`
    <div class="quiz-top">
      <div>
        <div class="quiz-progress-text">${esc(state.subjectAd)} • ${esc(state.topicBaslik)}</div>
        <div class="quiz-progress-text">Soru ${state.currentIndex + 1} / ${state.questions.length}</div>
      </div>
      <div class="quiz-timer" id="quiz-timer">${Timer.format(state.durationSec)}</div>
    </div>

    <div class="quiz-dots">${dots}</div>

    <div class="card question-card">
      <div class="question-text">${esc(q.soru)}</div>
      <div class="option-list">${options}</div>
    </div>

    <div class="quiz-nav">
      <button class="btn btn-ghost" id="quiz-prev" ${state.currentIndex === 0 ? 'disabled' : ''}>← Önceki</button>
      <div class="quiz-nav-right">
        ${state.currentIndex < state.questions.length - 1
          ? `<button class="btn btn-secondary" id="quiz-next">Sonraki →</button>`
          : ''}
        <button class="btn btn-primary" id="quiz-finish">Testi Bitir</button>
      </div>
    </div>
  `);

  document.querySelectorAll('.option-row').forEach(el => {
    el.addEventListener('click', () => {
      Quiz.answerCurrent(Number(el.dataset.option));
      renderQuizScreen();
    });
  });
  document.querySelectorAll('.quiz-dot').forEach(el => {
    el.addEventListener('click', () => {
      Quiz.goTo(Number(el.dataset.goto));
      renderQuizScreen();
    });
  });
  const prevBtn = document.getElementById('quiz-prev');
  if (prevBtn) prevBtn.addEventListener('click', () => { Quiz.prev(); renderQuizScreen(); });
  const nextBtn = document.getElementById('quiz-next');
  if (nextBtn) nextBtn.addEventListener('click', () => { Quiz.next(); renderQuizScreen(); });
  document.getElementById('quiz-finish').addEventListener('click', () => {
    const unanswered = state.answers.filter(a => a === null).length;
    if (unanswered > 0) {
      const ok = confirm(`${unanswered} soruyu boş bıraktın. Yine de testi bitirmek istiyor musun?`);
      if (!ok) return;
    }
    finishQuiz();
  });
}

function finishQuiz() {
  const state = Quiz.getState();
  if (!state) return;
  const totalDuration = state.durationSec;
  const elapsed = Timer.elapsedSeconds(totalDuration);
  Timer.stop();
  const result = Quiz.finish(elapsed);

  Storage.addAttempt({
    topicId: result.topicId,
    subjectId: result.subjectId,
    tarih: result.tarih,
    dogru: result.dogru,
    yanlis: result.yanlis,
    bos: result.bos,
    toplam: result.toplam,
    skor: result.skor,
    sureSn: result.sureSn
  });
  Storage.markTopicCompleted(result.topicId);

  currentView = 'result';
  currentParams = { result };
  renderResultScreen(result);
}

/* ---------------- Sonuç Ekranı ---------------- */
function personalizedMessage(skor) {
  const name = Storage.getUserName() || 'Aday';
  if (skor >= 80) return `${name}, harika gidiyorsun! Bu konuyu gerçekten kavramışsın. 🌟`;
  if (skor >= 50) return `${name}, fena değil! Yanlışlarını gözden geçirip bir kez daha denersen bu konu tamamen cebinde olacak. 💪`;
  return `${name}, bu konuda biraz daha tekrar yapmakta fayda var. Anlatımı tekrar oku ve yeniden dene — başaracaksın. 🌱`;
}

function renderResultScreen(result) {
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const reviewHtml = result.review.map((r, i) => {
    const optionsHtml = r.secenekler.map((opt, idx) => {
      let cls = '';
      if (idx === r.dogruIndex) cls = 'correct-answer';
      else if (idx === r.verilenIndex) cls = 'wrong-chosen';
      return `<div class="review-option ${cls}">${letters[idx]}) ${esc(opt)}</div>`;
    }).join('');

    const badgeText = r.durum === 'dogru' ? 'Doğru' : r.durum === 'yanlis' ? 'Yanlış' : 'Boş';

    return `
      <div class="card review-item ${r.durum}">
        <div class="review-head">
          <span class="review-badge ${r.durum}">${badgeText}</span>
          <span class="topic-best">Soru ${i + 1}</span>
        </div>
        <div class="review-question">${esc(r.soru)}</div>
        ${optionsHtml}
        <div class="review-explain">💡 ${esc(r.aciklama)}</div>
      </div>`;
  }).join('');

  setRoot(`
    <div class="card result-hero">
      <div class="result-score">%${result.skor}</div>
      <div class="result-score-label">${esc(result.subjectAd)} • ${esc(result.topicBaslik)}</div>
      <div class="result-message">${esc(personalizedMessage(result.skor))}</div>
      <div class="result-stats">
        <div class="result-stat dogru"><div class="result-stat-value">${result.dogru}</div><div class="result-stat-label">Doğru</div></div>
        <div class="result-stat yanlis"><div class="result-stat-value">${result.yanlis}</div><div class="result-stat-label">Yanlış</div></div>
        <div class="result-stat bos"><div class="result-stat-value">${result.bos}</div><div class="result-stat-label">Boş</div></div>
      </div>
      <div class="result-actions">
        <button class="btn btn-secondary" id="result-topic">Konuya Dön</button>
        <button class="btn btn-ghost" id="result-retry">Tekrar Çöz</button>
        <button class="btn btn-primary" id="result-home">Anasayfaya Dön</button>
      </div>
    </div>

    <div class="section-title">Soru Soru Değerlendirme</div>
    <div class="review-list">${reviewHtml}</div>
  `);

  document.getElementById('result-topic').addEventListener('click', () =>
    navigate('topic', { subjectId: result.subjectId, topicId: result.topicId }));
  document.getElementById('result-retry').addEventListener('click', () =>
    goToQuiz(result.subjectId, result.topicId));
  document.getElementById('result-home').addEventListener('click', () => navigate('home'));
}

/* ---------------- Başlangıç ---------------- */
function submitName() {
  const input = document.getElementById('name-input');
  const val = input.value.trim();
  if (!val) { input.focus(); return; }
  Storage.setUserName(val);
  document.getElementById('name-modal').classList.add('hidden');
  render();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllSubjects();

  document.getElementById('name-submit').addEventListener('click', submitName);
  document.getElementById('name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitName();
  });
  document.getElementById('nav-home').addEventListener('click', () => navigate('home'));
  document.getElementById('brand-home').addEventListener('click', () => navigate('home'));

  if (!Storage.getUserName()) {
    document.getElementById('name-modal').classList.remove('hidden');
    document.getElementById('name-input').focus();
  }

  navigate('home');
});
