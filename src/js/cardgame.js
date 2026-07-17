// Kart Eşleştirme Oyunu — konu anlatımlarındaki anahtar noktalardan terim/tanım eşleştirme
const CardGame = (() => {
  let state = null;

  function _stripLeadingEmoji(s) {
    return s.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  }

  function buildPairs(subjects, count) {
    const pool = [];
    subjects.forEach(s => {
      if (!s.data) return;
      (s.data.konular || []).forEach(t => {
        (t.anlatim?.anahtarNoktalar || []).forEach(raw => {
          const clean = _stripLeadingEmoji(raw);
          const idx = clean.indexOf(':');
          if (idx > 3 && idx < clean.length - 3) {
            const term = clean.slice(0, idx).trim();
            const def = clean.slice(idx + 1).trim();
            if (term && def) pool.push({ term, def });
          }
        });
      });
    });

    const shuffled = pool.sort(() => Math.random() - 0.5);
    const picked = [];
    const seen = new Set();
    for (const p of shuffled) {
      if (seen.has(p.term)) continue;
      seen.add(p.term);
      picked.push(p);
      if (picked.length >= count) break;
    }
    return picked;
  }

  function start(subjects, pairCount = 6) {
    const pairs = buildPairs(subjects, pairCount);
    const cards = [];
    pairs.forEach((p, i) => {
      cards.push({ pairId: i, type: 'term', text: p.term, matched: false });
      cards.push({ pairId: i, type: 'def', text: p.def, matched: false });
    });
    cards.sort(() => Math.random() - 0.5);
    state = { cards, flipped: [], moves: 0, matchedCount: 0, startedAt: Date.now() };
    return state;
  }

  function getState() { return state; }

  function flip(cardIndex) {
    if (!state) return { status: 'ignored' };
    const card = state.cards[cardIndex];
    if (!card || card.matched || state.flipped.includes(cardIndex) || state.flipped.length >= 2) {
      return { status: 'ignored' };
    }
    state.flipped.push(cardIndex);
    if (state.flipped.length === 2) {
      state.moves++;
      const [i1, i2] = state.flipped;
      const c1 = state.cards[i1], c2 = state.cards[i2];
      if (c1.pairId === c2.pairId && c1.type !== c2.type) {
        c1.matched = true; c2.matched = true;
        state.matchedCount++;
        state.flipped = [];
        return { status: 'match' };
      }
      return { status: 'pending-nomatch' };
    }
    return { status: 'flipped' };
  }

  function clearPending() { if (state) state.flipped = []; }
  function isComplete() { return !!state && state.cards.length > 0 && state.matchedCount === state.cards.length / 2; }
  function abandon() { state = null; }

  return { start, getState, flip, clearPending, isComplete, abandon };
})();

// Kart Oyunu V2 — açık kartlar, 2 sütun (terim/tanım), tek bir konuya özel
const CardGameV2 = (() => {
  let state = null;

  function _stripLeadingEmoji(s) {
    return s.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  }

  function buildPairsForTopic(topic) {
    const pairs = [];
    (topic.anlatim?.anahtarNoktalar || []).forEach((raw, i) => {
      const clean = _stripLeadingEmoji(raw);
      const idx = clean.indexOf(':');
      if (idx > 3 && idx < clean.length - 3) {
        const term = clean.slice(0, idx).trim();
        const def = clean.slice(idx + 1).trim();
        if (term && def) pairs.push({ pairId: i, term, def });
      }
    });
    return pairs;
  }

  function start(topic, maxMistakes) {
    const pairs = buildPairsForTopic(topic);
    const left = pairs.map(p => ({ pairId: p.pairId, text: p.term, matched: false })).sort(() => Math.random() - 0.5);
    const right = pairs.map(p => ({ pairId: p.pairId, text: p.def, matched: false })).sort(() => Math.random() - 0.5);
    state = {
      left, right, selectedLeft: null, selectedRight: null,
      mistakes: 0, maxMistakes: maxMistakes || 3,
      pairsTotal: pairs.length, matchedCount: 0, lastWrong: null,
    };
    return state;
  }

  function getState() { return state; }

  function _tryResolve() {
    if (state.selectedLeft === null || state.selectedRight === null) return { status: 'partial' };
    const l = state.left[state.selectedLeft], r = state.right[state.selectedRight];
    const li = state.selectedLeft, ri = state.selectedRight;
    if (l.pairId === r.pairId) {
      l.matched = true; r.matched = true;
      state.matchedCount++;
      state.selectedLeft = null; state.selectedRight = null;
      return { status: 'match', leftIdx: li, rightIdx: ri };
    }
    state.mistakes++;
    state.lastWrong = { leftIdx: li, rightIdx: ri };
    state.selectedLeft = null; state.selectedRight = null;
    return { status: 'nomatch', leftIdx: li, rightIdx: ri, mistakes: state.mistakes };
  }

  function selectLeft(i) {
    if (!state || state.left[i]?.matched) return { status: 'ignored' };
    state.selectedLeft = i;
    state.lastWrong = null;
    return _tryResolve();
  }

  function selectRight(i) {
    if (!state || state.right[i]?.matched) return { status: 'ignored' };
    state.selectedRight = i;
    state.lastWrong = null;
    return _tryResolve();
  }

  function isComplete() { return !!state && state.pairsTotal > 0 && state.matchedCount === state.pairsTotal; }
  function isFailed() { return !!state && state.mistakes >= state.maxMistakes; }
  function abandon() { state = null; }

  return { start, getState, selectLeft, selectRight, buildPairsForTopic, isComplete, isFailed, abandon };
})();
