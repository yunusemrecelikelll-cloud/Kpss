// Sınav süresi sayacı
const Timer = (() => {
  const SECONDS_PER_QUESTION = 65; // KPSS GY-GK temposu (~120 soru / 130 dk)

  let intervalId = null;
  let remaining = 0;
  let onTick = null;
  let onExpire = null;

  function durationForQuestionCount(count) {
    return count * SECONDS_PER_QUESTION;
  }

  function format(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function start(totalSeconds, tickCb, expireCb) {
    stop();
    remaining = totalSeconds;
    onTick = tickCb;
    onExpire = expireCb;
    if (onTick) onTick(remaining);
    intervalId = setInterval(() => {
      remaining -= 1;
      if (onTick) onTick(remaining);
      if (remaining <= 0) {
        stop();
        if (onExpire) onExpire();
      }
    }, 1000);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function elapsedSeconds(totalSeconds) {
    return totalSeconds - remaining;
  }

  return { durationForQuestionCount, format, start, stop, elapsedSeconds };
})();
