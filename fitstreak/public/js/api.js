// Fetch wrapper for the FitStreak API (see CONTRACT.md).
import { toast } from './ui.js';

export class ApiError extends Error {
  constructor(status, code, message, data) {
    super(message || code || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
  get isPaywall() { return this.status === 402; }
  get isAuth() { return this.status === 401; }
}

const MESSAGES = {
  subscription_required: 'Fitur ini butuh langganan aktif.',
  unauthorized: 'Silakan masuk dulu.',
  not_found: 'Data tidak ditemukan.',
  network: 'Tidak bisa terhubung ke server. Cek koneksi internetmu.',
};

let paywallHandler = null;
/** app.js registers how to show the paywall view. */
export function onPaywall(fn) { paywallHandler = fn; }

/**
 * api('/api/me') / api('/api/flex', {method:'POST', body:{...}})
 * opts.noRedirect: don't redirect to login on 401 (used by auth forms / boot).
 */
export async function api(path, { method = 'GET', body, noRedirect = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, 'network', MESSAGES.network);
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  if (!res.ok) {
    const code = data?.error || `http_${res.status}`;
    const err = new ApiError(res.status, code, data?.message || MESSAGES[code] || `Terjadi kesalahan (${res.status}).`, data);
    if (res.status === 401 && !noRedirect) {
      window.dispatchEvent(new CustomEvent('fs:unauthorized'));
    }
    throw err;
  }
  return data || {};
}

export const get = (p, o) => api(p, { ...o, method: 'GET' });
export const post = (p, body, o) => api(p, { ...o, method: 'POST', body: body ?? {} });
export const put = (p, body, o) => api(p, { ...o, method: 'PUT', body: body ?? {} });
export const del = (p, o) => api(p, { ...o, method: 'DELETE' });

/** Standard error reporting for actions (button clicks, form submits). */
export function showError(err) {
  if (err?.status === 401) return; // handled by redirect
  if (err?.status === 402) {
    toast(MESSAGES.subscription_required, 'warn');
    paywallHandler?.(err);
    return;
  }
  console.warn(err);
  toast(err?.message || 'Terjadi kesalahan.', 'error');
}

// ---------- Shared session state ----------
export const store = {
  me: null, // {user, subscription, stats}
};

export async function loadMe({ noRedirect = false } = {}) {
  const data = await get('/api/me', { noRedirect });
  store.me = data;
  window.dispatchEvent(new CustomEvent('fs:me', { detail: data }));
  return data;
}
export const isActive = () => store.me?.subscription?.status === 'active';
