import { useEffect, useState } from 'react';

// The current time, updated every second, so countdowns redraw by themselves.
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    // When the page closes, stop the timer.
    return () => clearInterval(timer);
  }, []);

  return now;
}

// True once `busy` has lasted more than 10 seconds, for a calm "hang on" note.
export function useSlow(busy: boolean): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!busy) {
      return;
    }
    const timer = setTimeout(() => setSlow(true), 10_000);
    // When it's no longer busy, cancel the timer and hide the note.
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [busy]);

  return slow;
}

// 93784000 ms → "1d 02:03:04". Under a day → "02:03:04". Under an hour → "03:04".
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = days > 0 || hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  const clock = parts.map((part) => String(part).padStart(2, '0')).join(':');
  return days > 0 ? `${days}d ${clock}` : clock;
}

// "Thu, 1 Jul 2027, 20:00" in the fan's own time zone.
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
