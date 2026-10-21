// Integration test: real HTTP server on an ephemeral port with an in-memory DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './server.js';
import { resetTravel, today } from './time.js';

const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fitstreak-uploads-'));
// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let app;

test.before(async () => {
  app = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', dev: true, demo: false, uploadsDir, log: false });
});

test.after(async () => {
  resetTravel();
  await app?.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  return async function call(method, url, body) {
    const res = await fetch(app.url + url, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  };
}

test('full user journey', async () => {
  const api = client();

  // unauthenticated
  assert.equal((await api('GET', '/api/me')).status, 401);
  assert.equal((await api('GET', '/api/programs')).data.error, 'unauthorized');

  // register
  let r = await api('POST', '/api/auth/register', { name: 'Tester', email: 'Tester@Example.com', password: 'short' });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/auth/register', { name: 'Tester', email: 'Tester@Example.com', password: 'password123' });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('set-cookie').includes('HttpOnly'), true);
  assert.equal(r.headers.get('set-cookie').includes('SameSite=Lax'), true);
  assert.equal(r.data.user.email, 'tester@example.com');
  assert.equal(r.data.user.programId, null);
  assert.equal((await api('POST', '/api/auth/register', { name: 'X', email: 'tester@example.com', password: 'password123' })).status, 409);

  r = await api('GET', '/api/me');
  assert.equal(r.status, 200);
  assert.equal(r.data.subscription.status, 'unpaid');
  assert.equal(r.data.subscription.required, 0.5);
  assert.equal(r.data.stats.currentStreak, 0);

  // content allowed without subscription
  r = await api('GET', '/api/programs');
  assert.ok(r.data.programs.length > 0);
  const program = r.data.programs[0];
  r = await api('GET', `/api/programs/${program.id}`);
  assert.ok(r.data.program.days[0].exercises[0].exercise.name);
  assert.equal((await api('GET', '/api/programs/nope')).status, 404);
  assert.ok((await api('GET', '/api/exercises')).data.exercises.length > 0);

  // premium endpoints need active subscription
  r = await api('GET', '/api/today');
  assert.equal(r.status, 402);
  assert.equal(r.data.error, 'subscription_required');
  assert.equal((await api('GET', '/api/leaderboard')).status, 402);
  assert.equal((await api('POST', '/api/threads', { title: 'Hai', body: 'x', category: 'umum' })).status, 402);

  // pay
  r = await api('POST', '/api/subscription/pay', { plan: '2-months' });
  assert.equal(r.status, 200);
  assert.equal(r.data.subscription.status, 'active');
  assert.equal(r.data.subscription.cycleNumber, 1);
  assert.equal(r.data.subscription.daysLeft, 60);
  assert.equal(r.data.subscription.history[0].result, 'paid');
  assert.equal((await api('POST', '/api/subscription/pay', { plan: '2-months' })).status, 409);

  // choose program (default schedule), then make every day the first day so "today" is a training day
  r = await api('PUT', '/api/me/program', { programId: program.id });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.programId, program.id);
  assert.deepEqual(r.data.user.schedule, Object.fromEntries(Object.entries(program.defaultSchedule).map(([k, v]) => [k, v ?? null])));
  const dayId = program.days[0].id;
  assert.equal((await api('PUT', '/api/me/schedule', { schedule: { 0: 'not-a-day' } })).status, 400);
  r = await api('PUT', '/api/me/schedule', { schedule: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, dayId])) });
  assert.equal(r.status, 200);

  const date = today();
  r = await api('GET', `/api/today?date=${date}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.day.id, dayId);
  assert.equal(r.data.completed, false);
  assert.ok(r.data.day.exercises[0].exercise);
  assert.equal((await api('GET', '/api/today?date=2026-13-01')).status, 400);

  r = await api('GET', `/api/calendar?month=${date.slice(0, 7)}`);
  assert.equal(r.status, 200);
  assert.ok(r.data.days.length >= 28);
  assert.equal(r.data.days[0].dayId, dayId);

  // complete workout
  const ex = program.days[0].exercises[0];
  const workout = {
    date, dayId, durationSec: 1800, notes: 'Mantap',
    sets: [
      { exerciseId: ex.exerciseId, setIndex: 0, reps: 10, weight: 20, done: true },
      { exerciseId: ex.exerciseId, setIndex: 1, reps: 8, weight: 22.5, done: true },
      { exerciseId: ex.exerciseId, setIndex: 2, reps: null, weight: null, done: false },
    ],
  };
  r = await api('POST', '/api/workouts/complete', { ...workout, date: '2099-01-01' });
  assert.equal(r.status, 400);
  r = await api('POST', '/api/workouts/complete', workout);
  assert.equal(r.status, 201);
  assert.equal(r.data.log.setsDone, 2);
  assert.equal(r.data.log.totalVolume, 10 * 20 + 8 * 22.5);
  assert.equal(r.data.stats.totalWorkouts, 1);
  assert.equal(r.data.stats.currentStreak, 1);
  assert.ok(r.data.newBadges.some((b) => b.id === 'first-workout'));
  const logId = r.data.log.id;

  // duplicate
  r = await api('POST', '/api/workouts/complete', workout);
  assert.equal(r.status, 409);

  r = await api('GET', `/api/today?date=${date}`);
  assert.equal(r.data.completed, true);
  assert.equal(r.data.log.sets.length, 3);

  r = await api('GET', '/api/workouts/history');
  assert.equal(r.data.logs.length, 1);
  assert.equal(r.data.logs[0].dayName, program.days[0].name);

  // me stats
  r = await api('GET', '/api/me');
  assert.deepEqual(
    { s: r.data.stats.currentStreak, b: r.data.stats.bestStreak, w: r.data.stats.totalWorkouts, t: r.data.stats.totalSets },
    { s: 1, b: 1, w: 1, t: 2 },
  );
  assert.equal(r.data.subscription.completedCount, 1);
  assert.equal(r.data.subscription.scheduledCount, 1);
  assert.equal(r.data.subscription.completionRate, 1);

  // progress
  r = await api('POST', '/api/progress/body', { date, weight: 70.5, bodyFat: 18 });
  assert.equal(r.status, 201);
  const bodyId = r.data.bodyLog.id;
  r = await api('GET', '/api/progress');
  assert.equal(r.data.bodyLogs.length, 1);
  assert.equal(r.data.weeklyWorkouts.length, 12);
  assert.equal(r.data.weeklyWorkouts[11].count, 1);
  assert.deepEqual(r.data.exerciseBests[0], { exerciseId: ex.exerciseId, name: r.data.exerciseBests[0].name, bestWeight: 22.5, bestReps: 10 });
  assert.equal((await api('DELETE', `/api/progress/body/${bodyId}`)).data.ok, true);
  assert.equal((await api('DELETE', `/api/progress/body/${bodyId}`)).status, 404);

  // leaderboard
  r = await api('GET', '/api/leaderboard?category=dedicated&period=month');
  assert.equal(r.status, 200);
  assert.equal(r.data.title, 'The Most Dedicated Player');
  assert.equal(r.data.entries[0].isMe, true);
  assert.deepEqual(r.data.me, { rank: 1, value: 1 });
  r = await api('GET', '/api/leaderboard?category=consistent');
  assert.equal(r.data.unit, 'hari streak');
  assert.equal(r.data.me.value, 1);
  assert.equal((await api('GET', '/api/leaderboard?category=bogus')).status, 400);

  // threads
  r = await api('POST', '/api/threads', { title: 'Tips bulking', body: 'Gimana cara bulking bersih?', category: 'nutrisi' });
  assert.equal(r.status, 201);
  const threadId = r.data.thread.id;
  assert.equal((await api('POST', '/api/threads', { title: 'Hai semua', body: 'x', category: 'random' })).status, 400);
  r = await api('POST', `/api/threads/${threadId}/replies`, { body: 'Surplus kecil + protein cukup.' });
  assert.equal(r.status, 201);
  const replyId = r.data.reply.id;
  r = await api('POST', `/api/threads/${threadId}/replies`, { body: 'Setuju', parentId: replyId });
  assert.equal(r.data.reply.parentId, replyId);
  r = await api('GET', `/api/threads/${threadId}`);
  assert.equal(r.data.thread.title, 'Tips bulking');
  assert.equal(r.data.replies.length, 2);
  r = await api('GET', '/api/threads?category=nutrisi');
  assert.equal(r.data.threads[0].replyCount, 2);
  assert.equal(r.data.threads[0].user.name, 'Tester');
  assert.equal((await api('GET', '/api/threads?category=umum')).data.threads.length, 0);
  r = await api('GET', '/api/leaderboard?category=talkative');
  assert.equal(r.data.me.value, 3);

  // flex + like
  assert.equal((await api('POST', '/api/flex', { caption: 'x', imageData: 'data:image/gif;base64,R0lGOD' })).status, 400);
  assert.equal((await api('POST', '/api/flex', { caption: 'x', imageData: 'data:image/png;base64,AAAA' })).status, 400);
  r = await api('POST', '/api/flex', { caption: 'Leg day done!', imageData: PNG, workoutLogId: logId });
  assert.equal(r.status, 201);
  const post = r.data.post;
  assert.match(post.imageUrl, /^\/uploads\/[a-f0-9]{32}\.png$/);
  assert.equal(post.likes, 0);
  const img = await fetch(app.url + post.imageUrl);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  r = await api('POST', `/api/flex/${post.id}/like`);
  assert.deepEqual(r.data, { likes: 1, likedByMe: true });
  r = await api('GET', '/api/flex');
  assert.equal(r.data.posts[0].likedByMe, true);
  assert.equal(r.data.posts[0].user.name, 'Tester');
  r = await api('GET', '/api/leaderboard?category=liked');
  assert.equal(r.data.me.value, 1);
  r = await api('POST', `/api/flex/${post.id}/like`);
  assert.deepEqual(r.data, { likes: 0, likedByMe: false });

  // another user cannot delete it
  const other = client();
  await other('POST', '/api/auth/register', { name: 'Other', email: 'other@example.com', password: 'password123' });
  assert.equal((await other('DELETE', `/api/flex/${post.id}`)).status, 403);
  assert.equal((await other('GET', '/api/flex')).data.posts[0].likedByMe, false);
  assert.equal((await api('DELETE', `/api/flex/${post.id}`)).data.ok, true);
  assert.equal((await fetch(app.url + post.imageUrl)).status, 404);

  // logout / login
  assert.equal((await api('POST', '/api/auth/logout')).data.ok, true);
  assert.equal((await api('GET', '/api/me')).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { email: 'tester@example.com', password: 'wrongpass1' })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { email: 'tester@example.com', password: 'password123' })).status, 200);

  // time travel past cycle end: 1 of ~60 scheduled days done -> locked
  r = await api('POST', '/api/dev/time-travel', { days: 61 });
  assert.equal(r.status, 200);
  r = await api('GET', '/api/me');
  assert.equal(r.data.subscription.status, 'locked');
  assert.equal(r.data.subscription.history[0].result, 'locked');
  assert.ok(r.data.subscription.history[0].completionRate < 0.5);
  assert.equal(r.data.stats.currentStreak, 0);
  assert.equal(r.data.stats.bestStreak, 1);
  assert.equal((await api('GET', '/api/today')).status, 402);
  r = await api('POST', '/api/subscription/pay', { plan: '2-months' });
  assert.equal(r.data.subscription.status, 'active');
  assert.equal(r.data.subscription.cycleNumber, 2);
  assert.deepEqual(r.data.subscription.history.map((h) => h.result), ['paid', 'locked', 'paid']);
  resetTravel();
});

test('static files, SPA fallback, traversal and errors', async () => {
  const hasIndex = fs.existsSync(path.join(import.meta.dirname, '..', 'public', 'index.html'));
  let res = await fetch(app.url + '/');
  assert.equal(res.status, hasIndex ? 200 : 404);
  if (hasIndex) assert.match(res.headers.get('content-type'), /text\/html/);
  res = await fetch(app.url + '/dashboard/deep/link');
  assert.equal(res.status, hasIndex ? 200 : 404);
  res = await fetch(app.url + '/missing.js');
  assert.equal(res.status, 404);
  res = await fetch(app.url + '/%2e%2e/%2e%2e/package.json');
  assert.notEqual(res.status, 200);
  res = await fetch(app.url + '/..%2fserver%2fdb.js');
  assert.notEqual(res.status, 200);
  res = await fetch(app.url + '/uploads/../server/db.js');
  assert.notEqual(res.status, 200);
  res = await fetch(app.url + '/api/nope');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'not_found');
  res = await fetch(app.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'invalid_json');
  res = await fetch(app.url + '/api/auth/login', { method: 'POST', body: 'x'.repeat(6 * 1024 * 1024) });
  assert.equal(res.status, 413);
});

test('cycle with >=50% completion renews for free', async () => {
  const api = client();
  await api('POST', '/api/auth/register', { name: 'Rajin', email: 'rajin@example.com', password: 'password123' });
  await api('POST', '/api/subscription/pay', { plan: '2-months' });
  const program = (await api('GET', '/api/programs')).data.programs[0];
  const dayId = program.days[0].id;
  // train only on one weekday: today's weekday
  const wd = new Date(today() + 'T00:00:00Z').getUTCDay();
  await api('PUT', '/api/me/program', { programId: program.id, schedule: { [wd]: dayId } });
  // complete that weekday every week for ~9 weeks (travel forward 7 days each time)
  for (let week = 0; week < 9; week++) {
    const r = await api('POST', '/api/workouts/complete', { date: today(), dayId, durationSec: 600, sets: [] });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    await api('POST', '/api/dev/time-travel', { days: 7 });
  }
  const r = await api('GET', '/api/me');
  assert.equal(r.data.subscription.status, 'active');
  assert.equal(r.data.subscription.cycleNumber, 2);
  assert.equal(r.data.subscription.history[0].result, 'renewed');
  assert.ok(r.data.subscription.history[0].completionRate >= 0.5);
  resetTravel();
});

test('dev endpoint is 404 when dev mode is off', async () => {
  const off = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', dev: false, uploadsDir, log: false });
  try {
    const res = await fetch(off.url + '/api/dev/time-travel', { method: 'POST', body: '{"days":1}' });
    assert.equal(res.status, 404);
  } finally {
    await off.close();
  }
});
