import { html, mount, $, toast, busy, timeAgo, avatar, multiline, emptyState, confirmDialog, loading } from '../ui.js';
import { get, post, del, store, showError, isActive } from '../api.js';
import { safeUrl } from '../components.js';

const MAX_BYTES = 2.9 * 1024 * 1024;

/** Resize to max 1280px on the long side, JPEG ~0.8. Returns a data URL. */
export async function resizeImage(file, max = 1280, quality = 0.8) {
  if (!/^image\//.test(file.type)) throw new Error('File harus berupa gambar.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Gambar tidak bisa dibaca. Coba format JPG/PNG.'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.drawImage(img, 0, 0, w, h);
    let q = quality;
    let data = canvas.toDataURL('image/jpeg', q);
    while (data.length * 0.75 > MAX_BYTES && q > 0.35) {
      q -= 0.15;
      data = canvas.toDataURL('image/jpeg', q);
    }
    if (data.length * 0.75 > MAX_BYTES) throw new Error('Gambar terlalu besar.');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default async function flex(ctx) {
  const active = isActive();
  const logId = ctx.query.log || '';
  const dayName = ctx.query.day || '';
  const me = store.me.user;

  mount(ctx.container, html`
    <header class="page-head">
      <h1 class="display">Flexing Room 💪</h1>
      <p class="muted">Pamerkan progress, pump, dan workout yang sudah beres. Saling support!</p>
    </header>
    ${active ? html`
    <form class="card flex-form" id="flex-form">
      <div class="row gap">
        ${avatar(me)}
        <textarea name="caption" id="flex-caption" rows="3" maxlength="500" placeholder="Ceritain workout-mu hari ini…" aria-label="Caption">${logId ? `Baru selesai ${dayName || 'workout'} hari ini! 💪🔥 #FitStreak` : ''}</textarea>
      </div>
      ${logId ? html`<div class="linked-chip"><span>🔗 Terhubung ke workout ${dayName ? `“${dayName}”` : ''} — COMPLETED ✓</span><button type="button" class="link-btn" id="unlink">Lepas</button></div>` : ''}
      <div class="flex-preview" id="flex-preview" hidden><img alt="Pratinjau foto"><button type="button" class="preview-x" id="rm-photo" aria-label="Hapus foto">×</button></div>
      <div class="row between gap">
        <label class="btn btn-ghost file-btn">📷 Foto<input type="file" accept="image/*" id="flex-file" hidden></label>
        <button class="btn btn-primary" type="submit">Posting</button>
      </div>
    </form>` : html`
    <div class="alert alert-warn">Posting & like butuh langganan aktif. <a href="#/billing">Aktifkan sekarang</a>.</div>`}
    <div id="feed" class="feed">${loading()}</div>`);

  let imageData = null;
  let workoutLogId = logId || null;

  const drawFeed = (posts) => {
    mount($('#feed'), posts.length ? html`${posts.map((p) => postCard(p, me))}` : emptyState('Belum ada postingan', 'Jadilah yang pertama flexing hari ini! 🔥'));
  };
  let posts = [];
  const loadFeed = async () => {
    const data = await get('/api/flex?limit=30');
    if (!ctx.alive()) return;
    posts = data.posts || [];
    drawFeed(posts);
  };

  if (active) {
    const form = $('#flex-form');
    const fileIn = $('#flex-file');
    const preview = $('#flex-preview');
    $('#unlink')?.addEventListener('click', (e) => { workoutLogId = null; e.target.closest('.linked-chip').remove(); });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      try {
        imageData = await resizeImage(f);
        preview.querySelector('img').src = imageData;
        preview.hidden = false;
      } catch (err) {
        imageData = null;
        toast(err.message, 'error');
      }
      fileIn.value = '';
    });
    $('#rm-photo').addEventListener('click', () => { imageData = null; preview.hidden = true; preview.querySelector('img').removeAttribute('src'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const caption = form.elements.caption.value.trim();
      if (!caption && !imageData) { toast('Tulis caption atau tambahkan foto.', 'warn'); return; }
      await busy(form.querySelector('[type=submit]'), async () => {
        try {
          const body = { caption };
          if (imageData) body.imageData = imageData;
          if (workoutLogId) body.workoutLogId = isNaN(Number(workoutLogId)) ? workoutLogId : Number(workoutLogId);
          const { post: created } = await post('/api/flex', body);
          toast('Postingan terbit! 🔥', 'success');
          form.reset();
          imageData = null;
          preview.hidden = true;
          workoutLogId = null;
          form.querySelector('.linked-chip')?.remove();
          if (ctx.query.log) history.replaceState(null, '', '#/flex');
          if (created) { posts = [created, ...posts]; drawFeed(posts); } else await loadFeed();
        } catch (err) { showError(err); }
      });
    });
  }

  $('#feed').addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('[data-like]');
    const delBtn = e.target.closest('[data-del]');
    if (likeBtn) {
      if (!active) { toast('Like butuh langganan aktif.', 'warn'); return; }
      const id = likeBtn.dataset.like;
      const p = posts.find((x) => String(x.id) === id);
      if (!p) return;
      // optimistic toggle
      const prev = { likes: p.likes, likedByMe: p.likedByMe };
      p.likedByMe = !p.likedByMe;
      p.likes = (Number(p.likes) || 0) + (p.likedByMe ? 1 : -1);
      updateLike(likeBtn, p);
      try {
        const res = await post(`/api/flex/${encodeURIComponent(id)}/like`);
        p.likes = res.likes;
        p.likedByMe = res.likedByMe;
      } catch (err) {
        Object.assign(p, prev);
        showError(err);
      }
      updateLike(likeBtn, p);
    } else if (delBtn) {
      if (!(await confirmDialog('Hapus postingan ini?', { okText: 'Hapus', danger: true }))) return;
      try {
        await del(`/api/flex/${encodeURIComponent(delBtn.dataset.del)}`);
        posts = posts.filter((x) => String(x.id) !== delBtn.dataset.del);
        drawFeed(posts);
        toast('Postingan dihapus', 'info');
      } catch (err) { showError(err); }
    }
  });

  await loadFeed();
}

function updateLike(btn, p) {
  btn.classList.toggle('liked', !!p.likedByMe);
  btn.setAttribute('aria-pressed', String(!!p.likedByMe));
  btn.querySelector('.like-icon').textContent = p.likedByMe ? '❤️' : '🤍';
  btn.querySelector('.like-count').textContent = p.likes ?? 0;
  if (p.likedByMe) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
}

function postCard(p, me) {
  const img = p.imageUrl ? safeUrl(p.imageUrl) : '';
  const mine = p.user?.id === me.id;
  return html`
    <article class="card post">
      <header class="post-head">
        ${avatar(p.user)}
        <div class="post-who"><b>${p.user?.name || 'Member'}</b><span class="muted small" title="${p.createdAt}">${timeAgo(p.createdAt)}</span></div>
        ${p.workoutLogId ? html`<span class="badge-done sm">COMPLETED ✓</span>` : ''}
      </header>
      ${img ? html`<img class="post-img" src="${img}" alt="Foto dari ${p.user?.name || 'member'}" loading="lazy">` : ''}
      ${p.caption ? html`<p class="post-caption">${multiline(p.caption)}</p>` : ''}
      <footer class="post-foot">
        <button type="button" class="like-btn ${p.likedByMe ? 'liked' : ''}" data-like="${p.id}" aria-pressed="${!!p.likedByMe}" aria-label="Suka">
          <span class="like-icon">${p.likedByMe ? '❤️' : '🤍'}</span><span class="like-count">${p.likes ?? 0}</span>
        </button>
        ${mine ? html`<button type="button" class="btn btn-sm btn-ghost" data-del="${p.id}">Hapus</button>` : ''}
      </footer>
    </article>`;
}
