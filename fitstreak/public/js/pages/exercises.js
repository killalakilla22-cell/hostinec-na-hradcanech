import { html, mount, $, openModal, emptyState } from '../ui.js';
import { get } from '../api.js';
import { exerciseDetail } from '../components.js';

export default async function exercises(ctx) {
  mount(ctx.container, html`
    <header class="page-head">
      <h1 class="display">Exercise Library</h1>
      <p class="muted">Panduan gerakan step-by-step lengkap dengan tips dan video.</p>
    </header>
    <div class="search-bar">
      <input type="search" id="ex-q" placeholder="Cari exercise atau otot… (mis. dada, squat)" aria-label="Cari exercise" autocomplete="off">
    </div>
    <div class="chip-row" id="ex-eq" role="group" aria-label="Peralatan"></div>
    <p class="small muted" id="ex-count"></p>
    <div id="ex-list" class="ex-grid"></div>`);

  const { exercises: all = [] } = await get('/api/exercises');
  if (!ctx.alive()) return;
  const equipment = ['', ...[...new Set(all.map((e) => e.equipment).filter(Boolean))].sort()];
  let eq = '';
  const q = $('#ex-q');
  if (ctx.query.q) q.value = ctx.query.q;

  const drawChips = () => mount($('#ex-eq'), html`${equipment.map((v) => html`<button type="button" class="chip-btn ${v === eq ? 'on' : ''}" data-v="${v}">${v || 'Semua'}</button>`)}`);
  const norm = (s) => String(s || '').toLowerCase();
  const draw = () => {
    const terms = norm(q.value).trim().split(/\s+/).filter(Boolean);
    const shown = all.filter((e) => (!eq || e.equipment === eq) &&
      terms.every((t) => norm(`${e.name} ${e.muscle} ${e.equipment} ${e.level}`).includes(t)));
    $('#ex-count').textContent = `${shown.length} exercise`;
    mount($('#ex-list'), shown.length
      ? html`${shown.map((e) => html`
          <button type="button" class="card ex-card" data-id="${e.id}">
            <span class="ex-card-name">${e.name}</span>
            <span class="muted small">${e.muscle || ''}</span>
            <span class="chips"><span class="chip">${e.equipment || '-'}</span>${e.level ? html`<span class="chip">${e.level}</span>` : ''}</span>
          </button>`)}`
      : emptyState('Tidak ditemukan', 'Coba kata kunci lain.'));
  };
  drawChips();
  draw();
  q.addEventListener('input', draw);
  $('#ex-eq').addEventListener('click', (e) => {
    const b = e.target.closest('.chip-btn');
    if (!b) return;
    eq = b.dataset.v;
    drawChips();
    draw();
  });
  $('#ex-list').addEventListener('click', (e) => {
    const card = e.target.closest('.ex-card');
    if (!card) return;
    const ex = all.find((x) => x.id === card.dataset.id);
    if (ex) openModal(exerciseDetail(ex));
  });
}
