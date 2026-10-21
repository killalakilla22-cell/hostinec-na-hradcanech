import { html, raw, mount, $, todayStr, formatDate, WEEKDAYS_SHORT, parseYmd, storageGet, loading } from '../ui.js';
import { get, store, loadMe, isActive } from '../api.js';
import { subscriptionCard, weekDates, trackingStart } from '../components.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export default async function dashboard(ctx) {
  const me = await loadMe();
  if (!ctx.alive()) return;
  const { user, subscription, stats } = me;
  const today = todayStr();
  const active = isActive();

  mount(ctx.container, html`
    <header class="page-head">
      <p class="eyebrow">${formatDate(today, { weekday: true })}</p>
      <h1 class="display">${greeting()}, <span class="accent">${user.name.split(' ')[0]}</span>!</h1>
    </header>
    <div class="dash-grid">
      <div class="dash-today" id="today-slot">${loading('Memuat workout hari ini…')}</div>
      <div class="dash-side">
      <section class="card streak-card">
        <div class="flame-wrap ${stats.currentStreak > 0 ? 'lit' : ''}" aria-hidden="true">🔥</div>
        <div>
          <div class="big-num">${stats.currentStreak}</div>
          <div class="muted">hari streak${stats.currentStreak > 0 ? '' : ' — mulai hari ini!'}</div>
        </div>
        <div class="streak-best"><span class="muted small">Terbaik</span><b>${stats.bestStreak} 🏆</b></div>
      </section>
      <section class="card week-card">
        <div class="card-head"><h3>Minggu ini</h3><span class="muted small"><b class="text">${stats.thisWeekDone}</b> / ${stats.thisWeekScheduled} workout</span></div>
        <div class="progress-thin"><div style="width:${raw(stats.thisWeekScheduled ? Math.min(100, (stats.thisWeekDone / stats.thisWeekScheduled) * 100).toFixed(0) : 0)}%"></div></div>
        <div class="week-strip" id="week-strip"></div>
        <div class="row gap small muted stat-row">
          <span><b class="text">${stats.totalWorkouts}</b> workout total</span>
          <span><b class="text">${stats.totalSets}</b> set selesai</span>
        </div>
      </section>
      ${subscriptionCard(subscription, { compact: true })}
      </div>
    </div>`);

  renderWeek(ctx, today, active);
  renderToday(ctx, user, today, active);
}

async function renderToday(ctx, user, today, active) {
  const slot = $('#today-slot');
  if (!active) {
    mount(slot, html`
      <section class="card today-card today-locked">
        <p class="eyebrow">Workout hari ini</p>
        <h2 class="display">🔒 Terkunci</h2>
        <p class="muted">Aktifkan langganan untuk membuka workout player, jadwal, dan streak.</p>
        <a class="btn btn-primary btn-lg" href="#/billing">Aktifkan Sekarang</a>
      </section>`);
    return;
  }
  if (!user.programId) {
    mount(slot, html`
      <section class="card today-card">
        <p class="eyebrow">Langkah pertama</p>
        <h2 class="display">Pilih program latihanmu</h2>
        <p class="muted">Gym atau rumah, bangun otot atau bakar lemak — pilih program dan jadwal mingguanmu akan dibuat otomatis.</p>
        <a class="btn btn-primary btn-lg" href="#/programs">Pilih Program</a>
      </section>`);
    return;
  }
  try {
    const data = await get(`/api/today?date=${today}`);
    if (!ctx.alive()) return;
    const day = data.day;
    if (!day) {
      mount(slot, html`
        <section class="card today-card today-rest">
          <p class="eyebrow">Hari ini</p>
          <h2 class="display">Rest Day 😴</h2>
          <p class="muted">Otot tumbuh saat istirahat. Tidur cukup, makan protein, jalan santai. Rest day tidak memutus streak.</p>
          <a class="btn btn-ghost" href="#/calendar">Lihat Jadwal</a>
        </section>`);
      return;
    }
    const inProgress = storageGet(`fs_wo_${today}`);
    const resume = inProgress && inProgress.dayId === day.id;
    const totalSets = day.exercises.reduce((n, e) => n + (Number(e.sets) || 0), 0);
    const estMin = Math.round(day.exercises.reduce((n, e) => n + (Number(e.sets) || 0) * (45 + (Number(e.restSec) || 60)), 0) / 60) + 10;
    mount(slot, html`
      <section class="card today-card ${data.completed ? 'today-done' : ''}">
        <div class="row between">
          <p class="eyebrow">Workout hari ini</p>
          ${data.completed ? html`<span class="badge-done">COMPLETED ✓</span>` : ''}
        </div>
        <h2 class="display">${day.name}</h2>
        <p class="muted">${day.focus || ''}</p>
        <div class="chips">
          <span class="chip">${day.exercises.length} exercise</span>
          <span class="chip">${totalSets} set</span>
          <span class="chip">± ${estMin} menit</span>
        </div>
        <ol class="mini-list">
          ${day.exercises.slice(0, 5).map((e) => html`<li><span>${e.exercise?.name || e.exerciseId}</span><span class="muted">${e.sets}×${e.reps}</span></li>`)}
          ${day.exercises.length > 5 ? html`<li class="muted">+${day.exercises.length - 5} lagi</li>` : ''}
        </ol>
        ${data.completed
          ? html`<a class="btn btn-ghost btn-lg btn-block" href="#/workout/${today}">Lihat Ringkasan</a>`
          : html`<a class="btn btn-primary btn-lg btn-block btn-glow" href="#/workout/${today}">${resume ? '▶ Lanjutkan Workout' : '▶ Mulai Workout'}</a>`}
      </section>`);
  } catch (err) {
    if (!ctx.alive()) return;
    mount(slot, html`<section class="card today-card"><p class="muted">Gagal memuat workout hari ini: ${err.message}</p></section>`);
  }
}

async function renderWeek(ctx, today, active) {
  const strip = $('#week-strip');
  const dates = weekDates(today);
  let byDate = {};
  if (active && store.me?.user?.programId) {
    const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
    try {
      const results = await Promise.all(months.map((m) => get(`/api/calendar?month=${m}`)));
      results.forEach((r) => (r.days || []).forEach((d) => { byDate[d.date] = d; }));
    } catch { /* show neutral strip */ }
    if (!ctx.alive()) return;
  }
  mount(strip, html`${dates.map((d) => {
    const info = byDate[d];
    const dow = parseYmd(d).getDay();
    let cls = 'wd';
    let mark = '·';
    if (info) {
      if (info.completed) { cls += ' wd-done'; mark = '✓'; }
      else if (info.isRest || !info.dayId) { cls += ' wd-rest'; mark = '–'; }
      else if (d < today && d >= trackingStart(store.me)) { cls += ' wd-miss'; mark = '✕'; }
      else if (d < today) { cls += ' wd-past'; mark = '·'; }
      else { cls += ' wd-plan'; mark = '•'; }
    }
    if (d === today) cls += ' wd-today';
    const title = info ? (info.completed ? 'Selesai' : info.dayName || 'Rest') : '';
    return html`<div class="${cls}" title="${title}"><span class="wd-name">${WEEKDAYS_SHORT[dow]}</span><span class="wd-dot">${mark}</span><span class="wd-label">${info?.dayName || (info ? 'Rest' : '')}</span></div>`;
  })}`);
}
