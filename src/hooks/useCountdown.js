import { useEffect, useState } from "react";

/**
 * Live countdown to the negative-gearing cliff (1 Jul 2027 00:00 AEST).
 * 1-second tick. Used by countdown clocks, headlines, and the cliff banner.
 */
export function useCountdown() {
  const target = new Date("2027-07-01T00:00:00+10:00").getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}
