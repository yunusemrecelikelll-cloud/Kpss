// KPSS v2 — Kalıcı veri katmanı (localStorage)
const Storage = (() => {
  const K = {
    NAME:      'kpss_v2_name',
    COMPLETED: 'kpss_v2_completed',
    ATTEMPTS:  'kpss_v2_attempts',
    WRONG:     'kpss_v2_wrong',
    BADGES:    'kpss_v2_badges',
    MISSIONS:  'kpss_v2_missions_done',
    STREAK:    'kpss_v2_streak',
    DRAFT:     'kpss_v2_draft',
    SETTINGS:  'kpss_v2_settings',
    USED_QS:   'kpss_v2_used_qs',
  };

  const get = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ── Name ──
  function getUserName() { return get(K.NAME, ''); }
  function setUserName(n) {
    const trimmed = n.trim();
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    set(K.NAME, capitalized);
  }

  // ── Completed topics ──
  function getCompletedTopics() { return get(K.COMPLETED, {}); }
  function markTopicCompleted(id) { const c = getCompletedTopics(); c[id] = true; set(K.COMPLETED, c); }
  function isTopicCompleted(id)  { return !!getCompletedTopics()[id]; }

  // ── Attempts ──
  function getAttempts() { return get(K.ATTEMPTS, []); }
  function addAttempt(rec) { const a = getAttempts(); a.push(rec); set(K.ATTEMPTS, a); }
  function getAttemptsForTopic(id) { return getAttempts().filter(a => a.topicId === id); }
  function getBestScore(id) {
    const arr = getAttemptsForTopic(id);
    return arr.length ? Math.max(...arr.map(a => a.skor)) : null;
  }
  function getLastAttempt(id) {
    const arr = getAttemptsForTopic(id);
    return arr.length ? arr[arr.length - 1] : null;
  }

  // ── Used questions tracking (tekrar önleme) ──
  function getUsedQuestions(topicId) {
    const all = get(K.USED_QS, {});
    return all[topicId] || [];
  }
  function addUsedQuestions(topicId, questionKeys) {
    const all = get(K.USED_QS, {});
    const existing = new Set(all[topicId] || []);
    questionKeys.forEach(k => existing.add(k));
    all[topicId] = [...existing];
    set(K.USED_QS, all);
  }
  function resetUsedQuestions(topicId) {
    const all = get(K.USED_QS, {});
    delete all[topicId];
    set(K.USED_QS, all);
  }

  // ── Wrong answers bank ──
  function getWrongBank() { return get(K.WRONG, []); }
  function addWrongQuestions(questions, subjectId, subjectAd) {
    const bank = getWrongBank();
    questions.forEach(q => {
      const key = q.soru.slice(0, 40);
      const exists = bank.find(w => w.key === key);
      if (!exists) bank.push({ key, subjectId, subjectAd, ...q, addedAt: Date.now() });
      else exists.count = (exists.count || 1) + 1;
    });
    if (bank.length > 200) bank.splice(0, bank.length - 200);
    set(K.WRONG, bank);
  }
  function removeFromWrongBank(key) {
    const bank = getWrongBank().filter(w => w.key !== key);
    set(K.WRONG, bank);
  }
  function clearWrongBank() { set(K.WRONG, []); }

  // ── Badges ──
  function getUnlockedBadges() { return get(K.BADGES, []); }
  function unlockBadge(id) {
    const b = getUnlockedBadges();
    if (!b.includes(id)) { b.push(id); set(K.BADGES, b); return true; }
    return false;
  }
  function isBadgeUnlocked(id) { return getUnlockedBadges().includes(id); }

  // ── Missions ──
  function getMissionsDone() { return get(K.MISSIONS, {}); }
  function markMissionDone(id) { const m = getMissionsDone(); m[id] = Date.now(); set(K.MISSIONS, m); }
  function isMissionDone(id)  { const m = getMissionsDone(); return !!m[id]; }
  function resetDailyMissions() {
    const m = getMissionsDone();
    const yesterday = Date.now() - 86400000;
    Object.keys(m).forEach(k => { if (m[k] < yesterday) delete m[k]; });
    set(K.MISSIONS, m);
  }

  // ── Streak ──
  function getStreak() { return get(K.STREAK, { count: 0, lastDate: null }); }
  function touchStreak() {
    const today = new Date().toDateString();
    const s = getStreak();
    if (s.lastDate === today) return s;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    s.count = (s.lastDate === yesterday) ? s.count + 1 : 1;
    s.lastDate = today;
    set(K.STREAK, s);
    return s;
  }

  // ── Draft quiz (kaldığı yerden devam) ──
  function saveDraft(state) { set(K.DRAFT, state); }
  function getDraft()       { return get(K.DRAFT, null); }
  function clearDraft()     { localStorage.removeItem(K.DRAFT); }

  // ── Settings ──
  function getSettings() {
    return get(K.SETTINGS, {
      theme: 'default',
      particleEnabled: true,
      particleColor: 'rainbow',
      soundEnabled: true,
      timerMode: 'auto',  // 'auto' = KPSS oranı (65s/soru) | 'perq' = kullanıcı belirler
      secsPerQ: 65,       // timerMode==='perq' iken kullanılır
    });
  }
  function saveSettings(s) { set(K.SETTINGS, s); }

  // ── Topic attempt reset ──
  function resetTopicAttempts(topicId) {
    const all = getAttempts().filter(a => a.topicId !== topicId);
    set(K.ATTEMPTS, all);
    const c = getCompletedTopics();
    delete c[topicId];
    set(K.COMPLETED, c);
    resetUsedQuestions(topicId);
    clearDraft();
  }

  // ── Stats helpers ──
  function computeSubjectAvg(subjectId) {
    const arr = getAttempts().filter(a => a.subjectId === subjectId);
    if (!arr.length) return null;
    return Math.round(arr.reduce((s, a) => s + a.skor, 0) / arr.length);
  }
  function computeOverall() {
    const a = getAttempts();
    const solved = a.reduce((s, x) => s + x.toplam, 0);
    const correct = a.reduce((s, x) => s + x.dogru, 0);
    return { solved, correct, rate: solved ? Math.round(correct / solved * 100) : 0, tests: a.length };
  }

  return {
    getUserName, setUserName,
    getCompletedTopics, markTopicCompleted, isTopicCompleted,
    getAttempts, addAttempt, getAttemptsForTopic, getBestScore, getLastAttempt,
    getUsedQuestions, addUsedQuestions, resetUsedQuestions,
    getWrongBank, addWrongQuestions, removeFromWrongBank, clearWrongBank,
    getUnlockedBadges, unlockBadge, isBadgeUnlocked,
    getMissionsDone, markMissionDone, isMissionDone, resetDailyMissions,
    getStreak, touchStreak,
    saveDraft, getDraft, clearDraft,
    getSettings, saveSettings,
    resetTopicAttempts,
    computeSubjectAvg, computeOverall,
  };
})();
