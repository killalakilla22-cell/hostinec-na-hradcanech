import { html, mount, $, toast, busy, todayStr, formatDate, formatDuration, fmtNum, emptyState, confirmDialog, escapeHtml, loading } from '../ui.js';
import { get, post, del, showError, isActive } from '../api.js';
import { renderPaywall } from '../app.js';
import { lineChart, barChart } from '../charts.js';

export default async function progress(ctx) {
  if (!isActive()) return renderPaywall(ctx.container);
  const today = todayStr();
  mount(ctx.container, html`
    <header class="page-head"><h1 class="display">Progress</h1><p class="muted">Pantau berat badan, konsistensi, dan rekor pribadimu.</p></header>
    <div class="progress-grid">
      <section class="card">
        <div class="card-head"><h3>Berat Badan</h3><span class="muted small" id="w-delta"></span></div>
        <div class="chart-box" id="w-chart"></div>
        <form id="body-form" class="body-form">
          <label class="field"><span>Tanggal</span><input type="date" name="date" value="${today}" max="${today}" required></label>
          <label class="field"><span>Berat (kg)</span><input type="number" name="weight" step="0.1" min="20" max="400" inputmode="decimal" required placeholder="70.5"></label>
          <label class="field"><span>Body fat % <i class="muted">(ops.)</i></span><input type="number" name="bodyFat" step="0.1" min="1" max="80" inputmode="decimal"></label>
          <label class="field"><span>Lingkar pinggang cm <i class="muted">(ops.)</i></span><input type="number" name="waist" step="0.5" min="30" max="250" inputmode="decimal"></label>
          <label class="field field-wide"><span>Catatan <i class="muted">(ops.)</i></span><input name="note" maxlength="200" placeholder="mis. pagi sebelum sarapan"></label>
          <button class="btn btn-primary field-wide" type="submit">+ Catat Berat</button>
        </form>
        <ul class="body-list" id="body-list"></ul>
      </section>
      <section class="card">
        <div class="card-head"><h3>Workout per Minggu</h3><span class="muted small">12 minggu terakhir</span></div>
        <div class="chart-box" id="wk-chart"></div>
        <details class="small"><summary class="muted">Lihat sebagai tabel</summary><div id="wk-table"></div></details>
      </section>
      <section class="card">
        <div class="card-head"><h3>Personal Best 🏆</h3></div>
        <div id="pb"></div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Riwayat Workout</h3></div>
        <ul class="history" id="history">${loading()}</ul>
      </section>
    </div>`);

  let disposers = [];
  ctx.onCleanup(() => disposers.forEach((d) => d()));

  const loadProgress = async () => {
    const data = await get('/api/progress');
    if (!ctx.alive()) return;
    disposers.forEach((d) => d());
    disposers = [];
    renderWeight(data.bodyLogs || []);
    renderWeekly(data.weeklyWorkouts || []);
    renderPB(data.exerciseBests || []);
  };

  const renderWeight = (logs) => {
    const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const box = $('#w-chart');
    if (!sorted.length) {
      mount(box, emptyState('Belum ada data berat', 'Catat berat badanmu secara rutin (mis. seminggu sekali) untuk melihat tren.'));
      $('#w-delta').textContent = '';
    } else {
      disposers.push(lineChart(box, sorted.map((l) => ({
        x: formatDate(l.date, { year: false }),
        y: Number(l.weight),
        tip: `<b>${escapeHtml(fmtNum(l.weight, 1))} kg</b><span>${escapeHtml(formatDate(l.date))}</span>`,
      })), { unit: ' kg', yLabel: 'Grafik berat badan' }));
      const delta = sorted.length > 1 ? Number(sorted[sorted.length - 1].weight) - Number(sorted[0].weight) : 0;
      $('#w-delta').textContent = sorted.length > 1 ? `${delta > 0 ? '+' : ''}${fmtNum(delta, 1)} kg sejak ${formatDate(sorted[0].date, { year: false })}` : '';
    }
    const recent = [...sorted].reverse();
    mount($('#body-list'), recent.length ? html`${recent.map((l) => html`
      <li>
        <div><b>${fmtNum(l.weight, 1)} kg</b>
          <span class="muted small">${formatDate(l.date, { weekday: true })}${l.bodyFat ? ` · BF ${fmtNum(l.bodyFat, 1)}%` : ''}${l.waist ? ` · pinggang ${fmtNum(l.waist, 1)} cm` : ''}</span>
          ${l.note ? html`<span class="small">${l.note}</span>` : ''}
        </div>
        <button class="btn btn-icon btn-ghost" type="button" data-del="${l.id}" aria-label="Hapus catatan ${formatDate(l.date)}">🗑</button>
      </li>`)}` : '');
  };

  const renderWeekly = (weeks) => {
    const box = $('#wk-chart');
    if (!weeks.length) { mount(box, emptyState('Belum ada data')); return; }
    const last = weeks.length - 1;
    disposers.push(barChart(box, weeks.map((w, i) => ({
      x: formatDate(w.weekStart, { year: false }),
      y: Number(w.count) || 0,
      highlight: i === last,
      tip: `<b>${escapeHtml(w.count)} workout</b><span>minggu ${escapeHtml(formatDate(w.weekStart))}</span>`,
    })), { yLabel: 'Jumlah workout per minggu' }));
    mount($('#wk-table'), html`<table class="table"><thead><tr><th>Minggu mulai</th><th class="num">Workout</th></tr></thead><tbody>
      ${weeks.map((w) => html`<tr><td>${formatDate(w.weekStart)}</td><td class="num">${w.count}</td></tr>`)}</tbody></table>`);
  };

  const renderPB = (bests) => {
    mount($('#pb'), bests.length ? html`
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Exercise</th><th class="num">Beban terberat</th><th class="num">Reps terbanyak</th></tr></thead>
        <tbody>${bests.map((b) => html`<tr><td>${b.name || b.exerciseId}</td><td class="num">${b.bestWeight ? `${fmtNum(b.bestWeight, 1)} kg` : '-'}</td><td class="num">${b.bestReps ?? '-'}</td></tr>`)}</tbody>
      </table></div>` : emptyState('Belum ada rekor', 'Isi reps & beban saat workout untuk mencatat personal best.'));
  };

  const loadHistory = async () => {
    const { logs = [] } = await get('/api/workouts/history?limit=50');
    if (!ctx.alive()) return;
    mount($('#history'), logs.length ? html`${logs.map((l) => html`
      <li><a href="#/workout/${l.date}" class="history-item">
        <span class="badge-done sm">COMPLETED ✓</span>
        <span class="hi-main"><b>${l.dayName || l.dayId}</b><span class="muted small">${formatDate(l.date, { weekday: true })}</span></span>
        <span class="hi-meta small muted">${formatDuration(l.durationSec)} · ${l.setsDone ?? 0} set${l.totalVolume ? ` · ${fmtNum(l.totalVolume)} kg` : ''}</span>
      </a></li>`)}` : html`<li>${emptyState('Belum ada workout', 'Workout yang kamu selesaikan akan muncul di sini.', html`<a class="btn btn-primary" href="#/workout">Mulai Workout</a>`)}</li>`);
  };

  const form = $('#body-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const num = (k) => (fd.get(k) === '' || fd.get(k) === null ? undefined : Number(fd.get(k)));
    const body = { date: fd.get('date') || today, weight: num('weight'), bodyFat: num('bodyFat'), waist: num('waist'), note: String(fd.get('note') || '').trim() || undefined };
    if (!body.weight || body.weight <= 0) { toast('Isi berat badan dulu.', 'warn'); return; }
    await busy(form.querySelector('[type=submit]'), async () => {
      try {
        await post('/api/progress/body', body);
        toast('Berat badan dicatat ✓', 'success');
        form.reset();
        form.elements.date.value = today;
        await loadProgress();
      } catch (err) { showError(err); }
    });
  });
  $('#body-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    if (!(await confirmDialog('Hapus catatan berat ini?', { okText: 'Hapus', danger: true }))) return;
    await busy(b, async () => {
      try {
        await del(`/api/progress/body/${encodeURIComponent(b.dataset.del)}`);
        toast('Catatan dihapus', 'info');
        await loadProgress();
      } catch (err) { showError(err); }
    });
  });

  await Promise.all([loadProgress(), loadHistory()]);
}
