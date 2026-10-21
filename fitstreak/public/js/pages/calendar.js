import { html, mount, $, toast, busy, todayStr, parseYmd, MONTHS, WEEKDAYS, emptyState, loading } from '../ui.js';
import { get, put, store, loadMe, showError, isActive } from '../api.js';
import { renderPaywall } from '../app.js';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Senin..Minggu
const HEAD = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default async function calendar(ctx) {
  if (!isActive()) return renderPaywall(ctx.container);
  const user = store.me.user;
  if (!user.programId) {
    mount(ctx.container, html`
      <header class="page-head"><h1 class="display">Kalender</h1></header>
      ${emptyState('Belum ada program', 'Pilih program dulu supaya jadwal latihanmu muncul di kalender.', html`<a class="btn btn-primary" href="#/programs">Pilih Program</a>`)}`);
    return;
  }
  const today = todayStr();
  let month = /^\d{4}-\d{2}$/.test(ctx.query.month || '') ? ctx.query.month : today.slice(0, 7);

  mount(ctx.container, html`
    <header class="page-head row between wrap">
      <h1 class="display">Kalender</h1>
      <a class="btn btn-primary" href="#/workout/${today}">▶ Workout Hari Ini</a>
    </header>
    <section class="card cal-card">
      <div class="cal-nav">
        <button class="btn btn-icon" id="cal-prev" type="button" aria-label="Bulan sebelumnya">‹</button>
        <h2 id="cal-title"></h2>
        <button class="btn btn-icon" id="cal-next" type="button" aria-label="Bulan berikutnya">›</button>
      </div>
      <div class="cal-grid cal-head">${HEAD.map((h) => html`<div>${h}</div>`)}</div>
      <div class="cal-grid" id="cal-body"></div>
      <div class="cal-legend small muted">
        <span><i class="lg lg-done"></i>Selesai</span><span><i class="lg lg-plan"></i>Terjadwal</span>
        <span><i class="lg lg-miss"></i>Terlewat</span><span><i class="lg lg-rest"></i>Rest</span>
      </div>
    </section>
    <section class="card" id="sched-card">
      <div class="card-head"><h3>Jadwal Mingguan</h3><span class="muted small" id="prog-name"></span></div>
      <div id="sched-body">${loading()}</div>
    </section>`);

  const loadMonth = async () => {
    const [y, m] = month.split('-').map(Number);
    $('#cal-title').textContent = `${MONTHS[m - 1]} ${y}`;
    const body = $('#cal-body');
    mount(body, html`<div class="cal-loading">${loading()}</div>`);
    const data = await get(`/api/calendar?month=${month}`);
    if (!ctx.alive()) return;
    const first = parseYmd(`${month}-01`);
    const lead = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(html`<div class="cal-cell cal-empty"></div>`);
    for (const d of data.days || []) {
      const num = Number(d.date.slice(8));
      let cls = 'cal-cell';
      let status = '';
      if (d.completed) { cls += ' is-done'; status = '✓'; }
      else if (d.isRest || !d.dayId) cls += ' is-rest';
      else if (d.date < today) { cls += ' is-miss'; status = '✕'; }
      else cls += ' is-plan';
      if (d.date === today) cls += ' is-today';
      const label = d.dayName || (d.isRest || !d.dayId ? 'Rest' : '');
      const inner = html`<span class="cal-num">${num}</span><span class="cal-day">${label}</span>${status ? html`<span class="cal-status">${status}</span>` : ''}`;
      cells.push(d.dayId || d.completed
        ? html`<a class="${cls}" href="#/workout/${d.date}" aria-label="${d.date} ${label}${d.completed ? ' selesai' : ''}">${inner}</a>`
        : html`<div class="${cls}" aria-label="${d.date} rest">${inner}</div>`);
    }
    mount(body, html`${cells}`);
  };

  const shift = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    loadMonth().catch(showError);
  };
  $('#cal-prev').addEventListener('click', () => shift(-1));
  $('#cal-next').addEventListener('click', () => shift(1));

  await Promise.all([loadMonth(), renderSchedule(ctx, loadMonth)]);
}

async function renderSchedule(ctx, reloadMonth) {
  const user = store.me.user;
  const { program } = await get(`/api/programs/${encodeURIComponent(user.programId)}`);
  if (!ctx.alive()) return;
  $('#prog-name').textContent = program.name;
  const sched = user.schedule || program.defaultSchedule || {};
  const val = (w) => sched[w] ?? sched[String(w)] ?? '';
  mount($('#sched-body'), html`
    <form id="sched-form" class="sched-form">
      ${ORDER.map((w) => html`
        <label class="sched-row"><span>${WEEKDAYS[w]}</span>
          <select name="${w}">
            <option value="">😴 Rest</option>
            ${program.days.map((d) => html`<option value="${d.id}" ${val(w) === d.id ? 'selected' : ''}>${d.name}${d.focus ? ` — ${d.focus}` : ''}</option>`)}
          </select>
        </label>`)}
      <div class="row gap wrap sched-actions">
        <button class="btn btn-primary" type="submit">Simpan Jadwal</button>
        <button class="btn btn-ghost" type="button" id="sched-reset">Reset ke default</button>
        <a class="btn btn-ghost" href="#/programs/${encodeURIComponent(program.id)}">Lihat program</a>
      </div>
    </form>`);
  const form = $('#sched-form');
  $('#sched-reset').addEventListener('click', () => {
    for (const w of ORDER) form.elements[String(w)].value = program.defaultSchedule?.[w] ?? program.defaultSchedule?.[String(w)] ?? '';
    toast('Jadwal default dimuat. Klik Simpan untuk menerapkan.', 'info');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const schedule = {};
    for (let w = 0; w <= 6; w++) schedule[w] = form.elements[String(w)].value || null;
    if (!Object.values(schedule).some(Boolean)) { toast('Minimal satu hari latihan ya!', 'warn'); return; }
    await busy(form.querySelector('[type=submit]'), async () => {
      try {
        await put('/api/me/schedule', { schedule });
        await loadMe();
        toast('Jadwal disimpan ✓', 'success');
        await reloadMonth();
      } catch (err) { showError(err); }
    });
  });
}
