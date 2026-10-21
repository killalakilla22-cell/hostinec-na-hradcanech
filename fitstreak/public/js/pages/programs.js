import { html, mount, $, $$, toast, busy, openModal, emptyState, storageGet, storageSet, WEEKDAYS, GOAL_LABEL, LOCATION_LABEL } from '../ui.js';
import { get, put, store, loadMe, showError } from '../api.js';
import { exerciseDetail } from '../components.js';

const GOALS = [['', 'Semua'], ['muscle', 'Muscle'], ['fatloss', 'Fat Loss'], ['strength', 'Strength'], ['general', 'General']];
const LOCS = [['', 'Semua'], ['gym', '🏋️ Gym'], ['home', '🏠 Rumah']];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function programs(ctx) {
  if (ctx.params.id) return detail(ctx, ctx.params.id);
  const filter = storageGet('fs_prog_filter', { goal: '', location: '' });
  mount(ctx.container, html`
    <header class="page-head">
      <h1 class="display">Program Latihan</h1>
      <p class="muted">Pilih program sesuai tujuan dan tempat latihanmu.</p>
    </header>
    <div class="filters">
      <div class="chip-row" role="group" aria-label="Tujuan" id="f-goal">
        ${GOALS.map(([v, l]) => html`<button type="button" class="chip-btn" data-v="${v}">${l}</button>`)}
      </div>
      <div class="chip-row" role="group" aria-label="Lokasi" id="f-loc">
        ${LOCS.map(([v, l]) => html`<button type="button" class="chip-btn" data-v="${v}">${l}</button>`)}
      </div>
    </div>
    <div id="prog-list" class="grid-cards"></div>`);

  const data = await get('/api/programs');
  if (!ctx.alive()) return;
  const list = data.programs || [];
  const myId = store.me?.user?.programId;

  const draw = () => {
    $$('#f-goal .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.v === filter.goal));
    $$('#f-loc .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.v === filter.location));
    const shown = list.filter((p) => (!filter.goal || p.goal === filter.goal) && (!filter.location || p.location === filter.location));
    mount($('#prog-list'), shown.length
      ? html`${shown.map((p) => html`
        <a class="card prog-card ${p.id === myId ? 'is-mine' : ''}" href="#/programs/${encodeURIComponent(p.id)}">
          <div class="row between">
            <span class="chip chip-accent">${GOAL_LABEL[p.goal] || p.goal}</span>
            <span class="chip">${LOCATION_LABEL[p.location] || p.location}</span>
          </div>
          <h3>${p.name}</h3>
          <p class="muted clamp-3">${p.description || ''}</p>
          <div class="row between small muted prog-meta">
            <span>${p.level || ''}</span>
            <span>${(p.days || []).length} hari latihan · ${countTrainingDays(p.defaultSchedule)}×/minggu</span>
          </div>
          ${p.id === myId ? html`<span class="badge-mine">✓ Program aktifmu</span>` : ''}
        </a>`)}`
      : emptyState('Tidak ada program', 'Coba ubah filter tujuan atau lokasi.'));
  };
  const bind = (sel, key) => $(sel).addEventListener('click', (e) => {
    const b = e.target.closest('.chip-btn');
    if (!b) return;
    filter[key] = b.dataset.v;
    storageSet('fs_prog_filter', filter);
    draw();
  });
  bind('#f-goal', 'goal');
  bind('#f-loc', 'location');
  draw();
}

const countTrainingDays = (sched) => Object.values(sched || {}).filter(Boolean).length;

async function detail(ctx, id) {
  const { program: p } = await get(`/api/programs/${encodeURIComponent(id)}`);
  if (!ctx.alive()) return;
  const isMine = store.me?.user?.programId === p.id;
  const dayName = (dayId) => p.days.find((d) => d.id === dayId)?.name;
  mount(ctx.container, html`
    <a class="back-link" href="#/programs">← Semua program</a>
    <header class="card card-hero prog-hero">
      <div class="chips">
        <span class="chip chip-accent">${GOAL_LABEL[p.goal] || p.goal}</span>
        <span class="chip">${LOCATION_LABEL[p.location] || p.location}</span>
        ${p.level ? html`<span class="chip">${p.level}</span>` : ''}
      </div>
      <h1 class="display">${p.name}</h1>
      <p>${p.description || ''}</p>
      <div class="sched-preview">
        ${ORDER.map((w) => {
          const n = dayName(p.defaultSchedule?.[w] ?? p.defaultSchedule?.[String(w)]);
          return html`<div class="sp-day ${n ? '' : 'sp-rest'}"><span>${WEEKDAYS[w].slice(0, 3)}</span><b>${n || 'Rest'}</b></div>`;
        })}
      </div>
      <button class="btn btn-primary btn-lg btn-block-sm" id="pick-btn" type="button" ${isMine ? 'disabled' : ''}>${isMine ? '✓ Program Aktifmu' : 'Pilih Program Ini'}</button>
      ${isMine ? html`<a class="btn btn-ghost btn-block-sm" href="#/calendar">Atur Jadwal</a>` : ''}
    </header>
    <div class="days">
      ${p.days.map((d, i) => html`
        <details class="card day-block" ${i === 0 ? 'open' : ''}>
          <summary>
            <div><h3>${d.name}</h3><span class="muted small">${d.focus || ''}</span></div>
            <span class="chip">${d.exercises.length} exercise</span>
          </summary>
          ${d.warmup?.length ? html`<p class="small muted"><b>Warm-up:</b> ${d.warmup.join(' · ')}</p>` : ''}
          <ul class="ex-rows">
            ${d.exercises.map((e, j) => html`
              <li><button type="button" class="ex-row" data-day="${i}" data-ex="${j}">
                <span class="ex-num">${j + 1}</span>
                <span class="ex-main"><b>${e.exercise?.name || e.exerciseId}</b><span class="muted small">${e.exercise?.muscle || ''}</span></span>
                <span class="ex-presc"><b>${e.sets}×${e.reps}</b><span class="muted small">rest ${e.restSec}d</span></span>
              </button></li>`)}
          </ul>
          ${d.cooldown?.length ? html`<p class="small muted"><b>Cooldown:</b> ${d.cooldown.join(' · ')}</p>` : ''}
        </details>`)}
    </div>`);

  ctx.container.addEventListener('click', (e) => {
    const row = e.target.closest('.ex-row');
    if (!row) return;
    const item = p.days[row.dataset.day].exercises[row.dataset.ex];
    openModal(exerciseDetail(item.exercise, {
      prescription: html`<div class="presc-box"><b>${item.sets} set × ${item.reps}</b><span>rest ${item.restSec} detik</span>${item.note ? html`<span class="muted">${item.note}</span>` : ''}</div>`,
    }));
  });

  $('#pick-btn').addEventListener('click', async (e) => {
    await busy(e.currentTarget, async () => {
      try {
        await put('/api/me/program', { programId: p.id });
        await loadMe();
        toast(`Program "${p.name}" dipilih! Jadwalmu sudah siap.`, 'success');
        location.hash = '#/calendar';
      } catch (err) { showError(err); }
    });
  });
}
