import { html, mount, $, toast, busy } from '../ui.js';
import { post, loadMe } from '../api.js';

export default async function auth(ctx) {
  const isLogin = ctx.params.mode === 'login';
  mount(ctx.container, html`
    <div class="auth-wrap">
      <div class="auth-hero">
        <div class="auth-logo" aria-hidden="true">🔥</div>
        <h1 class="display">Fit<span class="accent">Streak</span></h1>
        <p class="muted">Panduan workout gym & rumahan. Bangun otot, bakar lemak, jaga streak.</p>
      </div>
      <form class="card auth-card" id="auth-form" novalidate>
        <h2>${isLogin ? 'Masuk' : 'Buat Akun'}</h2>
        ${isLogin ? '' : html`
          <label class="field"><span>Nama</span>
            <input name="name" autocomplete="name" required maxlength="60" placeholder="Nama panggilan"></label>`}
        <label class="field"><span>Email</span>
          <input name="email" type="email" autocomplete="email" required placeholder="kamu@email.com" inputmode="email"></label>
        <label class="field"><span>Password</span>
          <input name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required minlength="${isLogin ? 1 : 8}" placeholder="${isLogin ? 'Password' : 'Minimal 8 karakter'}"></label>
        <p class="form-error" id="auth-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">${isLogin ? 'Masuk' : 'Daftar & Mulai'}</button>
        <p class="auth-switch muted">
          ${isLogin ? html`Belum punya akun? <a href="#/register">Daftar</a>` : html`Sudah punya akun? <a href="#/login">Masuk</a>`}
        </p>
      </form>
    </div>`);

  const form = $('#auth-form');
  const errEl = $('#auth-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const fd = Object.fromEntries(new FormData(form));
    const email = String(fd.email || '').trim();
    const password = String(fd.password || '');
    const name = String(fd.name || '').trim();
    let problem = '';
    if (!isLogin && !name) problem = 'Nama wajib diisi.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) problem = 'Email tidak valid.';
    else if (!isLogin && password.length < 8) problem = 'Password minimal 8 karakter.';
    else if (!password) problem = 'Password wajib diisi.';
    if (problem) { errEl.textContent = problem; errEl.hidden = false; return; }

    await busy(form.querySelector('button[type=submit]'), async () => {
      try {
        if (isLogin) await post('/api/auth/login', { email, password }, { noRedirect: true });
        else await post('/api/auth/register', { name, email, password }, { noRedirect: true });
        await loadMe({ noRedirect: true });
        toast(isLogin ? 'Selamat datang kembali! 💪' : 'Akun dibuat. Ayo mulai!', 'success');
        location.hash = '#/dashboard';
      } catch (err) {
        let msg = err.message;
        if (err.status === 401) msg = err.data?.message || 'Email atau password salah.';
        if (err.status === 409) msg = err.data?.message || 'Email sudah terdaftar.';
        errEl.textContent = msg;
        errEl.hidden = false;
      }
    });
  });
}
