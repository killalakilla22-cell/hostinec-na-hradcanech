import { HttpError } from '../http.js';
import { clientDate, num, str, positiveId } from '../validate.js';
import { nowIso, today } from '../time.js';
import * as rules from '../rules.js';
import { getExercise } from '../content.js';

const bodyView = (r) => ({ id: r.id, date: r.date, weight: r.weight, bodyFat: r.body_fat, waist: r.waist, note: r.note });

export default function register(router, { db }) {
  router.get('/api/progress', (c) => {
    const u = c.requireActive();
    const bodyLogs = db.prepare('SELECT * FROM body_logs WHERE user_id = ? ORDER BY date ASC, id ASC').all(u.id).map(bodyView);

    const thisWeek = rules.weekStartOf(today());
    const firstWeek = rules.addDays(thisWeek, -7 * 11);
    const counts = new Map();
    for (const r of db.prepare('SELECT date FROM workout_logs WHERE user_id = ? AND date >= ?').all(u.id, firstWeek)) {
      const ws = rules.weekStartOf(r.date);
      counts.set(ws, (counts.get(ws) || 0) + 1);
    }
    const weeklyWorkouts = [];
    for (let i = 0; i < 12; i++) {
      const ws = rules.addDays(firstWeek, 7 * i);
      weeklyWorkouts.push({ weekStart: ws, count: counts.get(ws) || 0 });
    }

    const exerciseBests = db.prepare(`SELECT s.exercise_id, MAX(s.weight) AS best_weight, MAX(s.reps) AS best_reps
      FROM workout_sets s JOIN workout_logs l ON l.id = s.log_id
      WHERE l.user_id = ? AND s.done = 1 GROUP BY s.exercise_id ORDER BY s.exercise_id`).all(u.id)
      .map((r) => ({
        exerciseId: r.exercise_id,
        name: getExercise(r.exercise_id)?.name || r.exercise_id,
        bestWeight: r.best_weight,
        bestReps: r.best_reps,
      }));
    return { bodyLogs, weeklyWorkouts, exerciseBests };
  });

  router.post('/api/progress/body', async (c) => {
    const u = c.requireActive();
    const b = await c.body();
    const date = clientDate(b.date);
    const weight = num(b.weight, 'Berat badan', { min: 20, max: 400 });
    const bodyFat = num(b.bodyFat, 'Body fat', { min: 1, max: 75, optional: true });
    const waist = num(b.waist, 'Lingkar pinggang', { min: 30, max: 250, optional: true });
    const note = str(b.note, 'Catatan', { max: 500, optional: true });
    const id = Number(db.prepare('INSERT INTO body_logs (user_id, date, weight, body_fat, waist, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(u.id, date, weight, bodyFat, waist, note, nowIso()).lastInsertRowid);
    return { status: 201, data: { bodyLog: bodyView(db.prepare('SELECT * FROM body_logs WHERE id = ?').get(id)) } };
  });

  router.delete('/api/progress/body/:id', (c) => {
    const u = c.requireActive();
    const id = positiveId(c.params.id);
    const r = id && db.prepare('DELETE FROM body_logs WHERE id = ? AND user_id = ?').run(id, u.id);
    if (!r || !r.changes) throw new HttpError(404, 'not_found', 'Data tidak ditemukan.');
    return { ok: true };
  });
}
