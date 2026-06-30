// Geliştirme amaçlı: tasarımı gözle kontrol etmek için ekran görüntüsü alır (production'a dahil değil)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = process.argv[2] || path.join(__dirname, '..', '..', 'kpss-screenshots');
fs.mkdirSync(outDir, { recursive: true });

async function run() {
  await app.whenReady();
  const win = new BrowserWindow({
    width: 1180, height: 800, show: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 1200));

  async function ex(script) { return win.webContents.executeJavaScript(script, true); }
  async function shot(name) {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, name), img.toPNG());
  }

  await shot('01-isim-modal.png');

  await ex(`document.getElementById('name-input').value = 'Zeynep'; document.getElementById('name-submit').click(); true`);
  await new Promise(r => setTimeout(r, 300));
  await shot('02-anasayfa.png');

  await ex(`navigate('subject', {subjectId: 'turkce'}); true`);
  await new Promise(r => setTimeout(r, 200));
  await shot('03-ders-konu-listesi.png');

  const firstTopicId = await ex(`SUBJECTS.find(s=>s.id==='turkce').data.konular[0].id`);
  await ex(`navigate('topic', {subjectId:'turkce', topicId: ${JSON.stringify(firstTopicId)}}); true`);
  await new Promise(r => setTimeout(r, 200));
  await shot('04-konu-anlatim.png');

  await ex(`goToQuiz('turkce', ${JSON.stringify(firstTopicId)}); true`);
  await new Promise(r => setTimeout(r, 200));
  await shot('05-test-ekrani.png');

  await ex(`document.querySelectorAll('.option-row')[0].click(); true`);
  await new Promise(r => setTimeout(r, 100));
  await shot('06-test-secim.png');

  const qCount = await ex(`Quiz.getState().questions.length`);
  for (let i = 0; i < qCount; i++) {
    await ex(`document.querySelectorAll('.option-row')[(${i}) % 5].click(); true`);
    await new Promise(r => setTimeout(r, 80));
    if (i < qCount - 1) {
      await ex(`document.getElementById('quiz-next').click(); true`);
      await new Promise(r => setTimeout(r, 80));
    }
    const answeredSoFar = await ex(`Quiz.getState().answers.filter(a => a !== null).length`);
    console.log(`  -> soru ${i + 1} sonrası cevaplanan: ${answeredSoFar}`);
  }
  const unanswered = await ex(`Quiz.getState().answers.filter(a => a === null).length`);
  console.log('Bitirmeden önce bos kalan:', unanswered);
  await ex(`document.getElementById('quiz-finish').click(); true`);
  await new Promise(r => setTimeout(r, 500));
  await shot('07-sonuc-ekrani.png');

  console.log('SCREENSHOTS_DONE:' + outDir);
  app.quit();
}

run().catch(e => { console.log('SCREENSHOT_ERROR', e.stack || e.message); app.exit(1); });
