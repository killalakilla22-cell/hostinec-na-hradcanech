import { html, mount, $, avatar, emptyState, loading, fmtNum, storageGet, storageSet } from '../ui.js';
import { get, isActive, showError } from '../api.js';
import { renderPaywall } from '../app.js';

const CATS = [
  { id: 'consistent', word: 'Consistent', emoji: '🔥', unit: 'hari streak', desc: 'Streak terpanjang saat ini' },
  { id: 'dedicated', word: 'Dedicated', emoji: '🏋️', unit: 'workout', desc: 'Total workout selesai' },
  { id: 'hardworking', word: 'Hardworking', emoji: '💪', unit: 'set', desc: 'Total set selesai' },
  { id: 'liked', word: 'Liked', emoji: '❤️', unit: 'like', desc: 'Total like di Flexing Room' },
  { id: 'talkative', word: 'Talkative', emoji: '💬', unit: 'post', desc: 'Jumlah thread + balasan' },
];

export default async function leaderboard(ctx) {
  if (!isActive()) return renderPaywall(ctx.container);
  const saved = storageGet('fs_lb', {});
  let cat = CATS.some((c) => c.id === ctx.query.category) ? ctx.query.category : CATS.some((c) => c.id === saved.cat) ? saved.cat : 'consistent';
  let period = ctx.query.period === 'month' || (!ctx.query.period && saved.period === 'month') ? 'month' : 'all';

  mount(ctx.container, html`
    <header class="lb-head">
      <p class="eyebrow">Leaderboard</p>
      <h1 class="lb-title">The Most <span class="lb-word" id="lb-word"></span> Player</h1>
      <p class="muted" id="lb-desc"></p>
    </header>
    <div class="lb-tabs" role="tablist" id="lb-tabs">
      ${CATS.map((c) => html`<button type="button" role="tab" class="lb-tab" data-cat="${c.id}"><span aria-hidden="true">${c.emoji}</span> ${c.word}</button>`)}
    </div>
    <div class="seg" role="group" aria-label="Periode" id="lb-period">
      <button type="button" data-p="all">Semua</button><button type="button" data-p="month">30 Hari</button>
    </div>
    <div id="lb-body"></div>`);

  const drawControls = () => {
    const c = CATS.find((x) => x.id === cat);
    const word = $('#lb-word');
    word.textContent = c.word;
    word.classList.remove('flip');
    void word.offsetWidth;
    word.classList.add('flip');
    $('#lb-desc').textContent = `${c.desc}${period === 'month' ? ' · 30 hari terakhir' : ' · sepanjang waktu'}`;
    ctx.container.querySelectorAll('.lb-tab').forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      if (on) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    ctx.container.querySelectorAll('#lb-period button').forEach((b) => b.classList.toggle('on', b.dataset.p === period));
  };

  let reqId = 0;
  const load = async () => {
    const my = ++reqId;
    storageSet('fs_lb', { cat, period });
    drawControls();
    const body = $('#lb-body');
    mount(body, loading());
    const data = await get(`/api/leaderboard?category=${cat}&period=${period}`);
    if (my !== reqId || !ctx.alive()) return;
    const c = CATS.find((x) => x.id === cat);
    const unit = data.unit || c.unit;
    const entries = data.entries || [];
    if (!entries.length) { mount(body, emptyState('Belum ada peringkat', 'Ayo jadi yang pertama di papan ini!')); return; }
    const top = entries.slice(0, 3);
    const rest = entries.slice(3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    const meIn = entries.some((e) => e.isMe);
    mount(body, html`
      <div class="podium">
        ${order.map((e) => html`
          <div class="podium-col rank-${e.rank} ${e.isMe ? 'is-me' : ''}">
            ${e.rank === 1 ? html`<div class="crown" aria-hidden="true">👑</div>` : ''}
            ${avatar(e.user, e.rank === 1 ? 'lg' : 'md')}
            <div class="podium-name">${e.user?.name || 'Member'}${e.isMe ? ' (kamu)' : ''}</div>
            <div class="podium-val"><b>${fmtNum(e.value)}</b> <span>${unit}</span></div>
            <div class="podium-block"><span>${e.rank}</span></div>
          </div>`)}
      </div>
      ${rest.length ? html`<ol class="lb-list">
        ${rest.map((e) => html`
          <li class="${e.isMe ? 'is-me' : ''}">
            <span class="lb-rank">${e.rank}</span>
            ${avatar(e.user, 'sm')}
            <span class="lb-name">${e.user?.name || 'Member'}</span>${e.isMe ? html`<span class="you-tag">kamu</span>` : ''}
            <span class="lb-val"><b>${fmtNum(e.value)}</b> <span class="muted small">${unit}</span></span>
          </li>`)}
      </ol>` : ''}
      ${!meIn ? html`
        <div class="lb-me card">
          ${data.me
            ? html`<span>Peringkatmu</span><b class="lb-me-rank">#${data.me.rank}</b><span class="muted">${fmtNum(data.me.value)} ${unit}</span>`
            : html`<span class="muted">Kamu belum masuk peringkat di kategori ini. Gas terus! 🔥</span>`}
        </div>` : ''}`);
  };

  $('#lb-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b || b.dataset.cat === cat) return;
    cat = b.dataset.cat;
    load().catch(showError);
  });
  $('#lb-period').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b || b.dataset.p === period) return;
    period = b.dataset.p;
    load().catch(showError);
  });
  await load();
}
