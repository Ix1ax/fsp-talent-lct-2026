import { useEffect, useState } from 'react';

export const useCountdown = (seconds: number, deadlineAt?: string) => {
  const [clock, setClock] = useState(() => ({
    seconds,
    deadlineAt,
    deadline: deadlineAt ? Date.parse(deadlineAt) : Date.now() + seconds * 1000,
    now: Date.now(),
  }));

  if (clock.seconds !== seconds || clock.deadlineAt !== deadlineAt) {
    setClock({
      seconds,
      deadlineAt,
      deadline: deadlineAt
        ? Date.parse(deadlineAt)
        : clock.now + seconds * 1000,
      now: clock.now,
    });
  }

  useEffect(() => {
    const tick = () =>
      setClock((previous) => ({ ...previous, now: Date.now() }));
    const interval = setInterval(tick, 1000);

    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const timeLeft = Number.isFinite(clock.deadline)
    ? Math.max(0, Math.ceil((clock.deadline - clock.now) / 1000))
    : 0;

  return { timeLeft };
};
