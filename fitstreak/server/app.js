// Builds the HTTP request handler: /api router, /uploads, static SPA.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { HttpError, Router, sendJson, sendError, readJson, parseCookies, safeJoin, serveFile, sendText } from './http.js';
import { APP_ROOT, UPLOADS_DIR } from './db.js';
import { getUser, evaluateSubscription } from './services.js';

import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import contentRoutes from './routes/content.js';
import workoutRoutes from './routes/workouts.js';
import progressRoutes from './routes/progress.js';
import flexRoutes from './routes/flex.js';
import threadRoutes from './routes/threads.js';
import leaderboardRoutes from './routes/leaderboard.js';
import devRoutes from './routes/dev.js';

export const SESSION_COOKIE = 'fs_sid';
export const SESSION_TTL_MS = 30 * 86_400_000;

const PUBLIC_DIR = path.join(APP_ROOT, 'public');
const UPLOAD_NAME_RE = /^[a-f0-9]{32}\.(png|jpg|webp)$/;

export function createHandler({ db, uploadsDir = UPLOADS_DIR, publicDir = PUBLIC_DIR, dev = process.env.FITSTREAK_DEV === '1' }) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const router = new Router();
  const ctx = { db, uploadsDir, dev };
  for (const register of [authRoutes, meRoutes, contentRoutes, workoutRoutes, progressRoutes, flexRoutes, threadRoutes, leaderboardRoutes, devRoutes]) {
    register(router, ctx);
  }

  function sessionUser(req) {
    const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
    // Sessions expire in real time (not time-travel time) so dev time travel does not log people out.
    const s = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sid);
    if (!s) return null;
    if (s.expires_at < Date.now()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
      return null;
    }
    const row = getUser(db, s.user_id);
    return row ? { row, sid } : null;
  }

  async function handleApi(req, res, url) {
    let m;
    try { m = router.match(req.method, url.pathname); } catch { throw new HttpError(400, 'bad_request', 'URL tidak valid.'); }
    if (!m) throw new HttpError(404, 'not_found', 'Endpoint tidak ditemukan.');
    if (m.methodNotAllowed) throw new HttpError(405, 'method_not_allowed', 'Metode tidak didukung.');

    let session;
    let bodyPromise;
    const c = {
      req, res, url, db, ctx,
      params: m.params,
      query: url.searchParams,
      body() {
        bodyPromise ??= readJson(req);
        return bodyPromise;
      },
      get session() {
        if (session === undefined) session = sessionUser(req);
        return session;
      },
      /** Logged-in user row (subscription lazily evaluated) or 401. */
      requireUser() {
        const s = c.session;
        if (!s) throw new HttpError(401, 'unauthorized', 'Silakan login terlebih dahulu.');
        if (!c._evaluated) {
          s.row = evaluateSubscription(db, s.row);
          c._evaluated = true;
        }
        return s.row;
      },
      /** Logged-in user with an active subscription, or 401/402. */
      requireActive() {
        const u = c.requireUser();
        if (u.sub_status !== 'active') throw new HttpError(402, 'subscription_required', 'Fitur ini butuh langganan aktif.');
        return u;
      },
      createSession(userId) {
        const sid = crypto.randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sid, userId, Date.now() + SESSION_TTL_MS);
        db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
        return { 'Set-Cookie': `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}` };
      },
      clearSession() {
        const s = c.session;
        if (s) db.prepare('DELETE FROM sessions WHERE id = ?').run(s.sid);
        return { 'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` };
      },
    };
    const result = await m.handler(c);
    const { status = 200, data, headers = {} } = result && 'data' in result ? result : { data: result };
    sendJson(res, status, data, headers);
  }

  return async function handler(req, res) {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return sendText(res, 400, 'Bad request');
    }
    try {
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        return await handleApi(req, res, url);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method not allowed');

      if (url.pathname.startsWith('/uploads/')) {
        const name = url.pathname.slice('/uploads/'.length);
        if (UPLOAD_NAME_RE.test(name) && serveFile(req, res, path.join(uploadsDir, name), {
          cache: 'public, max-age=31536000, immutable',
          extraHeaders: { 'Content-Security-Policy': "default-src 'none'; img-src 'self'" },
        })) return;
        return sendText(res, 404, 'Not found');
      }

      const filePath = safeJoin(publicDir, url.pathname);
      if (!filePath) return sendText(res, 400, 'Bad request');
      if (serveFile(req, res, filePath)) return;
      if (url.pathname.endsWith('/') && serveFile(req, res, path.join(filePath, 'index.html'))) return;
      // SPA fallback: extension-less paths get index.html; missing assets 404.
      if (!path.extname(url.pathname) && serveFile(req, res, path.join(publicDir, 'index.html'))) return;
      return sendText(res, 404, 'Not found');
    } catch (err) {
      if (err instanceof HttpError) return sendError(res, err);
      console.error(err);
      if (!res.headersSent) sendJson(res, 500, { error: 'server_error', message: 'Terjadi kesalahan pada server.' });
      else res.end();
    }
  };
}

