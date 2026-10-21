// Small HTTP helpers: errors, JSON I/O, cookies, static files, router.
import fs from 'node:fs';
import path from 'node:path';

export const MAX_BODY_BYTES = 5 * 1024 * 1024; // flex image (<=3MB decoded ≈ 4MB base64) + JSON

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.userMessage = message;
  }
}

export const bad = (code, message) => new HttpError(400, code, message);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};

export function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

export function sendError(res, err) {
  const payload = { error: err.code };
  if (err.userMessage) payload.message = err.userMessage;
  sendJson(res, err.status, payload);
}

/** Read and parse a JSON body (empty body -> {}). */
export function readJson(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > limit) {
      reject(new HttpError(413, 'payload_too_large', 'Data terlalu besar.'));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) {
        done = true;
        reject(new HttpError(413, 'payload_too_large', 'Data terlalu besar.'));
        req.resume();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        const v = JSON.parse(raw);
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not object');
        resolve(v);
      } catch {
        reject(bad('invalid_json', 'Format JSON tidak valid.'));
      }
    });
    req.on('error', (e) => {
      if (!done) { done = true; reject(e); }
    });
  });
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}

// ---------------------------------------------------------------- static files
export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Resolve a URL pathname inside root, refusing traversal. Returns an absolute
 * path or null.
 */
export function safeJoin(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const full = path.resolve(root, '.' + path.posix.normalize('/' + decoded));
  const rootResolved = path.resolve(root);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) return null;
  return full;
}

/** Stream a file. Returns false when it does not exist / is not a file. */
export function serveFile(req, res, filePath, { cache = 'no-cache', extraHeaders = {} } = {}) {
  let st;
  try { st = fs.statSync(filePath); } catch { return false; }
  if (!st.isFile()) return false;
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': type,
    'Content-Length': st.size,
    'Cache-Control': cache,
    'Last-Modified': st.mtime.toUTCString(),
    ...extraHeaders,
  });
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

export function sendText(res, status, text) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

// ---------------------------------------------------------------- router
export class Router {
  constructor() { this.routes = []; }
  add(method, pattern, handler) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, handler });
  }
  get(p, h) { this.add('GET', p, h); }
  post(p, h) { this.add('POST', p, h); }
  put(p, h) { this.add('PUT', p, h); }
  delete(p, h) { this.add('DELETE', p, h); }
  /** -> {handler, params} | {methodNotAllowed:true} | null */
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handler: r.handler, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}
