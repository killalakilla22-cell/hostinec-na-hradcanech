import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from './rules.js';

// 2026-10-19 is a Monday.
const MON_TO_SAT = { 0: null, 1: 'A', 2: 'B', 3: 'A', 4: 'B', 5: 'A', 6: null }; // rest Sat & Sun
const DAY = 86_400_000;

test('date helpers', () => {
  assert.equal(rules.weekdayOf('2026-10-19'), 1);
  assert.equal(rules.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(rules.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(rules.weekStartOf('2026-10-25'), '2026-10-19'); // Sunday -> previous Monday
  assert.equal(rules.diffDays('2026-10-01', '2026-10-21'), 20);
  assert.ok(rules.isValidDate('2024-02-29'));
  assert.ok(!rules.isValidDate('2026-02-29'));
  assert.ok(!rules.isValidDate('2026-1-01'));
  assert.ok(!rules.isValidDate(20261001));
});

test('streak: rest days do not break, missed day breaks', () => {
  // Wed 2026-10-21 today. Done: Mon 19, Tue 20, Fri 16, Thu 15. Sat/Sun rest.
  const done = new Set(['2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21']);
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-21' }), 5);
  // Wed 14 missed -> streak stops there
  done.add('2026-10-13');
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-21' }), 5);
  done.add('2026-10-14');
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-21' }), 7);
});

test('streak: today not yet done does not break', () => {
  const done = new Set(['2026-10-19', '2026-10-20']);
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-21' }), 2);
});

test('streak: yesterday missed breaks to 0 (today undone)', () => {
  const done = new Set(['2026-10-19']);
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-21' }), 0);
  // ...but doing today restarts at 1
  done.add('2026-10-21');
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-21' }), 1);
});

test('streak: on a rest day, previous training days count', () => {
  // Sunday 2026-10-25 (rest), Saturday rest, Fri 23 done, Thu 22 done
  const done = new Set(['2026-10-22', '2026-10-23']);
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: done, today: '2026-10-25' }), 2);
});

test('streak: minDate bounds the walk; all-rest schedule gives 0', () => {
  assert.equal(rules.computeStreak({ schedule: MON_TO_SAT, doneDates: new Set(), today: '2026-10-21', minDate: '2026-10-21' }), 0);
  const allRest = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  assert.equal(rules.computeStreak({ schedule: allRest, doneDates: new Set(['2026-10-21']), today: '2026-10-21' }), 0);
});

test('completion rate counts only scheduled days in range', () => {
  // Mon 19 .. Sun 25: 5 scheduled days
  const done = new Set(['2026-10-19', '2026-10-21', '2026-10-24']); // 24 is Saturday (rest) -> ignored
  const s = rules.completionStats({ schedule: MON_TO_SAT, doneDates: done, startDate: '2026-10-19', endDate: '2026-10-25' });
  assert.deepEqual(s, { scheduledCount: 5, completedCount: 2, completionRate: 0.4 });
  const none = rules.completionStats({ schedule: null, doneDates: done, startDate: '2026-10-19', endDate: '2026-10-25' });
  assert.equal(none.scheduledCount, 0);
  assert.equal(none.completionRate, 0);
});

test('normalizeSchedule validates day ids and keys', () => {
  assert.deepEqual(rules.normalizeSchedule({ 1: 'A', 3: 'B' }, ['A', 'B']), { 0: null, 1: 'A', 2: null, 3: 'B', 4: null, 5: null, 6: null });
  assert.equal(rules.normalizeSchedule({ 1: 'X' }, ['A']), null);
  assert.equal(rules.normalizeSchedule({ 7: 'A' }, ['A']), null);
  assert.equal(rules.normalizeSchedule('nope', ['A']), null);
});

test('cycle evaluation: not ended -> no change', () => {
  const start = Date.parse('2026-01-01T00:00:00Z');
  const sub = rules.startPaidCycle({ cycleNumber: 0 }, start);
  assert.equal(sub.cycleNumber, 1);
  const { sub: next, events } = rules.evaluateCycles(sub, start + 59 * DAY, () => 0);
  assert.equal(events.length, 0);
  assert.deepEqual(next, sub);
});

test('cycle evaluation: >=50% renews free, <50% locks', () => {
  const start = Date.parse('2026-01-01T00:00:00Z');
  const sub = rules.startPaidCycle({ cycleNumber: 0 }, start);
  const r1 = rules.evaluateCycles(sub, start + 60 * DAY, () => 0.5);
  assert.equal(r1.sub.status, 'active');
  assert.equal(r1.sub.cycleNumber, 2);
  assert.equal(r1.sub.cycleStart, sub.cycleEnd);
  assert.equal(Date.parse(r1.sub.cycleEnd) - Date.parse(r1.sub.cycleStart), 60 * DAY);
  assert.deepEqual(r1.events.map((e) => e.result), ['renewed']);

  const r2 = rules.evaluateCycles(sub, start + 60 * DAY, () => 0.49);
  assert.equal(r2.sub.status, 'locked');
  assert.equal(r2.sub.cycleNumber, 1);
  assert.deepEqual(r2.events.map((e) => [e.result, e.completionRate]), [['locked', 0.49]]);
});

test('cycle evaluation loops over several elapsed cycles', () => {
  const start = Date.parse('2026-01-01T00:00:00Z');
  const sub = rules.startPaidCycle({ cycleNumber: 0 }, start);
  // 130 days later: cycle 1 renewed (80%), cycle 2 (e.g. no workouts) locked
  const rates = [0.8, 0];
  const { sub: next, events } = rules.evaluateCycles(sub, start + 130 * DAY, () => rates.shift());
  assert.deepEqual(events.map((e) => [e.cycleNumber, e.result]), [[1, 'renewed'], [2, 'locked']]);
  assert.equal(next.status, 'locked');
  // all good -> lands in cycle 3, still active
  const ok = rules.evaluateCycles(sub, start + 130 * DAY, () => 1);
  assert.equal(ok.sub.cycleNumber, 3);
  assert.equal(ok.sub.status, 'active');
  // locked/unpaid are never re-evaluated
  assert.equal(rules.evaluateCycles({ ...sub, status: 'locked' }, start + 500 * DAY, () => 1).events.length, 0);
});

test('daysLeft', () => {
  const end = '2026-03-02T00:00:00.000Z';
  assert.equal(rules.daysLeft(end, Date.parse(end) - 1.5 * DAY), 2);
  assert.equal(rules.daysLeft(end, Date.parse(end) + DAY), 0);
});

test('rankEntries: sorts, shares ties, excludes zero, reports me', () => {
  const u = (id) => ({ id, name: 'U' + id, avatarColor: '#000' });
  const rows = [{ user: u(1), value: 5 }, { user: u(2), value: 9 }, { user: u(3), value: 5 }, { user: u(4), value: 0 }, { user: u(5), value: 1 }];
  const r = rules.rankEntries(rows, 3);
  assert.deepEqual(r.entries.map((e) => [e.user.id, e.rank]), [[2, 1], [1, 2], [3, 2], [5, 4]]);
  assert.deepEqual(r.me, { rank: 2, value: 5 });
  assert.equal(r.entries.find((e) => e.user.id === 3).isMe, true);
  assert.equal(rules.rankEntries(rows, 4).me, null);
  assert.equal(rules.rankEntries(rows, 1, 2).entries.length, 2);
});

test('newBadges detects crossed milestones', () => {
  const b = rules.newBadges({ totalWorkouts: 0, currentStreak: 0 }, { totalWorkouts: 1, currentStreak: 1 });
  assert.deepEqual(b.map((x) => x.id), ['first-workout']);
  assert.deepEqual(rules.newBadges({ totalWorkouts: 5, currentStreak: 6 }, { totalWorkouts: 6, currentStreak: 7 }).map((x) => x.id), ['streak-7']);
});
