// data/*.json içeriklerinin uygulamanın beklediği şemaya uyduğunu doğrular
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

let errors = [];
let warnings = [];
const allTopicIds = new Set();
let totalTopics = 0;
let totalQuestions = 0;

if (!files.length) {
  console.error('data/ klasöründe hiç JSON dosyası bulunamadı.');
  process.exit(1);
}

for (const file of files) {
  const full = path.join(dataDir, file);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors.push(`${file}: geçersiz JSON - ${e.message}`);
    continue;
  }

  if (!json.id) errors.push(`${file}: "id" eksik`);
  if (!json.ad) errors.push(`${file}: "ad" eksik`);
  if (!Array.isArray(json.konular) || !json.konular.length) {
    errors.push(`${file}: "konular" dizisi eksik veya boş`);
    continue;
  }

  json.konular.forEach((t, ti) => {
    const tag = `${file} > konu[${ti}]`;
    if (!t.id) errors.push(`${tag}: "id" eksik`);
    else {
      if (allTopicIds.has(t.id)) errors.push(`${tag}: tekrarlanan topic id "${t.id}"`);
      allTopicIds.add(t.id);
    }
    if (!t.baslik) errors.push(`${tag}: "baslik" eksik`);
    if (!t.anlatim || !t.anlatim.ozet) errors.push(`${tag}: anlatim.ozet eksik`);
    if (!t.anlatim || !Array.isArray(t.anlatim.icerik) || !t.anlatim.icerik.length) {
      errors.push(`${tag}: anlatim.icerik eksik veya boş`);
    }
    if (!Array.isArray(t.sorular) || t.sorular.length < 8) {
      errors.push(`${tag}: en az 8 soru olmalı (şu an ${t.sorular ? t.sorular.length : 0})`);
    } else {
      totalTopics += 1;
      totalQuestions += t.sorular.length;
      t.sorular.forEach((q, qi) => {
        const qtag = `${tag} > soru[${qi}]`;
        if (!q.soru) errors.push(`${qtag}: "soru" metni eksik`);
        if (!Array.isArray(q.secenekler) || q.secenekler.length !== 5) {
          errors.push(`${qtag}: "secenekler" tam olarak 5 eleman içermeli (şu an ${q.secenekler ? q.secenekler.length : 0})`);
        }
        if (typeof q.dogruIndex !== 'number' || q.dogruIndex < 0 || q.dogruIndex > 4) {
          errors.push(`${qtag}: "dogruIndex" 0-4 arası bir sayı olmalı`);
        }
        if (!q.aciklama) errors.push(`${qtag}: "aciklama" eksik`);
      });
    }
  });
}

if (warnings.length) {
  console.warn('Uyarılar:');
  warnings.forEach(w => console.warn('  - ' + w));
}

if (errors.length) {
  console.error(`\n${errors.length} hata bulundu:`);
  errors.forEach(e => console.error('  ✗ ' + e));
  process.exit(1);
}

console.log(`✓ Veri doğrulandı: ${files.length} ders, ${totalTopics} konu, ${totalQuestions} soru.`);
