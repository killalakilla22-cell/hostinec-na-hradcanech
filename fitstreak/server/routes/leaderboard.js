import { bad } from '../http.js';
import { now, today } from '../time.js';
import * as rules from '../rules.js';
import { userMini, currentStreak } from '../services.js';

/**
 * Raw values per user id for a category/period.
 * period=month: last 30 days (log dates >= today-29, or created_at within 30x24h).
 * consistent always uses the current streak.
 */
function valuesFor(db, category, period, users) {
  const sinceDate = period === 'month' ? rules.addDays(today(), -29) : '0000-00-00';
  const sinceIso = period === 'month' ? new Date(now() - 30 * 86_400_000).toISOString() : '';
  const map = new Map();
  const put = (rows) => { for (const r of rows) map.set(r.user_id, r.value); };
  switch (category) {
    case 'consistent': {
      const byUser = new Map();
      for (const r of db.prepare('SELECT DISTINCT user_id, date FROM workout_logs').all()) {
        if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
        byUser.get(r.user_id).add(r.date);
      }
      for (const u of users) map.set(u.id, byUser.has(u.id) ? currentStreak(u, byUser.get(u.id)) : 0);
      break;
    }
    case 'dedicated':
      put(db.prepare('SELECT user_id, COUNT(*) AS value FROM workout_logs WHERE date >= ? GROUP BY user_id').all(sinceDate));
      break;
    case 'hardworking':
      put(db.prepare('SELECT user_id, SUM(sets_done) AS value FROM workout_logs WHERE date >= ? GROUP BY user_id').all(sinceDate));
      break;
    case 'liked':
      put(db.prepare(`SELECT p.user_id, COUNT(*) AS value FROM flex_likes l JOIN flex_posts p ON p.id = l.post_id
        WHERE l.created_at >= ? GROUP BY p.user_id`).all(sinceIso));
      break;
    case 'talkative':
      put(db.prepare(`SELECT user_id, COUNT(*) AS value FROM (
          SELECT user_id FROM threads WHERE created_at >= ?
          UNION ALL SELECT user_id FROM replies WHERE created_at >= ?
        ) GROUP BY user_id`).all(sinceIso, sinceIso));
      break;
  }
  return map;
}

export default function register(router, { db }) {
  router.get('/api/leaderboard', (c) => {
    const me = c.requireActive();
    const category = c.query.get('category') || 'consistent';
    const period = c.query.get('period') || 'all';
    if (!rules.LEADERBOARD[category]) throw bad('invalid_category', 'Kategori leaderboard tidak dikenal.');
    if (period !== 'all' && period !== 'month') throw bad('invalid_period', 'Periode harus all atau month.');
    const users = db.prepare('SELECT * FROM users').all();
    const values = valuesFor(db, category, period, users);
    const rows = users.map((u) => ({ user: userMini(u), value: Number(values.get(u.id) || 0) }));
    const { entries, me: mine } = rules.rankEntries(rows, me.id, 50);
    return { category, period, ...rules.LEADERBOARD[category], entries, me: mine };
  });
}
