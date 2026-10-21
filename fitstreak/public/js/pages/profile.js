import { html, mount, $, toast, avatar, formatDate, storageGet, storageSet } from '../ui.js';
import { post, store, loadMe } from '../api.js';
import { STATUS_LABEL } from '../components.js';
import { applyTheme } from '../app.js';

export default async function profile(ctx) {
  const { user, subscription, stats } = await loadMe();
  if (!ctx.alive()) return;
  const theme = storageGet('fs_theme', 'auto');
  mount(ctx.container, html`
    <header class="page-head"><h1 class="display">Profil</h1></header>
    <section class="card profile-card">
      ${avatar(user, 'xl')}
      <div>
        <h2>${user.name}</h2>
        <p class="muted">${user.email}</p>
        <p class="small muted">Member sejak ${formatDate(user.createdAt)}</p>
      </div>
    </section>
    <div class="stat-tiles">
      <div class="tile"><b>🔥 ${stats.currentStreak}</b><span>streak</span></div>
      <div class="tile"><b>🏆 ${stats.bestStreak}</b><span>terbaik</span></div>
      <div class="tile"><b>${stats.totalWorkouts}</b><span>workout</span></div>
    </div>
    <section class="card">
      <div class="list-links">
        <a href="#/billing"><span>Langganan</span><span class="pill pill-${subscription.status}">${STATUS_LABEL[subscription.status] || subscription.status}</span></a>
        <a href="#/calendar"><span>Jadwal mingguan</span><span class="muted">›</span></a>
        <a href="#/programs"><span>Ganti program</span><span class="muted">›</span></a>
      </div>
    </section>
    <section class="card">
      <h3>Tampilan</h3>
      <div class="seg" role="group" aria-label="Tema" id="theme-seg">
        <button type="button" data-t="auto">Otomatis</button><button type="button" data-t="dark">Gelap</button><button type="button" data-t="light">Terang</button>
      </div>
    </section>
    <button class="btn btn-danger btn-lg btn-block" id="logout" type="button">Keluar</button>`);

  const seg = $('#theme-seg');
  const mark = (t) => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  mark(theme);
  seg.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (!t) return;
    storageSet('fs_theme', t);
    applyTheme(t);
    mark(t);
  });
  $('#logout').addEventListener('click', async () => {
    try { await post('/api/auth/logout', {}, { noRedirect: true }); } catch { /* ignore */ }
    store.me = null;
    toast('Sampai jumpa lagi! 👋', 'info');
    location.hash = '#/login';
  });
}
