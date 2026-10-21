import crypto from 'node:crypto';
import { HttpError, bad } from '../http.js';
import { str } from '../validate.js';
import { nowIso } from '../time.js';
import { publicUser, getUser } from '../services.js';

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const AVATAR_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'));
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Constant dummy hash so login for unknown emails costs the same time.
let dummyHash;

export default function register(router, { db }) {
  router.post('/api/auth/register', async (c) => {
    const b = await c.body();
    const name = str(b.name, 'Nama', { min: 1, max: 60 });
    const email = str(b.email, 'Email', { min: 3, max: 254 }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw bad('invalid_email', 'Format email tidak valid.');
    if (typeof b.password !== 'string' || b.password.length < 8) throw bad('weak_password', 'Password minimal 8 karakter.');
    if (b.password.length > 200) throw bad('invalid_input', 'Password terlalu panjang.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'email_taken', 'Email sudah terdaftar.');
    }
    const hash = await hashPassword(b.password);
    const color = AVATAR_COLORS[crypto.randomInt(AVATAR_COLORS.length)];
    let id;
    try {
      id = db.prepare('INSERT INTO users (name, email, password_hash, avatar_color, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(name, email, hash, color, nowIso()).lastInsertRowid;
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'email_taken', 'Email sudah terdaftar.');
      throw e;
    }
    const headers = c.createSession(Number(id));
    return { status: 201, data: { user: publicUser(getUser(db, Number(id))) }, headers };
  });

  router.post('/api/auth/login', async (c) => {
    const b = await c.body();
    if (typeof b.email !== 'string' || typeof b.password !== 'string' || b.password.length > 200) {
      throw bad('invalid_input', 'Email dan password wajib diisi.');
    }
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(b.email.trim().toLowerCase());
    dummyHash ??= await hashPassword('dummy-password');
    const ok = await verifyPassword(b.password, row ? row.password_hash : dummyHash);
    if (!row || !ok) throw new HttpError(401, 'invalid_credentials', 'Email atau password salah.');
    const headers = c.createSession(row.id);
    return { data: { user: publicUser(row) }, headers };
  });

  router.post('/api/auth/logout', async (c) => {
    const headers = c.clearSession();
    return { data: { ok: true }, headers };
  });
}
