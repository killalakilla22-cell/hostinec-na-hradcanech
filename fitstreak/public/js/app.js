// FitStreak SPA: hash router + app shell.
import { html, raw, mount, $, $$, toast, avatar, storageGet, errorState, loading } from './ui.js';
import { store, loadMe, onPaywall, ApiError } from './api.js';
import { lastLocked } from './components.js';

// ---------- Icons (inline SVG, stroke = currentColor) ----------
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  dumbbell: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5.5 1 1 1.5 2 1.5 3 1.5-1.5 2-4.5 1.5-7.5Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4c0 3 2 4 4 4M16 6h4c0 3-2 4-4 4M12 13v4M8 21h8M9 17h6v4H9z"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

const NAV = [
  { path: 'dashboard', label: 'Beranda', icon: 'home' },
  { path: 'workout', label: 'Workout Hari Ini', short: 'Workout', icon: 'dumbbell' },
  { path: 'calendar', label: 'Kalender', short: 'Jadwal', icon: 'calendar' },
  { path: 'programs', label: 'Program', icon: 'list' },
  { path: 'exercises', label: 'Exercise Library', icon: 'book' },
  { path: 'progress', label: 'Progress', icon: 'chart' },
  { path: 'flex', label: 'Flexing Room', short: 'Flex', icon: 'camera' },
  { path: 'discuss', label: 'Diskusi', icon: 'chat' },
  { path: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
  { path: 'billing', label: 'Langganan', icon: 'card' },
  { path: 'profile', label: 'Profil', icon: 'user' },
];
const BOTTOM = ['dashboard', 'calendar', 'workout', 'flex'];

// ---------- Routes ----------
const ROUTES = [
  { re: /^login$/, page: 'auth', public: true, params: () => ({ mode: 'login' }) },
  { re: /^register$/, page: 'auth', public: true, params: () => ({ mode: 'register' }) },
  { re: /^dashboard$/, page: 'dashboard' },
  { re: /^programs$/, page: 'programs' },
  { re: /^programs\/([^/]+)$/, page: 'programs', params: (m) => ({ id: decodeURIComponent(m[1]) }) },
  { re: /^calendar$/, page: 'calendar' },
  { re: /^workout$/, page: 'workout' },
  { re: /^workout\/([^/]+)$/, page: 'workout', params: (m) => ({ date: decodeURIComponent(m[1]) }) },
  { re: /^exercises$/, page: 'exercises' },
  { re: /^progress$/, page: 'progress' },
  { re: /^flex$/, page: 'flex' },
  { re: /^discuss$/, page: 'discuss' },
  { re: /^discuss\/([^/]+)$/, page: 'discuss', params: (m) => ({ id: decodeURIComponent(m[1]) }) },
  { re: /^leaderboard$/, page: 'leaderboard' },
  { re: /^billing$/, page: 'billing' },
  { re: /^profile$/, page: 'profile' },
];

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = h.split('?');
  return { path: path.replace(/\/+$/, ''), query: Object.fromEntries(new URLSearchParams(qs)) };
}
export const navigate = (hash) => {
  if (location.hash === hash) route();
  else location.hash = hash;
};

// ---------- Theme ----------
export function applyTheme(theme = storageGet('fs_theme', 'auto')) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
applyTheme();

// ---------- Shell ----------
const appEl = document.getElementById('app');
let shellMounted = false;

function renderShell() {
  mount(appEl, html`
    <a class="skip-link" href="#main">Langsung ke konten</a>
    <aside class="sidebar" aria-label="Navigasi utama">
      <a class="brand" href="#/dashboard">${raw(logo())}<span>Fit<b>Streak</b></span></a>
      <nav class="side-nav">
        ${NAV.map((n) => html`<a href="#/${n.path}" data-nav="${n.path}">${raw(icon(n.icon))}<span>${n.label}</span></a>`)}
      </nav>
      <div class="side-user" id="side-user"></div>
    </aside>
    <header class="topbar">
      <a class="brand" href="#/dashboard">${raw(logo())}<span>Fit<b>Streak</b></span></a>
      <a class="streak-chip" href="#/dashboard" id="top-streak" aria-label="Streak"></a>
    </header>
    <main id="main" class="main" tabindex="-1"></main>
    <nav class="bottom-nav" aria-label="Navigasi bawah">
      ${BOTTOM.map((p) => {
        const n = NAV.find((x) => x.path === p);
        return html`<a href="#/${p}" data-nav="${p}" class="${p === 'workout' ? 'bn-main' : ''}">${raw(icon(n.icon))}<span>${n.short || n.label}</span></a>`;
      })}
      <button type="button" id="more-btn" aria-haspopup="true" aria-expanded="false">${raw(icon('menu'))}<span>Menu</span></button>
    </nav>
    <div class="sheet-backdrop" id="sheet" hidden>
      <div class="sheet" role="menu">
        <div class="sheet-handle"></div>
        <div class="sheet-grid">
          ${NAV.filter((n) => !BOTTOM.includes(n.path)).map((n) => html`<a href="#/${n.path}" role="menuitem" data-nav="${n.path}">${raw(icon(n.icon))}<span>${n.label}</span></a>`)}
        </div>
      </div>
    </div>`);
  const sheet = $('#sheet');
  const moreBtn = $('#more-btn');
  const toggleSheet = (open) => {
    sheet.hidden = !open;
    moreBtn.setAttribute('aria-expanded', String(open));
  };
  moreBtn.addEventListener('click', () => toggleSheet(sheet.hidden));
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('a')) toggleSheet(false); });
  window.addEventListener('hashchange', () => toggleSheet(false));
  shellMounted = true;
  updateShellUser();
}
function logo() {
  return `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/><path d="M17.5 5c1 4.5 6.5 7 6.5 13a8 8 0 0 1-16 0c0-3.5 2-5 2.8-7.8 1.4 1.4 2.2 2.8 2.2 4.3 2-2.2 3-5.6 2.5-9.5Z" fill="var(--accent-ink)"/></svg>`;
}

function updateShellUser() {
  if (!shellMounted || !store.me) return;
  const { user, stats } = store.me;
  const side = $('#side-user');
  if (side) {
    mount(side, html`<a href="#/profile" class="side-user-link">${avatar(user, 'sm')}<span class="side-user-name">${user.name}</span><span class="streak-mini">🔥 ${stats?.currentStreak ?? 0}</span></a>`);
  }
  const chip = $('#top-streak');
  if (chip) mount(chip, html`<span aria-hidden="true">🔥</span><b>${stats?.currentStreak ?? 0}</b>`);
}
window.addEventListener('fs:me', updateShellUser);

function setActiveNav(path) {
  const top = path.split('/')[0];
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === top;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ---------- Paywall ----------
export function renderPaywall(container = $('#main .page') || $('#main')) {
  if (!container) return;
  const sub = store.me?.subscription;
  const locked = sub?.status === 'locked';
  const last = lastLocked(sub);
  mount(container, html`
    <section class="paywall card card-hero">
      <div class="paywall-icon" aria-hidden="true">🔒</div>
      <h1>${locked ? 'Akunmu terkunci' : 'Aktifkan langganan dulu'}</h1>
      <p class="muted">${locked
        ? `Completion rate siklus terakhirmu ${last ? Math.round(last.completionRate * 100) + '%' : ''} — di bawah syarat 50%. Bayar untuk memulai siklus baru dan lanjutkan streak-mu.`
        : 'Workout player, log progress, Flexing Room, diskusi, dan leaderboard tersedia untuk member aktif. Program & exercise library tetap bisa kamu intip.'}</p>
      <div class="row gap wrap center">
        <a class="btn btn-primary btn-lg" href="#/billing">Lihat Paket — Rp 199.000 / 2 bulan</a>
        <a class="btn btn-ghost" href="#/programs">Intip Program</a>
      </div>
    </section>`);
}
onPaywall(() => renderPaywall());

// ---------- Router ----------
let routeToken = 0;
let cleanups = [];
const pageCache = {};

async function route() {
  const token = ++routeToken;
  cleanups.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
  cleanups = [];

  let { path, query } = parseHash();
  if (!path) { location.replace('#/dashboard'); return; }
  const match = ROUTES.map((r) => ({ r, m: path.match(r.re) })).find((x) => x.m);
  if (!match) { location.replace('#/dashboard'); return; }
  const { r, m } = match;

  if (!store.me && !r.public) {
    try {
      await loadMe({ noRedirect: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { location.replace('#/login'); return; }
      showBootError(e);
      return;
    }
    if (token !== routeToken) return;
  }
  if (r.public && store.me) { location.replace('#/dashboard'); return; }

  // Each route gets a fresh container element so page event listeners never leak between routes.
  const container = document.createElement('div');
  container.className = `page page-${r.page}`;
  let host;
  if (r.public) {
    shellMounted = false;
    appEl.className = 'app app-auth';
    host = appEl;
  } else {
    if (!shellMounted) renderShell();
    appEl.className = 'app';
    host = $('#main');
    setActiveNav(path);
    updateShellUser();
  }
  host.replaceChildren(container);
  mount(container, loading());
  window.scrollTo(0, 0);

  const ctx = {
    params: r.params ? r.params(m) : {},
    query,
    path,
    container,
    alive: () => token === routeToken,
    onCleanup: (fn) => cleanups.push(fn),
  };
  try {
    const mod = pageCache[r.page] || (pageCache[r.page] = await import(`./pages/${r.page}.js`));
    if (token !== routeToken) return;
    await mod.default(ctx);
  } catch (err) {
    if (token !== routeToken) return;
    if (err instanceof ApiError && err.status === 402) { renderPaywall(container); return; }
    if (err instanceof ApiError && err.status === 401) return;
    console.error(err);
    mount(container, errorState(err?.message || 'Gagal memuat halaman.'));
  }
  if (token === routeToken && !r.public) host.focus({ preventScroll: true });
}

function showBootError(e) {
  appEl.className = 'app app-auth';
  shellMounted = false;
  mount(appEl, html`<div class="auth-wrap">${errorState(e?.message || 'Server tidak dapat dihubungi.')}</div>`);
}

window.addEventListener('fs:unauthorized', () => {
  store.me = null;
  shellMounted = false;
  if (!/^#\/(login|register)/.test(location.hash)) {
    toast('Sesi berakhir, silakan masuk lagi.', 'warn');
    location.hash = '#/login';
  }
});
window.addEventListener('hashchange', route);
route();
