import { HttpError, bad } from '../http.js';
import { str, positiveId } from '../validate.js';
import { nowIso } from '../time.js';
import { joinedUser } from '../services.js';

export const CATEGORIES = ['umum', 'nutrisi', 'program', 'motivasi', 'tanya'];

const excerpt = (body) => (body.length > 160 ? body.slice(0, 157).trimEnd() + '...' : body);

const LIST_SQL = `SELECT t.*, u.id AS u_id, u.name AS u_name, u.avatar_color AS u_color,
  (SELECT COUNT(*) FROM replies r WHERE r.thread_id = t.id) AS reply_count,
  COALESCE((SELECT MAX(r.created_at) FROM replies r WHERE r.thread_id = t.id), t.created_at) AS last_activity
  FROM threads t JOIN users u ON u.id = t.user_id`;

const listView = (r) => ({
  id: r.id,
  title: r.title,
  category: r.category,
  user: joinedUser(r),
  replyCount: r.reply_count,
  lastActivityAt: r.last_activity > r.created_at ? r.last_activity : r.created_at,
  createdAt: r.created_at,
  excerpt: excerpt(r.body),
});

const threadView = (r) => ({ id: r.id, title: r.title, body: r.body, category: r.category, user: joinedUser(r), createdAt: r.created_at });

const REPLY_SQL = `SELECT r.*, u.id AS u_id, u.name AS u_name, u.avatar_color AS u_color FROM replies r JOIN users u ON u.id = r.user_id`;
const replyView = (r) => ({ id: r.id, body: r.body, user: joinedUser(r), parentId: r.parent_id ?? null, createdAt: r.created_at });

export default function register(router, { db }) {
  router.get('/api/threads', (c) => {
    c.requireUser();
    const category = c.query.get('category');
    if (category && !CATEGORIES.includes(category)) throw bad('invalid_category', 'Kategori tidak dikenal.');
    const rows = category
      ? db.prepare(`${LIST_SQL} WHERE t.category = ? ORDER BY last_activity DESC, t.id DESC LIMIT 100`).all(category)
      : db.prepare(`${LIST_SQL} ORDER BY last_activity DESC, t.id DESC LIMIT 100`).all();
    return { threads: rows.map(listView) };
  });

  router.post('/api/threads', async (c) => {
    const u = c.requireActive();
    const b = await c.body();
    const title = str(b.title, 'Judul', { min: 3, max: 150 });
    const body = str(b.body, 'Isi', { min: 1, max: 5000 });
    if (!CATEGORIES.includes(b.category)) throw bad('invalid_category', 'Kategori tidak dikenal.');
    const id = Number(db.prepare('INSERT INTO threads (user_id, title, body, category, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, title, body, b.category, nowIso()).lastInsertRowid);
    return { status: 201, data: { thread: threadView(db.prepare(`${LIST_SQL} WHERE t.id = ?`).get(id)) } };
  });

  router.get('/api/threads/:id', (c) => {
    c.requireUser();
    const id = positiveId(c.params.id);
    const t = id && db.prepare(`${LIST_SQL} WHERE t.id = ?`).get(id);
    if (!t) throw new HttpError(404, 'not_found', 'Thread tidak ditemukan.');
    const replies = db.prepare(`${REPLY_SQL} WHERE r.thread_id = ? ORDER BY r.created_at ASC, r.id ASC`).all(id).map(replyView);
    return { thread: threadView(t), replies };
  });

  router.post('/api/threads/:id/replies', async (c) => {
    const u = c.requireActive();
    const id = positiveId(c.params.id);
    if (!id || !db.prepare('SELECT 1 FROM threads WHERE id = ?').get(id)) throw new HttpError(404, 'not_found', 'Thread tidak ditemukan.');
    const b = await c.body();
    const body = str(b.body, 'Balasan', { min: 1, max: 3000 });
    let parentId = null;
    if (b.parentId !== undefined && b.parentId !== null) {
      const pid = positiveId(b.parentId);
      const parent = pid && db.prepare('SELECT id, parent_id FROM replies WHERE id = ? AND thread_id = ?').get(pid, id);
      if (!parent) throw bad('invalid_parent', 'Balasan induk tidak ditemukan.');
      // Nesting is one level deep: replying to a nested reply attaches to its top-level parent.
      parentId = parent.parent_id ?? parent.id;
    }
    const rid = Number(db.prepare('INSERT INTO replies (thread_id, user_id, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, u.id, parentId, body, nowIso()).lastInsertRowid);
    return { status: 201, data: { reply: replyView(db.prepare(`${REPLY_SQL} WHERE r.id = ?`).get(rid)) } };
  });
}
