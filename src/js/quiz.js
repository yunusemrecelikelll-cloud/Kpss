// Test oturumu yönetimi + taslak kaydetme
const Quiz = (() => {
  let state = null;

  function start(subjectId, subjectAd, topicId, topicBaslik, questions, isFullTest) {
    state = {
      subjectId, subjectAd, topicId, topicBaslik,
      questions,
      currentIndex: 0,
      answers: new Array(questions.length).fill(null),
      durationSec: Timer.durationFor(questions.length),
      isFullTest: !!isFullTest,
      startedAt: Date.now(),
    };
    _saveDraft();
    return state;
  }

  function restoreFromDraft(draft) {
    state = draft;
    return state;
  }

  function _saveDraft() {
    if (!state) return;
    Storage.saveDraft({ ...state });
  }

  function getState() { return state; }

  function answer(idx) {
    if (!state) return;
    state.answers[state.currentIndex] = idx;
    _saveDraft();
  }

  function goTo(i) {
    if (!state || i < 0 || i >= state.questions.length) return;
    state.currentIndex = i;
  }

  function next() { if (state && state.currentIndex < state.questions.length - 1) state.currentIndex++; }
  function prev() { if (state && state.currentIndex > 0) state.currentIndex--; }

  function finish(elapsedSec) {
    if (!state) return null;
    let dogru = 0, yanlis = 0, bos = 0;
    const wrongQs = [];

    const review = state.questions.map((q, i) => {
      const given = state.answers[i];
      let status;
      if (given === null || given === undefined) { bos++; status = 'bos'; }
      else if (given === q.dogruIndex) { dogru++; status = 'dogru'; }
      else { yanlis++; status = 'yanlis'; wrongQs.push({ ...q, verilenIndex: given }); }

      return {
        soru: q.soru, secenekler: q.secenekler,
        dogruIndex: q.dogruIndex, verilenIndex: given,
        aciklama: q.aciklama,
        distractorAciklama: q.distractorAciklama || null,
        kaynak: q.kaynak || null,
        status,
      };
    });

    const skor = Math.round(dogru / state.questions.length * 100);
    const result = {
      subjectId: state.subjectId, subjectAd: state.subjectAd,
      topicId: state.topicId, topicBaslik: state.topicBaslik,
      toplam: state.questions.length, dogru, yanlis, bos, skor,
      sureSn: elapsedSec,
      tarih: new Date().toISOString(),
      isFullTest: state.isFullTest,
      review,
    };

    // add wrong questions to bank
    if (wrongQs.length > 0) {
      Storage.addWrongQuestions(wrongQs, state.subjectId, state.subjectAd);
    }

    Storage.clearDraft();
    state = null;
    return result;
  }

  function abandon() { Storage.clearDraft(); state = null; }

  return { start, restoreFromDraft, getState, answer, goTo, next, prev, finish, abandon };
})();
