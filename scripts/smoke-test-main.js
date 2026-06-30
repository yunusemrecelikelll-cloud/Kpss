// Geliştirme amaçlı otomatik uçtan uca duman testi (production build'e dahil edilmez)
const { app, BrowserWindow } = require('electron');
const path = require('path');

async function run() {
  await app.whenReady();
  const win = new BrowserWindow({
    width: 1180, height: 800, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });

  const logs = [];
  win.webContents.on('console-message', (e, level, message) => {
    logs.push(`[console:${level}] ${message}`);
  });
  win.webContents.on('did-fail-load', (e, code, desc) => logs.push(`[did-fail-load] ${code} ${desc}`));

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 1500));

  async function ex(script) {
    return win.webContents.executeJavaScript(script, true);
  }

  const results = {};

  results.subjectsLoaded = await ex(`SUBJECTS.map(s => ({id:s.id, konular: s.data ? s.data.konular.length : -1}))`);

  await ex(`document.getElementById('name-input').value = 'Zeynep'; document.getElementById('name-submit').click(); true`);
  await new Promise(r => setTimeout(r, 200));
  results.userNameAfterSubmit = await ex(`Storage.getUserName()`);
  results.homeStatGridExists = await ex(`!!document.querySelector('.stat-grid')`);
  results.subjectCardCount = await ex(`document.querySelectorAll('.subject-card').length`);

  await ex(`navigate('subject', {subjectId: 'turkce'}); true`);
  await new Promise(r => setTimeout(r, 150));
  results.topicListCount = await ex(`document.querySelectorAll('.topic-row').length`);

  const firstTopicId = await ex(`SUBJECTS.find(s=>s.id==='turkce').data.konular[0].id`);
  results.firstTopicId = firstTopicId;

  await ex(`navigate('topic', {subjectId:'turkce', topicId: ${JSON.stringify(firstTopicId)}}); true`);
  await new Promise(r => setTimeout(r, 150));
  results.lectureCardExists = await ex(`!!document.querySelector('.lecture-card')`);
  results.lecturePointCount = await ex(`document.querySelectorAll('.lecture-points li').length`);

  await ex(`goToQuiz('turkce', ${JSON.stringify(firstTopicId)}); true`);
  await new Promise(r => setTimeout(r, 150));
  results.quizTimerText = await ex(`document.getElementById('quiz-timer').textContent`);
  results.quizQuestionCount = await ex(`Quiz.getState().questions.length`);

  const qCount = results.quizQuestionCount;
  for (let i = 0; i < qCount; i++) {
    await ex(`document.querySelectorAll('.option-row')[0].click(); true`);
    await new Promise(r => setTimeout(r, 30));
    if (i < qCount - 1) {
      await ex(`document.getElementById('quiz-next').click(); true`);
      await new Promise(r => setTimeout(r, 30));
    }
  }
  await ex(`document.getElementById('quiz-finish').click(); true`);
  await new Promise(r => setTimeout(r, 250));

  results.resultScoreText = await ex(`document.querySelector('.result-score') ? document.querySelector('.result-score').textContent : null`);
  results.resultMessageText = await ex(`document.querySelector('.result-message') ? document.querySelector('.result-message').textContent : null`);
  results.reviewItemCount = await ex(`document.querySelectorAll('.review-item').length`);
  results.completedTopics = await ex(`Storage.getCompletedTopics()`);
  results.attempts = await ex(`Storage.getAttempts()`);

  await ex(`navigate('subject', {subjectId:'turkce'}); true`);
  await new Promise(r => setTimeout(r, 150));
  results.topicCheckDoneCount = await ex(`document.querySelectorAll('.topic-check.done').length`);
  results.topicBestScoreText = await ex(`document.querySelector('.topic-best') ? document.querySelector('.topic-best').textContent : null`);

  await ex(`navigate('home'); true`);
  await new Promise(r => setTimeout(r, 150));
  results.homeAfterAttemptStats = await ex(`document.querySelectorAll('.stat-card .stat-value')[1] ? document.querySelectorAll('.stat-card .stat-value')[1].textContent : null`);

  console.log('SMOKE_TEST_RESULTS_JSON_START');
  console.log(JSON.stringify({ results, logs }, null, 2));
  console.log('SMOKE_TEST_RESULTS_JSON_END');

  app.quit();
}

run().catch(e => {
  console.log('SMOKE_TEST_FATAL_ERROR', e.stack || e.message);
  app.exit(1);
});
