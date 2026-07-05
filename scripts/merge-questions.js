// Yardımcı betik: yeni soru eklentilerini ana veri dosyasına birleştirir.
// Kullanım: node scripts/merge-questions.js <additions.json> <main-data.json>
// additions.json formatı: { "topic-id": [ {soru, secenekler[5], dogruIndex, aciklama}, ... ] }
'use strict';
const fs = require('fs');
const path = require('path');

const [,, addFile, mainFile] = process.argv;
if (!addFile || !mainFile) {
  console.error('Kullanım: node scripts/merge-questions.js <additions.json> <ana-dosya.json>');
  process.exit(1);
}

const additions = JSON.parse(fs.readFileSync(path.resolve(addFile), 'utf8'));
const main      = JSON.parse(fs.readFileSync(path.resolve(mainFile), 'utf8'));

let totalAdded = 0;
main.konular.forEach(t => {
  const newQs = additions[t.id];
  if (!newQs || !newQs.length) return;
  // Mevcut soruları kontrol et, zaten var olanları atlat
  const existingTexts = new Set(t.sorular.map(q => q.soru.slice(0, 60)));
  const toAdd = newQs.filter(q => !existingTexts.has(q.soru.slice(0, 60)));
  t.sorular = [...t.sorular, ...toAdd];
  totalAdded += toAdd.length;
  console.log(`  [${t.id}]: +${toAdd.length} soru → toplam ${t.sorular.length}`);
});

fs.writeFileSync(path.resolve(mainFile), JSON.stringify(main, null, 2), 'utf8');
console.log(`\nTamamlandı: ${totalAdded} yeni soru eklendi → ${path.basename(mainFile)}`);
