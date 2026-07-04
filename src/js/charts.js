// Basit CSS-based chart renderer
const Charts = (() => {
  const COLORS = {
    turkce:     { bar: '#8b5cf6', label: '📖 Türkçe' },
    matematik:  { bar: '#f472b6', label: '🔢 Matematik' },
    tarih:      { bar: '#fbbf24', label: '🏛️ Tarih' },
    cografya:   { bar: '#34d399', label: '🗺️ Coğrafya' },
    vatandaslik:{ bar: '#38bdf8', label: '⚖️ Vatandaşlık' },
    guncel:     { bar: '#fb923c', label: '📰 Güncel' },
  };

  function barChart(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const max = Math.max(...data.map(d => d.value), 1);
    el.innerHTML = data.map(d => {
      const pct = Math.round(d.value / max * 100);
      const col = COLORS[d.id] || { bar: '#8b5cf6', label: d.label };
      return `
        <div class="chart-bar-row">
          <div class="chart-label">${col.label}</div>
          <div class="chart-bar-wrap">
            <div class="chart-bar-fill" style="width:${pct}%;background:${col.bar}"></div>
          </div>
          <div class="chart-val" style="color:${col.bar}">${d.value}%</div>
        </div>`;
    }).join('');
  }

  function scoreRing(el, score) {
    const pct = Math.max(0, Math.min(100, score));
    el.style.setProperty('--score-pct', `${pct * 3.6}deg`);
    el.querySelector('.score-num').textContent = '%' + pct;
  }

  return { barChart, scoreRing };
})();
