import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { HttpError, bad } from '../http.js';
import { str, positiveId, limitParam } from '../validate.js';
import { nowIso } from '../time.js';
import { joinedUser } from '../services.js';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const EXT = { png: 'png', jpeg: 'jpg', webp: 'webp' };

function magicOk(type, buf) {
  if (type === 'png') return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === 'jpeg') return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'webp') return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

/** Validate a data URL; returns {buf, ext}. */
export function decodeImage(dataUrl) {
  if (typeof dataUrl !== 'string') throw bad('invalid_image', 'Gambar tidak valid.');
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) throw bad('invalid_image', 'Gambar harus PNG, JPEG, atau WEBP.');
  if (m[2].length * 0.75 > MAX_IMAGE_BYTES + 3) throw bad('image_too_large', 'Ukuran gambar maksimal 3MB.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_IMAGE_BYTES) throw bad('image_too_large', 'Ukuran gambar maksimal 3MB.');
  if (!magicOk(m[1], buf)) throw bad('invalid_image', 'Isi file tidak sesuai format gambar.');
  return { buf, ext: EXT[m[1]] };
}

const POST_SQL = `SELECT p.*, u.id AS u_id, u.name AS u_name, u.avatar_color AS u_color,
  (SELECT COUNT(*) FROM flex_likes l WHERE l.post_id = p.id) AS likes,
  EXISTS (SELECT 1 FROM flex_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me
  FROM flex_posts p JOIN users u ON u.id = p.user_id`;

const postView = (r) => ({
  id: r.id,
  user: joinedUser(r),
  caption: r.caption,
  imageUrl: r.image_file ? `/uploads/${r.image_file}` : null,
  workoutLogId: r.workout_log_id ?? null,
  likes: r.likes,
  likedByMe: !!r.liked_by_me,
  createdAt: r.created_at,
});

export default function register(router, { db, uploadsDir }) {
  router.get('/api/flex', (c) => {
    const u = c.requireUser();
    const limit = limitParam(c.query.get('limit'), 30, 100);
    const rows = db.prepare(`${POST_SQL} ORDER BY p.created_at DESC, p.id DESC LIMIT ?`).all(u.id, limit);
    return { posts: rows.map(postView) };
  });

  router.post('/api/flex', async (c) => {
    const u = c.requireActive();
    const b = await c.body();
    const caption = str(b.caption, 'Caption', { max: 1000, optional: true });
    let workoutLogId = null;
    if (b.workoutLogId !== undefined && b.workoutLogId !== null) {
      workoutLogId = positiveId(b.workoutLogId);
      if (!workoutLogId || !db.prepare('SELECT 1 FROM workout_logs WHERE id = ? AND user_id = ?').get(workoutLogId, u.id)) {
        throw bad('invalid_workout', 'Workout tidak ditemukan.');
      }
    }
    let imageFile = null;
    let img = null;
    if (b.imageData !== undefined && b.imageData !== null && b.imageData !== '') {
      img = decodeImage(b.imageData);
      imageFile = `${crypto.randomBytes(16).toString('hex')}.${img.ext}`;
    }
    if (!caption && !imageFile) throw bad('invalid_input', 'Isi caption atau unggah foto.');
    if (img) fs.writeFileSync(path.join(uploadsDir, imageFile), img.buf, { flag: 'wx' });
    let id;
    try {
      id = Number(db.prepare('INSERT INTO flex_posts (user_id, caption, image_file, workout_log_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, caption, imageFile, workoutLogId, nowIso()).lastInsertRowid);
    } catch (e) {
      if (imageFile) fs.rmSync(path.join(uploadsDir, imageFile), { force: true });
      throw e;
    }
    return { status: 201, data: { post: postView(db.prepare(`${POST_SQL} WHERE p.id = ?`).get(u.id, id)) } };
  });

  router.post('/api/flex/:id/like', (c) => {
    const u = c.requireActive();
    const id = positiveId(c.params.id);
    if (!id || !db.prepare('SELECT 1 FROM flex_posts WHERE id = ?').get(id)) throw new HttpError(404, 'not_found', 'Postingan tidak ditemukan.');
    const del = db.prepare('DELETE FROM flex_likes WHERE post_id = ? AND user_id = ?').run(id, u.id);
    if (!del.changes) db.prepare('INSERT INTO flex_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').run(id, u.id, nowIso());
    const likes = db.prepare('SELECT COUNT(*) AS n FROM flex_likes WHERE post_id = ?').get(id).n;
    return { likes, likedByMe: !del.changes };
  });

  router.delete('/api/flex/:id', (c) => {
    // Deleting your own post is allowed even without an active subscription.
    const u = c.requireUser();
    const id = positiveId(c.params.id);
    const post = id && db.prepare('SELECT * FROM flex_posts WHERE id = ?').get(id);
    if (!post) throw new HttpError(404, 'not_found', 'Postingan tidak ditemukan.');
    if (post.user_id !== u.id) throw new HttpError(403, 'forbidden', 'Kamu hanya bisa menghapus postinganmu sendiri.');
    db.prepare('DELETE FROM flex_posts WHERE id = ?').run(id);
    if (post.image_file && /^[a-f0-9]{32}\.(png|jpg|webp)$/.test(post.image_file)) {
      fs.rmSync(path.join(uploadsDir, post.image_file), { force: true });
    }
    return { ok: true };
  });
}
