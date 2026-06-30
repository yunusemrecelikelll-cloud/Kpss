// electron-builder ile üretilen .app paketini Masaüstüne kopyalar (Mac'te çalıştırılır)
const fs = require('fs');
const path = require('path');
const os = require('os');

const distDir = path.join(__dirname, '..', 'dist');

function findApp(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.app')) return full;
      const found = findApp(full);
      if (found) return found;
    }
  }
  return null;
}

const appPath = findApp(distDir);
if (!appPath) {
  console.error('KPSS.app bulunamadı. "npm run build:mac" komutunun electron-builder adımı başarısız olmuş olabilir.');
  process.exit(1);
}

const desktop = path.join(os.homedir(), 'Desktop');
const target = path.join(desktop, path.basename(appPath));

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(appPath, target, { recursive: true });

console.log(`✓ KPSS uygulaması Masaüstüne kopyalandı: ${target}`);
