import { HttpError, bad } from '../http.js';
import { clientDate, num, str, limitParam } from '../validate.js';
import { nowIso } from '../time.js';
import { tx } from '../db.js';
import * as rules from '../rules.js';
import { getDay, getExercise } from '../content.js';
import { computeStats, logView } from '../services.js';

const MAX_SETS = 300;

export default function register(router, { db }) {
  router.post('/api/workouts/complete', async (c) => {
    const u = c.requireActive();
    const b = await c.body();
    const date = clientDate(b.date);
    const found = typeof b.dayId === 'string' ? getDay(b.dayId) : null;
    if (!found) throw new HttpError(404, 'day_not_found', 'Hari latihan tidak ditemukan.');
    const durationSec = num(b.durationSec ?? 0, 'Durasi', { min: 0, max: 86400 });
    const notes = str(b.notes, 'Catatan', { max: 2000, optional: true });
    if (b.sets !== undefined && !Array.isArray(b.sets)) throw bad('invalid_input', 'sets harus berupa array.');
    const rawSets = b.sets || [];
    if (rawSets.length > MAX_SETS) throw bad('invalid_input', 'Terlalu banyak set.');
    const sets = rawSets.map((s, i) => {
      if (!s || typeof s !== 'object') throw bad('invalid_input', `Set #${i + 1} tidak valid.`);
      if (typeof s.exerciseId !== 'string' || !getExercise(s.exerciseId)) throw bad('invalid_input', `Latihan pada set #${i + 1} tidak dikenal.`);
      return {
        exerciseId: s.exerciseId,
        setIndex: num(s.setIndex ?? i, 'setIndex', { min: 0, max: 1000, integer: true }),
        reps: num(s.reps, 'Reps', { min: 0, max: 10000, optional: true }),
        weight: num(s.weight, 'Beban', { min: 0, max: 2000, optional: true }),
        done: s.done === true,
      };
    });
    const doneSets = sets.filter((s) => s.done);
    const setsDone = doneSets.length;
    const totalVolume = doneSets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);

    if (db.prepare('SELECT 1 FROM workout_logs WHERE user_id = ? AND date = ? AND day_id = ?').get(u.id, date, found.day.id)) {
      throw new HttpError(409, 'already_completed', 'Workout ini sudah tercatat untuk tanggal tersebut.');
    }
    const before = computeStats(db, u);
    let logId;
    try {
      logId = tx(db, () => {
        const id = Number(db.prepare(`INSERT INTO workout_logs (user_id, date, day_id, program_id, duration_sec, sets_done, total_volume, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u.id, date, found.day.id, found.program.id, Math.round(durationSec), setsDone, totalVolume, notes, nowIso()).lastInsertRowid);
        const ins = db.prepare('INSERT INTO workout_sets (log_id, exercise_id, set_index, reps, weight, done) VALUES (?, ?, ?, ?, ?, ?)');
        for (const s of sets) ins.run(id, s.exerciseId, s.setIndex, s.reps, s.weight, s.done ? 1 : 0);
        return id;
      });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'already_completed', 'Workout ini sudah tercatat untuk tanggal tersebut.');
      throw e;
    }
    const stats = computeStats(db, u);
    const log = logView(db, db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(logId), true);
    return { status: 201, data: { log, stats, newBadges: rules.newBadges(before, stats) } };
  });

  router.get('/api/workouts/history', (c) => {
    const u = c.requireActive();
    const limit = limitParam(c.query.get('limit'), 50, 200);
    const rows = db.prepare('SELECT * FROM workout_logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?').all(u.id, limit);
    return { logs: rows.map((r) => logView(db, r)) };
  });
}
