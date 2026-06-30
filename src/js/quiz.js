// Aktif test oturumu mantığı
const Quiz = (() => {
  let state = null;

  function start(subject, topic) {
    state = {
      subjectId: subject.id,
      subjectAd: subject.ad,
      topicId: topic.id,
      topicBaslik: topic.baslik,
      questions: topic.sorular,
      currentIndex: 0,
      answers: new Array(topic.sorular.length).fill(null),
      durationSec: Timer.durationForQuestionCount(topic.sorular.length)
    };
    return state;
  }

  function getState() {
    return state;
  }

  function answerCurrent(optionIndex) {
    if (!state) return;
    state.answers[state.currentIndex] = optionIndex;
  }

  function goTo(index) {
    if (!state) return;
    if (index >= 0 && index < state.questions.length) {
      state.currentIndex = index;
    }
  }

  function next() {
    if (!state) return;
    if (state.currentIndex < state.questions.length - 1) state.currentIndex += 1;
  }

  function prev() {
    if (!state) return;
    if (state.currentIndex > 0) state.currentIndex -= 1;
  }

  function finish(elapsedSec) {
    if (!state) return null;
    let dogru = 0, yanlis = 0, bos = 0;
    const review = state.questions.map((q, i) => {
      const verilen = state.answers[i];
      let durum;
      if (verilen === null || verilen === undefined) {
        bos += 1;
        durum = 'bos';
      } else if (verilen === q.dogruIndex) {
        dogru += 1;
        durum = 'dogru';
      } else {
        yanlis += 1;
        durum = 'yanlis';
      }
      return {
        soru: q.soru,
        secenekler: q.secenekler,
        dogruIndex: q.dogruIndex,
        aciklama: q.aciklama,
        verilenIndex: verilen,
        durum
      };
    });

    const toplam = state.questions.length;
    const skor = Math.round((dogru / toplam) * 100);

    const result = {
      subjectId: state.subjectId,
      subjectAd: state.subjectAd,
      topicId: state.topicId,
      topicBaslik: state.topicBaslik,
      toplam, dogru, yanlis, bos, skor,
      sureSn: elapsedSec,
      tarih: new Date().toISOString(),
      review
    };

    state = null;
    return result;
  }

  return { start, getState, answerCurrent, goTo, next, prev, finish };
})();
