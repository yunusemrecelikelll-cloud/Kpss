// Mouse toz efekti — ayarlardan açılıp/kapatılabilir, renk seçilebilir
(function () {
  const COLOR_THEMES = {
    rainbow: ['#a78bfa','#f472b6','#fbbf24','#34d399','#38bdf8','#c4b5fd','#fb7185'],
    violet:  ['#8b5cf6','#a78bfa','#c4b5fd','#7c3aed','#ddd6fe'],
    rose:    ['#f472b6','#fb7185','#fda4af','#e11d48','#fce7f3'],
    gold:    ['#fbbf24','#f59e0b','#fde68a','#d97706','#fef3c7'],
    mint:    ['#34d399','#10b981','#6ee7b7','#059669','#a7f3d0'],
    white:   ['#ffffff','#e2e8f0','#f1f5f9','#cbd5e1','#f8fafc'],
  };

  const SKIP = '.btn,.q-opt,.option-row,.q-dot,.nav-pill,.nav-btn,button,input,select,a';
  let last = 0;
  const THROTTLE = 28; // ~35 olay/sn maksimum

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('kpss_v2_settings')) || {}; }
    catch { return {}; }
  }

  function isSafe(el) {
    if (!el) return true;
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'A' || tag === 'TEXTAREA') return false;
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
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 parçacık
    for (let i = 0; i < count; i++) spawnDust(e.clientX, e.clientY, theme);
  });

  function spawnDust(x, y, colors) {
    const el = document.createElement('div');
    el.className = 'm-spark';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = (Math.random() * 2.5 + 1.5).toFixed(1); // 1.5-4 px — küçük toz
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * 10 + 3; // 3-13 px — kısa kuyruk
    const jitterX = (Math.random() - 0.5) * 4;
    const jitterY = (Math.random() - 0.5) * 4;
    const dx = (Math.cos(angle) * dist + jitterX).toFixed(1) + 'px';
    const dy = (Math.sin(angle) * dist + jitterY).toFixed(1) + 'px';
    const dur = (Math.random() * 0.15 + 0.25).toFixed(2) + 's'; // 0.25-0.40s — hızlı yok

    el.style.cssText =
      `left:${x}px;top:${y}px;` +
      `width:${size}px;height:${size}px;` +
      `background:${color};` +
      `box-shadow:0 0 ${parseFloat(size) + 2}px ${color}88;` +
      `--dx:${dx};--dy:${dy};` +
      `animation-duration:${dur};`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), parseFloat(dur) * 1000 + 30);
  }
})();
