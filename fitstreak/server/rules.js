// Pure business logic. No DB, no clock, no seed content: everything is passed
// in as arguments so it can be unit-tested in isolation.

export const CYCLE_DAYS = 60;
export const REQUIRED_RATE = 0.5;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------- dates
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strict YYYY-MM-DD validation (real calendar date). */
export function isValidDate(s) {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function toUtc(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  return fromUtc(toUtc(dateStr) + n * DAY_MS);
}

/** Whole days from a to b (b - a). */
export function diffDays(a, b) {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 0 = Sunday .. 6 = Saturday */
export function weekdayOf(dateStr) {
  return new Date(toUtc(dateStr)).getUTCDay();
}

/** Monday of the week containing dateStr. */
export function weekStartOf(dateStr) {
  const wd = weekdayOf(dateStr);
  return addDays(dateStr, -((wd + 6) % 7));
}

// ---------------------------------------------------------------- schedule
/**
 * dayId scheduled on a date. With no schedule (user has not picked a program)
 * nothing is scheduled.
 */
export function scheduledDayId(schedule, dateStr) {
  if (!schedule) return null;
  const v = schedule[weekdayOf(dateStr)] ?? schedule[String(weekdayOf(dateStr))];
  return v || null;
}

/**
 * Validate a schedule object {0..6: dayId|null} against the allowed day ids.
 * Returns a normalized {"0":..,"6":..} or null when invalid.
 */
export function normalizeSchedule(schedule, allowedDayIds) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;
  const allowed = new Set(allowedDayIds);
  const out = {};
  for (const key of Object.keys(schedule)) {
    if (!/^[0-6]$/.test(key)) return null;
  }
  for (let i = 0; i < 7; i++) {
    const v = schedule[i] ?? schedule[String(i)] ?? null;
    if (v === null || v === '') { out[i] = null; continue; }
    if (typeof v !== 'string' || !allowed.has(v)) return null;
    out[i] = v;
  }
  return out;
}

// ---------------------------------------------------------------- streak
/**
 * Streak = number of consecutive scheduled days (walking back from today)
 * that were completed. Rest days are skipped (do not break, do not add).
 * Today not yet completed does not break the streak (counting starts from
 * yesterday). A missed scheduled day before today breaks it.
 *
 * @param {object} p
 * @param {object|null} p.schedule  weekday -> dayId|null. If null (no program)
 *        every day counts as a "scheduled" day.
 * @param {Set<string>} p.doneDates dates with at least one completed workout
 * @param {string} p.today          YYYY-MM-DD
 * @param {string} [p.minDate]      do not walk further back than this (e.g. signup date)
 */
export function computeStreak({ schedule, doneDates, today, minDate }) {
  const hasAnyTraining = schedule ? Object.values(schedule).some(Boolean) : true;
  if (!hasAnyTraining) return 0;
  let streak = 0;
  let d = today;
  const floor = minDate || addDays(today, -3660);
  // today: only adds if done; never breaks
  const isScheduled = (date) => (schedule ? scheduledDayId(schedule, date) !== null : true);
  if (isScheduled(d) && doneDates.has(d)) streak++;
  d = addDays(d, -1);
  while (d >= floor) {
    if (isScheduled(d)) {
      if (doneDates.has(d)) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

// ---------------------------------------------------------------- completion
/**
 * Completion over an inclusive date range [startDate, endDate].
 * scheduled = days in range with a training day per the schedule;
 * completed = those scheduled days that have a completed workout.
 * rate = completed / scheduled, or 0 when nothing was scheduled.
 *
 * NOTE: a user with no program/schedule has scheduledCount 0 and therefore
 * rate 0 — at cycle end that means "locked". This is intentional: the free
 * renewal rewards actually following a plan.
 */
export function completionStats({ schedule, doneDates, startDate, endDate }) {
  let scheduled = 0;
  let completed = 0;
  if (schedule && endDate >= startDate) {
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      if (scheduledDayId(schedule, d)) {
        scheduled++;
        if (doneDates.has(d)) completed++;
      }
    }
  }
  return { scheduledCount: scheduled, completedCount: completed, completionRate: scheduled ? completed / scheduled : 0 };
}

// ---------------------------------------------------------------- cycles
/**
 * Lazily evaluate every subscription cycle that has ended by `nowMs`.
 * Loops when several cycles elapsed (e.g. time travel 130 days): cycle N is
 * evaluated; if renewed, cycle N+1 starts exactly at N's end and is evaluated
 * too if it has also ended, and so on until a cycle is still running or one
 * is locked.
 *
 * @param {object} sub {status, cycleStart(ISO), cycleEnd(ISO), cycleNumber}
 * @param {number} nowMs
 * @param {(startIso:string, endIso:string) => number} rateFor completion rate of
 *        the (ended) cycle. Caller decides how to map timestamps to local dates.
 * @returns {{sub: object, events: Array<{cycleNumber,start,end,completionRate,result}>}}
 */
export function evaluateCycles(sub, nowMs, rateFor) {
  const events = [];
  let cur = { ...sub };
  let guard = 0;
  while (cur.status === 'active' && cur.cycleEnd && nowMs >= Date.parse(cur.cycleEnd) && guard++ < 1000) {
    const rate = rateFor(cur.cycleStart, cur.cycleEnd);
    if (rate >= REQUIRED_RATE) {
      events.push({ cycleNumber: cur.cycleNumber, start: cur.cycleStart, end: cur.cycleEnd, completionRate: rate, result: 'renewed' });
      const start = cur.cycleEnd;
      cur = {
        ...cur,
        cycleStart: start,
        cycleEnd: new Date(Date.parse(start) + CYCLE_DAYS * DAY_MS).toISOString(),
        cycleNumber: cur.cycleNumber + 1,
      };
    } else {
      events.push({ cycleNumber: cur.cycleNumber, start: cur.cycleStart, end: cur.cycleEnd, completionRate: rate, result: 'locked' });
      cur = { ...cur, status: 'locked' };
    }
  }
  return { sub: cur, events };
}

/** New paid cycle starting at nowMs. */
export function startPaidCycle(sub, nowMs) {
  return {
    status: 'active',
    cycleStart: new Date(nowMs).toISOString(),
    cycleEnd: new Date(nowMs + CYCLE_DAYS * DAY_MS).toISOString(),
    cycleNumber: (sub.cycleNumber || 0) + 1,
  };
}

export function daysLeft(cycleEndIso, nowMs) {
  if (!cycleEndIso) return 0;
  return Math.max(0, Math.ceil((Date.parse(cycleEndIso) - nowMs) / DAY_MS));
}

// ---------------------------------------------------------------- leaderboard
export const LEADERBOARD = {
  consistent: { title: 'The Most Consistent Player', unit: 'hari streak' },
  dedicated: { title: 'The Most Dedicated Player', unit: 'workout' },
  hardworking: { title: 'The Most Hardworking Player', unit: 'set' },
  liked: { title: 'The Most Liked Player', unit: 'like' },
  talkative: { title: 'The Most Talkative Player', unit: 'post' },
};

/**
 * Rank rows [{user:{id,name,avatarColor}, value}] descending by value.
 * Zero values are excluded. Ties share a rank (1,2,2,4). Ties are ordered by
 * user id for stability.
 */
export function rankEntries(rows, meId, limit = 50) {
  const sorted = rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.user.id - b.user.id);
  let lastValue = null;
  let lastRank = 0;
  const ranked = sorted.map((r, i) => {
    const rank = r.value === lastValue ? lastRank : i + 1;
    lastValue = r.value;
    lastRank = rank;
    return { rank, user: r.user, value: r.value, isMe: r.user.id === meId };
  });
  const mine = ranked.find((r) => r.isMe);
  return { entries: ranked.slice(0, limit), me: mine ? { rank: mine.rank, value: mine.value } : null };
}

// ---------------------------------------------------------------- badges
export const BADGES = [
  { id: 'first-workout', name: 'Langkah Pertama', description: 'Menyelesaikan workout pertama', test: (s) => s.totalWorkouts >= 1 },
  { id: 'workouts-10', name: '10 Workout', description: 'Menyelesaikan 10 workout', test: (s) => s.totalWorkouts >= 10 },
  { id: 'workouts-50', name: '50 Workout', description: 'Menyelesaikan 50 workout', test: (s) => s.totalWorkouts >= 50 },
  { id: 'workouts-100', name: '100 Workout', description: 'Menyelesaikan 100 workout', test: (s) => s.totalWorkouts >= 100 },
  { id: 'streak-3', name: 'Streak 3 Hari', description: 'Streak 3 hari terjadwal', test: (s) => s.currentStreak >= 3 },
  { id: 'streak-7', name: 'Streak 7 Hari', description: 'Streak 7 hari terjadwal', test: (s) => s.currentStreak >= 7 },
  { id: 'streak-14', name: 'Streak 14 Hari', description: 'Streak 14 hari terjadwal', test: (s) => s.currentStreak >= 14 },
  { id: 'streak-30', name: 'Streak 30 Hari', description: 'Streak 30 hari terjadwal', test: (s) => s.currentStreak >= 30 },
];

/** Badges earned by going from stats `before` to `after`. */
export function newBadges(before, after) {
  return BADGES.filter((b) => !b.test(before) && b.test(after)).map(({ id, name, description }) => ({ id, name, description }));
}
