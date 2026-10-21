// UI helpers: safe HTML templating, DOM builders, toast, modal, date formatting.

// ---------- Escaping & safe templating ----------
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, (c) => ESC[c]);
}

class SafeHtml {
  constructor(str) { this.str = str; }
  toString() { return this.str; }
}
/** Mark a string as trusted HTML (only use for strings built by this code). */
export const raw = (str) => new SafeHtml(String(str));

function renderValue(v) {
  if (v instanceof SafeHtml) return v.str;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (v === null || v === undefined || v === false) return '';
  return escapeHtml(v);
}

/** Tagged template: every interpolation is escaped unless it is SafeHtml (from html`` or raw()). */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Escape user text and keep line breaks. */
export const multiline = (text) => raw(escapeHtml(text).replace(/\r?\n/g, '<br>'));

/** Replace a container's content with a SafeHtml template. */
export function mount(container, tpl) {
  // Plain strings are treated as text (escaped); only html``/raw() output is inserted as markup.
  container.innerHTML = renderValue(tpl);
  return container;
}

/** Tiny DOM builder. el('button', {class:'btn', onclick: fn}, 'Text', childNode) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'text') node.textContent = v;
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Toast ----------
let toastRoot;
export function toast(message, type = 'info', ms = 3200) {
  if (!toastRoot) {
    toastRoot = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastRoot);
  }
  const icon = { success: '✓', error: '!', info: 'i', warn: '!' }[type] || 'i';
  const t = el('div', { class: `toast toast-${type}` }, el('span', { class: 'toast-icon', 'aria-hidden': 'true' }, icon), el('span', {}, message));
  toastRoot.append(t);
  while (toastRoot.children.length > 3) toastRoot.firstElementChild.remove();
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// ---------- Modal ----------
export function openModal(tpl, { onClose, wide = false } = {}) {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const box = el('div', { class: 'modal' + (wide ? ' modal-wide' : ''), role: 'dialog', 'aria-modal': 'true' });
  const closeBtn = el('button', { class: 'modal-close', 'aria-label': 'Tutup', type: 'button' }, '×');
  const body = el('div', { class: 'modal-body' });
  mount(body, tpl);
  box.append(closeBtn, body);
  backdrop.append(box);
  document.body.append(backdrop);
  document.body.classList.add('no-scroll');
  const close = () => {
    backdrop.remove();
    document.body.classList.remove('no-scroll');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', close);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', close);
  requestAnimationFrame(() => backdrop.classList.add('show'));
  return { close, body };
}

export function confirmDialog(message, { okText = 'Ya', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal(html`
      <p class="confirm-text">${message}</p>
      <div class="row gap end">
        <button class="btn btn-ghost" data-act="no" type="button">Batal</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes" type="button">${okText}</button>
      </div>`, { onClose: () => { if (!answered) resolve(false); } });
    m.body.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      answered = true;
      resolve(act === 'yes');
      m.close();
    });
  });
}

// ---------- Dates ----------
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export function parseYmd(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export const isValidYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && ymd(parseYmd(s)) === s;

export const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Accepts 'YYYY-MM-DD' or ISO datetime / Date. */
export function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return parseYmd(v);
  if (typeof v === 'number') return new Date(v);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
export function formatDate(v, { weekday = false, year = true } = {}) {
  const d = toDate(v);
  if (!d) return '-';
  let s = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year ? ' ' + d.getFullYear() : ''}`;
  if (weekday) s = `${WEEKDAYS[d.getDay()]}, ${s}`;
  return s;
}
export function timeAgo(v) {
  const d = toDate(v);
  if (!d) return '';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return 'baru saja';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return formatDate(d, { year: d.getFullYear() !== new Date().getFullYear() });
}
export function formatDuration(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}j ${m}m`;
  if (m) return `${m}m ${pad(s)}d`;
  return `${s}d`;
}
export const mmss = (sec) => `${Math.floor(sec / 60)}:${pad(Math.max(0, sec % 60))}`;
export const fmtNum = (n, digits = 0) =>
  (Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const pct = (r) => `${Math.round((Number(r) || 0) * 100)}%`;

// ---------- Small render helpers ----------
const SAFE_COLOR = /^#[0-9a-f]{3,8}$|^(rgb|hsl)a?\([\d\s.,%]+\)$/i;
export function avatar(user, size = 'md') {
  const name = user?.name || '?';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const color = SAFE_COLOR.test(user?.avatarColor || '') ? user.avatarColor : '#6b7280';
  return html`<span class="avatar avatar-${size}" style="--av:${raw(color)}" aria-hidden="true">${initial}</span>`;
}

export const loading = (text = 'Memuat…') => html`<div class="state state-loading"><span class="spinner" aria-hidden="true"></span><span>${text}</span></div>`;
export const emptyState = (title, text = '', action = '') =>
  html`<div class="state state-empty"><div class="state-title">${title}</div>${text ? html`<p>${text}</p>` : ''}${action}</div>`;
export const errorState = (text = 'Gagal memuat data.') =>
  html`<div class="state state-error"><div class="state-title">Ups!</div><p>${text}</p><button class="btn btn-ghost" type="button" onclick="location.reload()">Coba lagi</button></div>`;

export const GOAL_LABEL = { muscle: 'Muscle Building', fatloss: 'Fat Loss', strength: 'Strength', general: 'General Fitness' };
export const LOCATION_LABEL = { gym: 'Gym', home: 'Rumah' };

/** Disable a button while an async action runs. */
export async function busy(btn, fn) {
  if (!btn) return fn();
  const prev = btn.disabled;
  btn.disabled = true;
  btn.classList.add('is-busy');
  try { return await fn(); } finally { btn.disabled = prev; btn.classList.remove('is-busy'); }
}

export function storageGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
}
export function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
export function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
