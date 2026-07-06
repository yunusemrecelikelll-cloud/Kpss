// Mouse toz efekti — yoğun, kısa kuyruklu
(function () {
  const COLOR_THEMES = {
    rainbow: ['#a78bfa','#f472b6','#fbbf24','#34d399','#38bdf8','#c4b5fd','#fb7185','#e879f9'],
    violet:  ['#8b5cf6','#a78bfa','#c4b5fd','#7c3aed','#ddd6fe','#6d28d9'],
    rose:    ['#f472b6','#fb7185','#fda4af','#e11d48','#fce7f3','#f9a8d4'],
    gold:    ['#fbbf24','#f59e0b','#fde68a','#d97706','#fef3c7','#fcd34d'],
    mint:    ['#34d399','#10b981','#6ee7b7','#059669','#a7f3d0','#86efac'],
    white:   ['#ffffff','#e2e8f0','#f1f5f9','#cbd5e1','#f8fafc','#e0e7ff'],
  };

  const SKIP = '.btn,.q-opt,.option-row,.q-dot,.nav-pill,.nav-btn,button,input,select,a,.toggle-switch,.toggle-slider';
  let last = 0;
  const THROTTLE = 16; // ~60 fps

  function getSettings() {
    try {
      const u = localStorage.getItem('kpss_v2_active_user') || '';
      const pre = u
        ? `kpss_v2_${u.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_').slice(0, 40)}_`
        : 'kpss_v2_legacy_';
      return JSON.parse(localStorage.getItem(pre + 'settings')) || {};
    } catch { return {}; }
  }

  function isSafe(el) {
    if (!el) return true;
    const tag = el.tagName;
    if (['BUTTON','INPUT','SELECT','A','TEXTAREA','LABEL'].includes(tag)) return false;
    if (el.closest(SKIP)) return false;
    return true;
  }

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - last < THROTTLE) return;
    last = now;
    const s = getSettings();
    if (s.particleEnabled === false) return;
    if (!isSafe(e.target)) return;
    const theme = COLOR_THEMES[s.particleColor || 'rainbow'] || COLOR_THEMES.rainbow;
    // Yoğun: 4-7 parçacık
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) spawnDust(e.clientX, e.clientY, theme);
  });

  function spawnDust(x, y, colors) {
    const el = document.createElement('div');
    el.className = 'm-spark';
    const color = colors[Math.floor(Math.random() * colors.length)];
    // Küçük toz: 1.5-5px
    const size = (1.5 + Math.random() * 3.5).toFixed(1);
    // Kısa kuyruk: 2-16px
    const angle = Math.random() * Math.PI * 2;
    const dist  = 2 + Math.random() * 14;
    const dx = (Math.cos(angle) * dist).toFixed(1) + 'px';
    const dy = (Math.sin(angle) * dist - Math.random() * 8).toFixed(1) + 'px'; // hafif yukarı doğru
    const dur = (0.2 + Math.random() * 0.25).toFixed(2) + 's';

    el.style.cssText =
      `left:${x}px;top:${y}px;` +
      `width:${size}px;height:${size}px;` +
      `background:${color};` +
      `box-shadow:0 0 ${parseFloat(size)+2}px ${color}aa;` +
      `--dx:${dx};--dy:${dy};` +
      `animation-duration:${dur};`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), parseFloat(dur) * 1000 + 20);
  }
})();
