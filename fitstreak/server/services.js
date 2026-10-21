// DB-backed domain helpers shared by routes: serializers, subscription
// evaluation, stats.
import { tx } from './db.js';
import { now, nowIso, today, localDate } from './time.js';
import * as rules from './rules.js';
import { getDay } from './content.js';

export function parseSchedule(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

export function userMini(row) {
  return { id: row.id, name: row.name, avatarColor: row.avatar_color };
}

/** Mini user from a joined row with u_id/u_name/u_color columns. */
export function joinedUser(r) {
  return { id: r.u_id, name: r.u_name, avatarColor: r.u_color };
}

export function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
    programId: row.program_id || null,
    schedule: parseSchedule(row.schedule),
    createdAt: row.created_at,
  };
}

export function getUser(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

export function getDoneDates(db, userId) {
  const rows = db.prepare('SELECT DISTINCT date FROM workout_logs WHERE user_id = ?').all(userId);
  return new Set(rows.map((r) => r.date));
}

// ---------------------------------------------------------------- subscription
function cycleRange(startIso, endIso) {
  // cycle covers local dates [start, end) -> inclusive end = day before end
  return { startDate: localDate(startIso), endDate: rules.addDays(localDate(endIso), -1) };
}

/**
 * Lazily evaluate ended cycles for this user and persist the result.
 * Returns the (possibly updated) user row.
 */
export function evaluateSubscription(db, row) {
  if (row.sub_status !== 'active' || !row.cycle_end || now() < Date.parse(row.cycle_end)) return row;
  const schedule = parseSchedule(row.schedule);
  const doneDates = getDoneDates(db, row.id);
  const sub = { status: row.sub_status, cycleStart: row.cycle_start, cycleEnd: row.cycle_end, cycleNumber: row.cycle_number };
  const { sub: next, events } = rules.evaluateCycles(sub, now(), (s, e) =>
    rules.completionStats({ schedule, doneDates, ...cycleRange(s, e) }).completionRate);
  if (!events.length) return row;
  tx(db, () => {
    const ins = db.prepare('INSERT INTO subscription_history (user_id, cycle_number, start, end, completion_rate, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const ev of events) ins.run(row.id, ev.cycleNumber, ev.start, ev.end, ev.completionRate, ev.result, nowIso());
    db.prepare('UPDATE users SET sub_status = ?, cycle_start = ?, cycle_end = ?, cycle_number = ? WHERE id = ?')
      .run(next.status, next.cycleStart, next.cycleEnd, next.cycleNumber, row.id);
  });
  return getUser(db, row.id);
}

export function payForCycle(db, row) {
  const next = rules.startPaidCycle({ cycleNumber: row.cycle_number }, now());
  tx(db, () => {
    db.prepare('UPDATE users SET sub_status = ?, cycle_start = ?, cycle_end = ?, cycle_number = ? WHERE id = ?')
      .run(next.status, next.cycleStart, next.cycleEnd, next.cycleNumber, row.id);
    // 'paid' history entry marks a cycle started by payment (completionRate 0 at start).
    db.prepare('INSERT INTO subscription_history (user_id, cycle_number, start, end, completion_rate, result, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)')
      .run(row.id, next.cycleNumber, next.cycleStart, next.cycleEnd, 'paid', nowIso());
  });
  return getUser(db, row.id);
}

export function subscriptionView(db, row) {
  const history = db.prepare('SELECT cycle_number, start, end, completion_rate, result FROM subscription_history WHERE user_id = ? ORDER BY id DESC')
    .all(row.id)
    .map((h) => ({ cycleNumber: h.cycle_number, start: h.start, end: h.end, completionRate: h.completion_rate, result: h.result }));
  let stats = { scheduledCount: 0, completedCount: 0, completionRate: 0 };
  if (row.cycle_start && row.cycle_end) {
    const { startDate, endDate } = cycleRange(row.cycle_start, row.cycle_end);
    // active: only days already passed / today; locked: the whole (ended) cycle
    const until = row.sub_status === 'active' && today() < endDate ? today() : endDate;
    stats = rules.completionStats({ schedule: parseSchedule(row.schedule), doneDates: getDoneDates(db, row.id), startDate, endDate: until });
  }
  return {
    status: row.sub_status,
    cycleStart: row.cycle_start || null,
    cycleEnd: row.cycle_end || null,
    daysLeft: row.sub_status === 'active' ? rules.daysLeft(row.cycle_end, now()) : 0,
    cycleNumber: row.cycle_number,
    completionRate: stats.completionRate,
    scheduledCount: stats.scheduledCount,
    completedCount: stats.completedCount,
    required: rules.REQUIRED_RATE,
    history,
  };
}

// ---------------------------------------------------------------- stats
export function currentStreak(row, doneDates) {
  return rules.computeStreak({
    schedule: parseSchedule(row.schedule),
    doneDates,
    today: today(),
    minDate: localDate(row.created_at),
  });
}

/** Stats for /api/me; also persists best_streak. */
export function computeStats(db, row) {
  const doneDates = getDoneDates(db, row.id);
  const streak = currentStreak(row, doneDates);
  let best = row.best_streak;
  if (streak > best) {
    best = streak;
    db.prepare('UPDATE users SET best_streak = ? WHERE id = ?').run(best, row.id);
  }
  const totals = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(sets_done), 0) AS sets FROM workout_logs WHERE user_id = ?').get(row.id);
  const t = today();
  const weekStart = rules.weekStartOf(t);
  const weekEnd = rules.addDays(weekStart, 6);
  const schedule = parseSchedule(row.schedule);
  let thisWeekScheduled = 0;
  for (let d = weekStart; d <= weekEnd; d = rules.addDays(d, 1)) if (rules.scheduledDayId(schedule, d)) thisWeekScheduled++;
  const thisWeekDone = db.prepare('SELECT COUNT(*) AS n FROM workout_logs WHERE user_id = ? AND date >= ? AND date <= ?').get(row.id, weekStart, weekEnd).n;
  return {
    currentStreak: streak,
    bestStreak: best,
    totalWorkouts: totals.n,
    totalSets: totals.sets,
    thisWeekDone,
    thisWeekScheduled,
  };
}

// ---------------------------------------------------------------- logs
export function logView(db, r, withSets = false) {
  const found = getDay(r.day_id);
  const out = {
    id: r.id,
    date: r.date,
    dayId: r.day_id,
    dayName: found ? found.day.name : r.day_id,
    programId: r.program_id,
    durationSec: r.duration_sec,
    setsDone: r.sets_done,
    totalVolume: r.total_volume,
    notes: r.notes,
    createdAt: r.created_at,
  };
  if (withSets) {
    out.sets = db.prepare('SELECT exercise_id, set_index, reps, weight, done FROM workout_sets WHERE log_id = ? ORDER BY id')
      .all(r.id)
      .map((s) => ({ exerciseId: s.exercise_id, setIndex: s.set_index, reps: s.reps, weight: s.weight, done: !!s.done }));
  }
  return out;
}
