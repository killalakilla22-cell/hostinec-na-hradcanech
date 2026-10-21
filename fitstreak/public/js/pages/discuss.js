import { html, mount, $, toast, busy, timeAgo, avatar, multiline, emptyState, loading, storageGet, storageSet } from '../ui.js';
import { get, post, showError, isActive } from '../api.js';

const CATS = [['', 'Semua'], ['umum', 'Umum'], ['nutrisi', 'Nutrisi'], ['program', 'Program'], ['motivasi', 'Motivasi'], ['tanya', 'Tanya']];
const CAT_LABEL = Object.fromEntries(CATS);

export default async function discuss(ctx) {
  if (ctx.params.id) return threadView(ctx, ctx.params.id);
  const active = isActive();
  let cat = CAT_LABEL[ctx.query.category] && ctx.query.category ? ctx.query.category : storageGet('fs_disc_cat', '');
  if (!CAT_LABEL[cat] && cat !== '') cat = '';

  mount(ctx.container, html`
    <header class="page-head row between wrap">
      <div><h1 class="display">Diskusi</h1><p class="muted">Tanya, berbagi tips nutrisi, program, dan motivasi.</p></div>
      <button class="btn btn-primary" id="new-btn" type="button">+ Buat Thread</button>
    </header>
    <form class="card thread-form" id="thread-form" hidden>
      <h3>Thread baru</h3>
      <label class="field"><span>Judul</span><input name="title" maxlength="120" required placeholder="mis. Berapa protein per hari untuk bulking?"></label>
      <label class="field"><span>Kategori</span>
        <select name="category">${CATS.slice(1).map(([v, l]) => html`<option value="${v}" ${v === (cat || 'umum') ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label class="field"><span>Isi</span><textarea name="body" rows="5" maxlength="5000" required placeholder="Ceritakan detailnya…"></textarea></label>
      <div class="row gap end"><button class="btn btn-ghost" type="button" id="cancel-thread">Batal</button><button class="btn btn-primary" type="submit">Terbitkan</button></div>
    </form>
    <div class="chip-row sticky-chips" id="cats" role="group" aria-label="Kategori"></div>
    <ul class="thread-list" id="threads"></ul>`);

  const form = $('#thread-form');
  $('#new-btn').addEventListener('click', () => {
    if (!active) { showError({ status: 402 }); return; }
    form.hidden = !form.hidden;
    if (!form.hidden) form.elements.title.focus();
  });
  $('#cancel-thread').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    const body = form.elements.body.value.trim();
    const category = form.elements.category.value;
    if (!title || !body) { toast('Judul dan isi wajib diisi.', 'warn'); return; }
    await busy(form.querySelector('[type=submit]'), async () => {
      try {
        const { thread } = await post('/api/threads', { title, body, category });
        toast('Thread diterbitkan!', 'success');
        form.reset();
        form.hidden = true;
        if (thread?.id != null) location.hash = `#/discuss/${encodeURIComponent(thread.id)}`;
        else await load();
      } catch (err) { showError(err); }
    });
  });

  const drawCats = () => mount($('#cats'), html`${CATS.map(([v, l]) => html`<button type="button" class="chip-btn ${v === cat ? 'on' : ''}" data-v="${v}">${l}</button>`)}`);
  const load = async () => {
    const list = $('#threads');
    mount(list, html`<li>${loading()}</li>`);
    const { threads = [] } = await get(`/api/threads${cat ? `?category=${encodeURIComponent(cat)}` : ''}`);
    if (!ctx.alive()) return;
    mount(list, threads.length ? html`${threads.map((t) => html`
      <li><a class="card thread-item" href="#/discuss/${encodeURIComponent(t.id)}">
        <div class="ti-top"><span class="cat-tag cat-${t.category}">${CAT_LABEL[t.category] || t.category}</span><span class="muted small">${timeAgo(t.lastActivityAt || t.createdAt)}</span></div>
        <h3>${t.title}</h3>
        ${t.excerpt ? html`<p class="muted clamp-2">${t.excerpt}</p>` : ''}
        <div class="ti-foot small muted">${avatar(t.user, 'xs')}<span>${t.user?.name || 'Member'}</span><span class="dot-sep">·</span><span>💬 ${t.replyCount ?? 0} balasan</span></div>
      </a></li>`)}` : html`<li>${emptyState('Belum ada thread', cat ? 'Belum ada diskusi di kategori ini.' : 'Mulai diskusi pertama!')}</li>`);
  };
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('.chip-btn');
    if (!b) return;
    cat = b.dataset.v;
    storageSet('fs_disc_cat', cat);
    drawCats();
    load().catch(showError);
  });
  drawCats();
  await load();
}

async function threadView(ctx, id) {
  const active = isActive();
  const data = await get(`/api/threads/${encodeURIComponent(id)}`);
  if (!ctx.alive()) return;
  const t = data.thread;
  let replies = data.replies || [];

  mount(ctx.container, html`
    <a class="back-link" href="#/discuss">← Semua thread</a>
    <article class="card thread-main">
      <span class="cat-tag cat-${t.category}">${CAT_LABEL[t.category] || t.category}</span>
      <h1 class="thread-title">${t.title}</h1>
      <div class="post-head">${avatar(t.user)}<div class="post-who"><b>${t.user?.name || 'Member'}</b><span class="muted small">${timeAgo(t.createdAt)}</span></div></div>
      <div class="thread-body">${multiline(t.body)}</div>
    </article>
    <h2 class="section-title" id="reply-count"></h2>
    <div id="replies" class="replies"></div>
    ${active ? html`
      <form class="card reply-form" id="reply-form">
        <label class="field"><span>Tulis balasan</span><textarea name="body" rows="3" maxlength="3000" required placeholder="Bagikan pendapat atau pengalamanmu…"></textarea></label>
        <div class="row end"><button class="btn btn-primary" type="submit">Kirim Balasan</button></div>
      </form>` : html`<div class="alert alert-warn">Membalas butuh langganan aktif. <a href="#/billing">Aktifkan</a>.</div>`}`);

  const drawReplies = () => {
    $('#reply-count').textContent = `${replies.length} Balasan`;
    const top = replies.filter((r) => r.parentId == null);
    const childrenOf = (pid) => replies.filter((r) => r.parentId != null && String(r.parentId) === String(pid));
    // orphans (parent missing) are shown at top level
    const known = new Set(top.map((r) => String(r.id)));
    const orphans = replies.filter((r) => r.parentId != null && !known.has(String(r.parentId)));
    const item = (r, nested) => html`
      <div class="reply ${nested ? 'reply-nested' : ''}" id="reply-${r.id}">
        <div class="post-head">${avatar(r.user, 'sm')}<div class="post-who"><b>${r.user?.name || 'Member'}</b><span class="muted small">${timeAgo(r.createdAt)}</span></div></div>
        <div class="reply-body">${multiline(r.body)}</div>
        ${active ? html`<button type="button" class="link-btn small" data-reply-to="${nested ? r.parentId : r.id}" data-name="${r.user?.name || ''}">↩ Balas</button>` : ''}
        <div class="inline-reply-slot"></div>
      </div>`;
    mount($('#replies'), replies.length ? html`${[...top, ...orphans].map((r) => html`
      <div class="card reply-thread">
        ${item(r, false)}
        ${childrenOf(r.id).map((c) => item(c, true))}
      </div>`)}` : emptyState('Belum ada balasan', 'Jadilah yang pertama membalas!'));
  };
  drawReplies();

  const send = async (body, parentId, btn) => {
    await busy(btn, async () => {
      const payload = { body };
      if (parentId != null && parentId !== '') payload.parentId = isNaN(Number(parentId)) ? parentId : Number(parentId);
      const { reply } = await post(`/api/threads/${encodeURIComponent(id)}/replies`, payload);
      if (reply) replies = [...replies, reply];
      else replies = (await get(`/api/threads/${encodeURIComponent(id)}`)).replies || replies;
      drawReplies();
      toast('Balasan terkirim', 'success');
      document.getElementById(`reply-${reply?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  if (!active) return;
  const form = $('#reply-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = form.elements.body.value.trim();
    if (!body) return;
    try { await send(body, null, form.querySelector('[type=submit]')); form.reset(); } catch (err) { showError(err); }
  });

  $('#replies').addEventListener('click', (e) => {
    const b = e.target.closest('[data-reply-to]');
    if (!b) return;
    const slot = b.parentElement.querySelector('.inline-reply-slot');
    if (slot.firstChild) { slot.replaceChildren(); return; }
    document.querySelectorAll('.inline-reply-slot').forEach((s) => s.replaceChildren());
    mount(slot, html`
      <form class="inline-reply">
        <textarea rows="2" maxlength="3000" required aria-label="Balasan" placeholder="Balas ${b.dataset.name || ''}…"></textarea>
        <div class="row gap end"><button type="button" class="btn btn-sm btn-ghost" data-cancel>Batal</button><button type="submit" class="btn btn-sm btn-primary">Balas</button></div>
      </form>`);
    const f = slot.querySelector('form');
    const ta = f.querySelector('textarea');
    if (b.dataset.name) ta.value = `@${b.dataset.name} `;
    ta.focus();
    f.querySelector('[data-cancel]').addEventListener('click', () => slot.replaceChildren());
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = ta.value.trim();
      if (!body) return;
      try { await send(body, b.dataset.replyTo, f.querySelector('[type=submit]')); } catch (err) { showError(err); }
    });
  });
}
