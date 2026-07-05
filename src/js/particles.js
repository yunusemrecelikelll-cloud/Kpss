// Mouse kuyruklu yıldız + toz efekti
(function () {
  const COLORS = ['#a78bfa','#f472b6','#fbbf24','#34d399','#38bdf8','#c4b5fd','#fb7185'];
  const SKIP = new Set(['BUTTON','INPUT','A','SELECT','TEXTAREA']);
  let last = 0;
  const THROTTLE_MS = 20; // saniyede maks ~50 parçacık

  function isSafeTarget(el) {
    if (!el) return true;
    if (SKIP.has(el.tagName)) return false;
    if (el.closest('.btn, .q-opt, .option-row, .q-dot, .nav-pill, .nav-btn, button, input, select')) return false;
    return true;
  }

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - last < THROTTLE_MS) return;
    last = now;

    if (!isSafeTarget(e.target)) return;

    // 2-4 parçacık aynı anda
    const count = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < count; i++) {
      spawnSpark(e.clientX, e.clientY);
    }
  });

  function spawnSpark(x, y) {
    const el = document.createElement('div');
    el.className = 'm-spark';

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = Math.random() * 5 + 2;       // 2-7 px
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 28 + 8;       // ne kadar uzağa uçar
    const dx = (Math.cos(angle) * dist).toFixed(1) + 'px';
    const dy = (Math.sin(angle) * dist).toFixed(1) + 'px';
    const dur = (Math.random() * 0.3 + 0.5).toFixed(2) + 's';

    el.style.cssText =
      `left:${x}px;top:${y}px;` +
      `width:${size}px;height:${size}px;` +
      `background:${color};` +
      `box-shadow:0 0 ${size + 2}px ${color};` +
      `--dx:${dx};--dy:${dy};` +
      `animation-duration:${dur};`;

    document.body.appendChild(el);
    // temizle
    setTimeout(() => el.remove(), parseFloat(dur) * 1000 + 50);
  }
})();
