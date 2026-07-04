const { app, BrowserWindow } = require('electron');
const path = require('path');

async function run() {
  await app.whenReady();
  const win = new BrowserWindow({ width: 1180, height: 800, show: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false } });

  const logs = [];
  win.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2) logs.push(`[ERR] ${msg}`);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 2000));

  const ex = s => win.webContents.executeJavaScript(s, true);

  const results = {};

  // Subjects loaded?
  results.subjects = await ex(`SUBJECTS.map(s=>({id:s.id,loaded:!!s.data,konular:s.data?.konular?.length||0}))`);

  // Name modal
  await ex(`document.getElementById('name-input').value='Ayşe'; document.getElementById('name-submit').click(); true`);
  await new Promise(r => setTimeout(r, 300));
  results.userName = await ex(`Storage.getUserName()`);
  results.homeLoaded = await ex(`!!document.querySelector('.hero-card')`);
  results.subjectCards = await ex(`document.querySelectorAll('.subject-card').length`);
  results.fullTestBtn = await ex(`!!document.getElementById('fulltest-btn')`);

  // Navigate to first available subject
  const firstSid = await ex(`SUBJECTS.find(s=>s.data)?.id`);
  results.firstSubject = firstSid;
  await ex(`navigate('subject',{sid:${JSON.stringify(firstSid)}}); true`);
  await new Promise(r => setTimeout(r, 200));
  results.topicRows = await ex(`document.querySelectorAll('.topic-row').length`);

  // Topic page
  const firstTid = await ex(`SUBJECTS.find(s=>s.id===${JSON.stringify(firstSid)})?.data?.konular?.[0]?.id`);
  await ex(`navigate('topic',{sid:${JSON.stringify(firstSid)},tid:${JSON.stringify(firstTid)}}); true`);
  await new Promise(r => setTimeout(r, 200));
  results.lectureLoaded = await ex(`!!document.querySelector('.lecture-card')`);
  results.ytLink = await ex(`document.querySelector('.yt-link')?.href?.includes('youtube') || false`);

  // Quiz
  const qs = await ex(`SUBJECTS.find(s=>s.id===${JSON.stringify(firstSid)})?.data?.konular?.[0]?.sorular?.slice(0,5)`);
  await ex(`Quiz.start(${JSON.stringify(firstSid)},'Test',${JSON.stringify(firstTid)},'Test Konu',${JSON.stringify(qs)},false); navigate('quiz'); Timer.start(325,()=>{},()=>{}); true`);
  await new Promise(r => setTimeout(r, 200));
  results.quizTimer = await ex(`document.getElementById('quiz-timer')?.textContent`);
  results.quizOpts = await ex(`document.querySelectorAll('.q-opt').length`);

  // Answer all and finish
  for (let i=0;i<5;i++) {
    await ex(`document.querySelectorAll('.q-opt')[${i%5}].click(); true`);
    await new Promise(r=>setTimeout(r,50));
    if (i<4) await ex(`document.getElementById('q-next')?.click(); true`);
  }
  await ex(`document.getElementById('q-finish').click(); true`);
  await new Promise(r=>setTimeout(r,500));
  results.resultScore = await ex(`document.querySelector('.score-num')?.textContent`);
  results.reviewItems = await ex(`document.querySelectorAll('.review-item').length`);

  // Leaderboard page
  await ex(`navigate('leaderboard'); true`);
  await new Promise(r=>setTimeout(r,300));
  results.lbLoaded = await ex(`!!document.querySelector('h2')`);

  // Badges page
  await ex(`navigate('badges'); true`);
  await new Promise(r=>setTimeout(r,200));
  results.badgesGrid = await ex(`document.querySelectorAll('.badge-item').length`);

  // Wrong bank
  await ex(`navigate('wrong'); true`);
  await new Promise(r=>setTimeout(r,200));
  results.wrongPage = await ex(`!!document.getElementById('view-root').innerHTML.length`);

  console.log('V2_SMOKE_RESULTS_START');
  console.log(JSON.stringify({results, errors: logs}, null, 2));
  console.log('V2_SMOKE_RESULTS_END');
  app.quit();
}

run().catch(e => { console.error('FATAL:', e.message); app.exit(1); });
