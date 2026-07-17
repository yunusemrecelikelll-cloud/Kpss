// Solitaire — KPSS içerikli, tek kişilik, sıralı kart temizleme oyunu
const Solitaire = (() => {
  let state = null;

  function start(questions, maxMistakes) {
    state = {
      cards: questions.map(q => ({ q, status: 'pending', given: null })),
      cursor: 0,
      mistakes: 0,
      maxMistakes: maxMistakes || 999,
    };
    return state;
  }

  function getState() { return state; }

  function answer(idx) {
    if (!state) return null;
    const c = state.cards[state.cursor];
    if (!c || c.status !== 'pending') return null;
    const correct = idx === c.q.dogruIndex;
    c.status = correct ? 'cleared' : 'wrong';
    c.given = idx;
    if (!correct) state.mistakes++;
    return { correct, cursor: state.cursor };
  }

  function advance() {
    if (!state) return;
    state.cursor++;
  }

  function isFinished() { return !!state && state.cursor >= state.cards.length; }

  function isPassed() {
    if (!state || !state.cards.length) return false;
    const cleared = state.cards.filter(c => c.status === 'cleared').length;
    return cleared / state.cards.length >= 0.7;
  }

  function abandon() { state = null; }

  return { start, getState, answer, advance, isFinished, isPassed, abandon };
})();
