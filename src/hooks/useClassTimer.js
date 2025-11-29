import { useEffect, useState } from 'react';

// scheduleString example: "Mon 09:00–09:45" or "Wed 11:00–11:45"
// windowMinutes: how many minutes before start and after end the feature stays enabled
export function useClassTimer(scheduleString, windowMinutes = 15) {
  const [active, setActive] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // update each minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const schedules = Array.isArray(scheduleString) ? scheduleString : [scheduleString];
    if (!schedules || !schedules[0]) return setActive(false);

    const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    const currentDay = now.getDay();

    const buildDate = (timeStr) => {
      const [h, m] = (timeStr || '').split(':').map(Number);
      const d = new Date(now);
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    };

    const anyActive = schedules.some((sched) => {
      if (!sched) return false;
      const parts = String(sched).split(' ');
      if (parts.length < 2) return false;
      const targetDay = dayMap[parts[0]];
      if (targetDay === undefined || targetDay !== currentDay) return false;
      const [startRaw, endRaw] = parts[1].split('–');
      if (!startRaw || !endRaw) return false;
      const start = buildDate(startRaw);
      const end = buildDate(endRaw);
      const before = new Date(start.getTime() - windowMinutes * 60000);
      const after = new Date(end.getTime() + windowMinutes * 60000);
      return now >= before && now <= after;
    });

    setActive(anyActive);
  }, [scheduleString, windowMinutes, now]);

  return active;
}
