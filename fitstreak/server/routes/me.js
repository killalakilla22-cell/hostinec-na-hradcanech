import { HttpError, bad } from '../http.js';
import { clientDate } from '../validate.js';
import { today } from '../time.js';
import * as rules from '../rules.js';
import { getProgram, getDay, expandDay } from '../content.js';
import { publicUser, getUser, subscriptionView, computeStats, payForCycle, parseSchedule, logView } from '../services.js';

export default function register(router, { db }) {
  router.get('/api/me', (c) => {
    const u = c.requireUser();
    return { user: publicUser(u), subscription: subscriptionView(db, u), stats: computeStats(db, u) };
  });

  router.post('/api/subscription/pay', async (c) => {
    const u = c.requireUser();
    const b = await c.body();
    if (b.plan !== undefined && b.plan !== '2-months') throw bad('invalid_plan', 'Paket tidak dikenal.');
    if (u.sub_status === 'active') throw new HttpError(409, 'already_active', 'Langganan kamu masih aktif.');
    // Payment is SIMULATED here — integration point for a real gateway (Midtrans/Stripe).
    const updated = payForCycle(db, u);
    return { subscription: subscriptionView(db, updated) };
  });

  router.put('/api/me/program', async (c) => {
    const u = c.requireActive();
    const b = await c.body();
    const program = typeof b.programId === 'string' ? getProgram(b.programId) : null;
    if (!program) throw new HttpError(404, 'program_not_found', 'Program tidak ditemukan.');
    const dayIds = program.days.map((d) => d.id);
    const schedule = rules.normalizeSchedule(b.schedule ?? program.defaultSchedule, dayIds);
    if (!schedule) throw bad('invalid_schedule', 'Jadwal tidak valid untuk program ini.');
    db.prepare('UPDATE users SET program_id = ?, schedule = ? WHERE id = ?').run(program.id, JSON.stringify(schedule), u.id);
    return { user: publicUser(getUser(db, u.id)) };
  });

  router.put('/api/me/schedule', async (c) => {
    const u = c.requireActive();
    const b = await c.body();
    const program = u.program_id ? getProgram(u.program_id) : null;
    if (!program) throw bad('no_program', 'Pilih program terlebih dahulu.');
    const schedule = rules.normalizeSchedule(b.schedule, program.days.map((d) => d.id));
    if (!schedule) throw bad('invalid_schedule', 'Jadwal tidak valid untuk program ini.');
    db.prepare('UPDATE users SET schedule = ? WHERE id = ?').run(JSON.stringify(schedule), u.id);
    return { user: publicUser(getUser(db, u.id)) };
  });

  router.get('/api/calendar', (c) => {
    const u = c.requireActive();
    const month = c.query.get('month') || today().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw bad('invalid_month', 'Format bulan harus YYYY-MM.');
    const schedule = parseSchedule(u.schedule);
    const first = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const last = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const done = new Set(db.prepare('SELECT DISTINCT date FROM workout_logs WHERE user_id = ? AND date >= ? AND date <= ?')
      .all(u.id, first, last).map((r) => r.date));
    const days = [];
    for (let d = first; d <= last; d = rules.addDays(d, 1)) {
      const dayId = rules.scheduledDayId(schedule, d);
      const found = dayId ? getDay(dayId) : null;
      days.push({ date: d, dayId, dayName: found ? found.day.name : null, completed: done.has(d), isRest: !dayId });
    }
    return { month, days };
  });

  router.get('/api/today', (c) => {
    const u = c.requireActive();
    const q = c.query.get('date');
    const date = q ? clientDate(q) : today();
    const dayId = rules.scheduledDayId(parseSchedule(u.schedule), date);
    const found = dayId ? getDay(dayId) : null;
    const logRow = found
      ? db.prepare('SELECT * FROM workout_logs WHERE user_id = ? AND date = ? AND day_id = ?').get(u.id, date, dayId)
      : null;
    return {
      date,
      day: found ? expandDay(found.day) : null,
      completed: !!logRow,
      log: logRow ? logView(db, logRow, true) : null,
    };
  });
}
