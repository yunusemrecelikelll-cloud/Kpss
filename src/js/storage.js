// localStorage tabanlı kalıcı veri katmanı
const Storage = (() => {
  const KEYS = {
    NAME: 'kpss_userName',
    COMPLETED: 'kpss_completedTopics',
    ATTEMPTS: 'kpss_attempts'
  };

  function getUserName() {
    return localStorage.getItem(KEYS.NAME) || '';
  }

  function setUserName(name) {
    localStorage.setItem(KEYS.NAME, name.trim());
  }

  function getCompletedTopics() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.COMPLETED)) || {};
    } catch {
      return {};
    }
  }

  function markTopicCompleted(topicId) {
    const completed = getCompletedTopics();
    completed[topicId] = true;
    localStorage.setItem(KEYS.COMPLETED, JSON.stringify(completed));
  }

  function isTopicCompleted(topicId) {
    return !!getCompletedTopics()[topicId];
  }

  function getAttempts() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ATTEMPTS)) || [];
    } catch {
      return [];
    }
  }

  function addAttempt(record) {
    const attempts = getAttempts();
    attempts.push(record);
    localStorage.setItem(KEYS.ATTEMPTS, JSON.stringify(attempts));
  }

  function getAttemptsForTopic(topicId) {
    return getAttempts().filter(a => a.topicId === topicId);
  }

  function getBestScoreForTopic(topicId) {
    const attempts = getAttemptsForTopic(topicId);
    if (!attempts.length) return null;
    return Math.max(...attempts.map(a => a.skor));
  }

  return {
    getUserName, setUserName,
    getCompletedTopics, markTopicCompleted, isTopicCompleted,
    getAttempts, addAttempt, getAttemptsForTopic, getBestScoreForTopic
  };
})();
