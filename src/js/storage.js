// KPSS v2 — Çok kullanıcı destekli veri katmanı (localStorage)
const Storage = (() => {

  // ── Global (kullanıcıdan bağımsız) anahtarlar ──
  const G = {
    USERS:  'kpss_v2_users',
    ACTIVE: 'kpss_v2_active_user',
  };

  // Eski format (tek kullanıcı) sabit sonekleri
  const OLD_SUFFIXES = [
    'name','completed','attempts','wrong','badges',
    'missions_done','streak','draft','settings','used_qs'
  ];

  const get = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // Kullanıcı adından güvenli anahtar öneki üret
  function _safe(name) {
    return name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_').slice(0, 40);
  }

  // Aktif kullanıcı için anahtar öneki
  function _pre() {
    const u = localStorage.getItem(G.ACTIVE) || '';
    return u ? `kpss_v2_${_safe(u)}_` : 'kpss_v2_legacy_';
  }

  // Belirtilen kullanıcı için anahtar öneki
  function _preFor(name) {
    return `kpss_v2_${_safe(name)}_`;
  }

  const _get = (s, fb)  => get(_pre() + s, fb);
  const _set = (s, v)   => set(_pre() + s, v);
  const _getFor = (name, s, fb) => get(_preFor(name) + s, fb);

  // ── Kullanıcı yönetimi ──
  function getUserList()     { return get(G.USERS, []); }
  function getActiveUser()   { return localStorage.getItem(G.ACTIVE) || ''; }
  function setActiveUser(n)  { localStorage.setItem(G.ACTIVE, n); }

  function addUser(rawName) {
    const name = rawName.trim().slice(0, 24);
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    const users = getUserList();
    if (!users.includes(cap)) { users.push(cap); set(G.USERS, users); }
    return cap;
  }

  function deleteUser(name) {
    const pre = _preFor(name);
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(pre)) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
    set(G.USERS, getUserList().filter(u => u !== name));
    if (getActiveUser() === name) localStorage.removeItem(G.ACTIVE);
  }

  // Eski tek-kullanıcı verisini yeni formata taşı
  function migrateOldData() {
    if (getUserList().length > 0) return false; // zaten göç edilmiş
    const oldName = get('kpss_v2_name', '');
    // Herhangi bir eski veri var mı kontrol et
    const hasOldData = OLD_SUFFIXES.some(s => localStorage.getItem('kpss_v2_' + s) !== null);
    if (!hasOldData) return false;

    const name = addUser(oldName || 'Kullanıcı 1');
    const newPre = _preFor(name);

    OLD_SUFFIXES.forEach(s => {
      const val = localStorage.getItem('kpss_v2_' + s);
      if (val !== null) {
        localStorage.setItem(newPre + s, val);
        localStorage.removeItem('kpss_v2_' + s);
      }
    });

    setActiveUser(name);
    return true;
  }

  // Kullanıcı özet istatistikleri (seçim ekranı için)
  function getUserStats(name) {
    const attempts = _getFor(name, 'attempts', []);
    const streak   = _getFor(name, 'streak', {});
    const solved   = attempts.reduce((s, a) => s + (a.toplam || 0), 0);
    const correct  = attempts.reduce((s, a) => s + (a.dogru  || 0), 0);
    return {
      solved,
      rate:     solved > 0 ? Math.round(correct / solved * 100) : 0,
      streak:   streak.count || 0,
      tests:    attempts.length,
      lastDate: streak.lastDate || null,
    };
  }

  // Sabit renk avatar paleti (kullanıcı adı hash'e göre seçilir)
  function userAvatarColor(name) {
    const palette = ['#8b5cf6','#ec4899','#14b8a6','#f59e0b','#3b82f6','#10b981','#f43f5e','#6366f1'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return palette[h % palette.length];
  }

  // ── Gender ──
  function getUserGender()          { return _get('gender', ''); }            // 'k' | 'e' | ''
  function setUserGender(g)         { _set('gender', g); }
  function getUserGenderFor(name)   { return _getFor(name, 'gender', ''); }

  // ── Name ──
  function getUserName()    { return _get('name', ''); }
  function setUserName(n) {
    const c = n.trim();
    _set('name', c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
  }

  // ── Completed topics ──
  function getCompletedTopics()    { return _get('completed', {}); }
  function markTopicCompleted(id)  { const c = getCompletedTopics(); c[id] = true; _set('completed', c); }
  function isTopicCompleted(id)    { return !!getCompletedTopics()[id]; }

  // ── Attempts ──
  function getAttempts()           { return _get('attempts', []); }
  function addAttempt(rec)         { const a = getAttempts(); a.push(rec); _set('attempts', a); }
  function getAttemptsForTopic(id) { return getAttempts().filter(a => a.topicId === id); }
  function getBestScore(id) {
    const arr = getAttemptsForTopic(id);
    return arr.length ? Math.max(...arr.map(a => a.skor)) : null;
  }
  function getLastAttempt(id) {
    const arr = getAttemptsForTopic(id);
    return arr.length ? arr[arr.length - 1] : null;
  }

  // ── Kullanılan sorular (tekrar önleme) ──
  function getUsedQuestions(topicId) {
    const all = _get('used_qs', {});
    return all[topicId] || [];
  }
  function addUsedQuestions(topicId, keys) {
    const all = _get('used_qs', {});
    const ex  = new Set(all[topicId] || []);
    keys.forEach(k => ex.add(k));
    all[topicId] = [...ex];
    _set('used_qs', all);
  }
  function resetUsedQuestions(topicId) {
    const all = _get('used_qs', {});
    delete all[topicId];
    _set('used_qs', all);
  }

  // ── Wrong answers bank ──
  function getWrongBank() { return _get('wrong', []); }
  function addWrongQuestions(questions, subjectId, subjectAd) {
    const bank = getWrongBank();
    questions.forEach(q => {
      const key = q.soru.slice(0, 40);
      const ex  = bank.find(w => w.key === key);
      if (!ex) bank.push({ key, subjectId, subjectAd, ...q, addedAt: Date.now() });
      else ex.count = (ex.count || 1) + 1;
    });
    if (bank.length > 200) bank.splice(0, bank.length - 200);
    _set('wrong', bank);
  }
  function removeFromWrongBank(key) { _set('wrong', getWrongBank().filter(w => w.key !== key)); }
  function clearWrongBank()         { _set('wrong', []); }

  // ── Badges ──
  function getUnlockedBadges()    { return _get('badges', []); }
  function unlockBadge(id) {
    const b = getUnlockedBadges();
    if (!b.includes(id)) { b.push(id); _set('badges', b); return true; }
    return false;
  }
  function isBadgeUnlocked(id)    { return getUnlockedBadges().includes(id); }

  // ── Missions ──
  function getMissionsDone()       { return _get('missions_done', {}); }
  function markMissionDone(id)     { const m = getMissionsDone(); m[id] = Date.now(); _set('missions_done', m); }
  function isMissionDone(id)       { return !!getMissionsDone()[id]; }
  function resetDailyMissions() {
    const m = getMissionsDone();
    const yesterday = Date.now() - 86400000;
    Object.keys(m).forEach(k => { if (m[k] < yesterday) delete m[k]; });
    _set('missions_done', m);
  }

  // ── Streak ──
  function getStreak() { return _get('streak', { count: 0, lastDate: null }); }
  function touchStreak() {
    const today = new Date().toDateString();
    const s = getStreak();
    if (s.lastDate === today) return s;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    s.count = (s.lastDate === yesterday) ? s.count + 1 : 1;
    s.lastDate = today;
    _set('streak', s);
    return s;
  }

  // ── Draft quiz ──
  function saveDraft(state) { _set('draft', state); }
  function getDraft()       { return _get('draft', null); }
  function clearDraft()     { localStorage.removeItem(_pre() + 'draft'); }

  // ── Settings ──
  function getSettings() {
    return _get('settings', {
      theme: 'default', particleEnabled: true, particleColor: 'rainbow',
      soundEnabled: true, timerMode: 'auto', secsPerQ: 65,
    });
  }
  function saveSettings(s) { _set('settings', s); }

  // ── Topic attempt reset ──
  function resetTopicAttempts(topicId) {
    _set('attempts', getAttempts().filter(a => a.topicId !== topicId));
    const c = getCompletedTopics(); delete c[topicId]; _set('completed', c);
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
    const solved  = a.reduce((s, x) => s + x.toplam, 0);
    const correct = a.reduce((s, x) => s + x.dogru,  0);
    return { solved, correct, rate: solved ? Math.round(correct / solved * 100) : 0, tests: a.length };
  }

  return {
    // Kullanıcı yönetimi
    getUserList, getActiveUser, setActiveUser, addUser, deleteUser,
    migrateOldData, getUserStats, userAvatarColor,
    getUserGender, setUserGender, getUserGenderFor,
    // Veri (aktif kullanıcıya göre)
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
