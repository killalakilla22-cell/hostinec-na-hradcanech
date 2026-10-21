// Step-by-step workout player.
import {
  html, raw, mount, $, $$, toast, busy, todayStr, addDays, isValidYmd, formatDate, formatDuration, mmss, fmtNum,
  storageGet, storageSet, storageRemove, emptyState, confirmDialog,
} from '../ui.js';
import { get, post, store, loadMe, showError, isActive } from '../api.js';
import { renderPaywall } from '../app.js';
import { exerciseDetail, safeUrl } from '../components.js';

const MAX_DURATION = 6 * 3600;
const clock = (sec) => {
  const h = Math.floor(sec / 3600);
  const rest = mmss(sec % 3600);
  return h ? `${h}:${rest.padStart(5, '0')}` : rest;
};

export default async function workout(ctx) {
  if (!isActive()) return renderPaywall(ctx.container);
  const today = todayStr();
  const date = ctx.params.date || today;
  if (!isValidYmd(date)) { location.replace(`#/workout/${today}`); return; }
  if (!store.me.user.programId) {
    mount(ctx.container, emptyState('Belum ada program', 'Pilih program dulu untuk mulai workout.', html`<a class="btn btn-primary" href="#/programs">Pilih Program</a>`));
    return;
  }

  const data = await get(`/api/today?date=${date}`);
  if (!ctx.alive()) return;
  const day = data.day;
  const dateLabel = date === today ? 'Hari ini' : formatDate(date, { weekday: true });

  if (!day) {
    mount(ctx.container, html`
      ${dateNav(date, today)}
      <section class="card card-hero center-text rest-hero">
        <div class="rest-emoji" aria-hidden="true">😴</div>
        <p class="eyebrow">${dateLabel}</p>
        <h1 class="display">Rest Day</h1>
        <p class="muted">Tidak ada workout terjadwal. Istirahat itu bagian dari program — otot pulih dan tumbuh hari ini. Rest day tidak memutus streak.</p>
        <div class="row gap center wrap"><a class="btn btn-ghost" href="#/calendar">Ubah Jadwal</a><a class="btn btn-ghost" href="#/exercises">Exercise Library</a></div>
      </section>`);
    return;
  }

  if (data.completed) return completedView(ctx, { date, today, day, log: data.log, dateLabel });
  return player(ctx, { date, today, day, dateLabel });
}

function dateNav(date, today) {
  return html`
    <nav class="date-nav" aria-label="Pilih tanggal">
      <a class="btn btn-icon" href="#/workout/${addDays(date, -1)}" aria-label="Hari sebelumnya">‹</a>
      <span>${date === today ? 'Hari ini' : formatDate(date, { weekday: true })}</span>
      ${date < today ? html`<a class="btn btn-icon" href="#/workout/${addDays(date, 1)}" aria-label="Hari berikutnya">›</a>` : html`<span class="btn btn-icon disabled" aria-hidden="true"></span>`}
    </nav>`;
}

// ---------- Completed ----------
function completedView(ctx, { date, today, day, log, dateLabel }) {
  storageRemove(`fs_wo_${date}`);
  mount(ctx.container, html`
    ${dateNav(date, today)}
    <section class="card card-hero done-hero">
      <div class="done-stamp">COMPLETED ✓</div>
      <p class="eyebrow">${dateLabel}</p>
      <h1 class="display">${day.name}</h1>
      <p class="muted">${day.focus || ''}</p>
      ${log ? html`
        <div class="stat-tiles">
          <div class="tile"><b>${formatDuration(log.durationSec)}</b><span>durasi</span></div>
          <div class="tile"><b>${log.setsDone ?? '-'}</b><span>set selesai</span></div>
          <div class="tile"><b>${fmtNum(log.totalVolume)} kg</b><span>total volume</span></div>
        </div>
        ${log.notes ? html`<p class="log-notes">“${log.notes}”</p>` : ''}` : ''}
      <div class="row gap wrap center">
        ${log?.id ? html`<a class="btn btn-primary" href="#/flex?log=${encodeURIComponent(log.id)}&day=${encodeURIComponent(day.name)}">📸 Pamer di Flexing Room</a>` : ''}
        <a class="btn btn-ghost" href="#/progress">Lihat Progress</a>
      </div>
    </section>
    <section class="card">
      <h3>Exercise di sesi ini</h3>
      <ul class="ex-rows static">
        ${day.exercises.map((e, i) => html`<li><div class="ex-row"><span class="ex-num">${i + 1}</span><span class="ex-main"><b>${e.exercise?.name || e.exerciseId}</b><span class="muted small">${e.exercise?.muscle || ''}</span></span><span class="ex-presc"><b>${e.sets}×${e.reps}</b></span></div></li>`)}
      </ul>
    </section>`);
}

// ---------- Player ----------
function freshState(day) {
  return {
    v: 1,
    dayId: day.id,
    step: 0,
    startedAt: Date.now(),
    warmup: (day.warmup || []).map(() => false),
    cooldown: (day.cooldown || []).map(() => false),
    sets: day.exercises.map((e) => Array.from({ length: Math.max(1, Number(e.sets) || 1) }, () => ({ done: false, reps: '', weight: '' }))),
    notes: '',
    restEndsAt: 0,
    restTotal: 0,
  };
}

function player(ctx, { date, today, day, dateLabel }) {
  const KEY = `fs_wo_${date}`;
  let st = storageGet(KEY);
  if (!st || st.v !== 1 || st.dayId !== day.id || !Array.isArray(st.sets) || st.sets.length !== day.exercises.length) st = freshState(day);
  const save = () => storageSet(KEY, st);
  const N = day.exercises.length;
  const LAST = N + 1;
  st.step = Math.min(Math.max(0, st.step | 0), LAST);
  const isFuture = date > today;

  mount(ctx.container, html`
    <div class="player">
      <header class="player-head">
        <div class="row between">
          <div class="ph-title">
            <span class="eyebrow">${dateLabel}</span>
            <h1>${day.name}</h1>
          </div>
          <div class="ph-timer" aria-label="Durasi"><span aria-hidden="true">⏱</span> <b id="elapsed">0:00</b></div>
        </div>
        <div class="ph-progress"><div id="ph-bar"></div></div>
        <div class="step-dots" id="step-dots" role="tablist" aria-label="Langkah workout"></div>
      </header>
      <div id="step-body" class="step-body"></div>
      <div class="player-nav">
        <button class="btn btn-ghost btn-lg" id="prev-btn" type="button">‹ Kembali</button>
        <button class="btn btn-primary btn-lg" id="next-btn" type="button">Lanjut ›</button>
      </div>
    </div>
    <div class="rest-bar" id="rest-bar" hidden role="timer" aria-live="off">
      <div class="rest-fill" id="rest-fill"></div>
      <div class="rest-inner">
        <div><span class="rest-label">REST</span><b class="rest-time" id="rest-time">0:00</b></div>
        <div class="row gap">
          <button class="btn btn-sm btn-ghost" type="button" data-rest="-15">−15</button>
          <button class="btn btn-sm btn-ghost" type="button" data-rest="15">+15</button>
          <button class="btn btn-sm btn-primary" type="button" data-rest="skip">Skip</button>
        </div>
      </div>
    </div>`);

  // ----- audio / vibration -----
  let audioCtx = null;
  const ensureAudio = () => {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch { audioCtx = null; }
  };
  const beep = () => {
    try { navigator.vibrate?.([200, 100, 200, 100, 300]); } catch { /* ignore */ }
    if (!audioCtx) return;
    try {
      const t0 = audioCtx.currentTime;
      [0, 0.25, 0.5].forEach((off, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.3, t0 + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.18);
        o.connect(g).connect(audioCtx.destination);
        o.start(t0 + off);
        o.stop(t0 + off + 0.2);
      });
    } catch { /* ignore */ }
  };

  // ----- wake lock (keep screen on at the gym) -----
  let wakeLock = null;
  const requestWake = async () => {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch { /* ignore */ }
  };
  requestWake();
  const onVis = () => { if (document.visibilityState === 'visible') { requestWake(); tick(); } };
  document.addEventListener('visibilitychange', onVis);

  // ----- rest timer -----
  const restBar = $('#rest-bar');
  const startRest = (sec) => {
    sec = Number(sec) || 0;
    if (sec <= 0) return;
    st.restTotal = sec;
    st.restEndsAt = Date.now() + sec * 1000;
    save();
    tick();
  };
  const stopRest = (finished) => {
    st.restEndsAt = 0;
    save();
    restBar.hidden = true;
    document.body.classList.remove('resting');
    if (finished) { beep(); toast('Rest selesai — waktunya set berikutnya! 💪', 'success'); }
  };
  restBar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rest]');
    if (!b) return;
    const v = b.dataset.rest;
    if (v === 'skip') return stopRest(false);
    st.restEndsAt = Math.max(Date.now() + 1000, st.restEndsAt + Number(v) * 1000);
    st.restTotal = Math.max(st.restTotal, Math.ceil((st.restEndsAt - Date.now()) / 1000));
    save();
    tick();
  });

  // ----- ticking: elapsed + rest -----
  const tick = () => {
    const el = $('#elapsed');
    if (el) el.textContent = clock(Math.min(MAX_DURATION, Math.floor((Date.now() - st.startedAt) / 1000)));
    if (st.restEndsAt) {
      const left = Math.ceil((st.restEndsAt - Date.now()) / 1000);
      if (left <= 0) { stopRest(true); return; }
      restBar.hidden = false;
      document.body.classList.add('resting');
      $('#rest-time').textContent = mmss(left);
      $('#rest-fill').style.width = `${Math.max(0, Math.min(100, (left / (st.restTotal || left)) * 100))}%`;
    }
  };
  const iv = setInterval(tick, 250);
  ctx.onCleanup(() => {
    clearInterval(iv);
    document.removeEventListener('visibilitychange', onVis);
    document.body.classList.remove('resting');
    try { wakeLock?.release(); } catch { /* ignore */ }
    try { audioCtx?.close(); } catch { /* ignore */ }
  });

  // ----- progress -----
  const totals = () => {
    let done = 0, total = 0;
    st.sets.forEach((arr) => arr.forEach((s) => { total++; if (s.done) done++; }));
    return { done, total };
  };
  const exDone = (i) => st.sets[i].every((s) => s.done);
  const updateProgress = () => {
    const { done, total } = totals();
    $('#ph-bar').style.width = `${total ? (done / total) * 100 : 0}%`;
    mount($('#step-dots'), html`${Array.from({ length: LAST + 1 }, (_, i) => {
      const label = i === 0 ? 'Warm-up' : i === LAST ? 'Selesai' : day.exercises[i - 1].exercise?.name || `Exercise ${i}`;
      const cls = ['dot', i === st.step ? 'on' : '', i > 0 && i < LAST && exDone(i - 1) ? 'ok' : ''].join(' ');
      return html`<button type="button" class="${cls}" data-step="${i}" role="tab" aria-selected="${i === st.step}" title="${label}" aria-label="${label}"></button>`;
    })}`);
  };
  $('#step-dots').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) go(Number(b.dataset.step));
  });

  // ----- steps -----
  const body = $('#step-body');
  const checklist = (items, key, title, emoji) => html`
    <section class="card step-card">
      <p class="eyebrow">${emoji} ${title}</p>
      ${items.length
        ? html`<ul class="checklist">${items.map((it, i) => html`
            <li><label class="check-item ${st[key][i] ? 'checked' : ''}"><input type="checkbox" data-list="${key}" data-i="${i}" ${st[key][i] ? 'checked' : ''}><span class="cb" aria-hidden="true"></span><span>${it}</span></label></li>`)}</ul>`
        : html`<p class="muted">Tidak ada daftar khusus — lakukan 5 menit gerakan ringan.</p>`}
    </section>`;

  const renderStep = () => {
    const s = st.step;
    if (s === 0) {
      mount(body, html`
        <div class="step-intro">
          <h2 class="display">Siap, ${store.me.user.name.split(' ')[0]}? 🔥</h2>
          <p class="muted">${day.focus || ''} · ${N} exercise · ${totals().total} set. Mulai dengan pemanasan supaya sendi siap dan cedera terhindar.</p>
        </div>
        ${checklist(day.warmup || [], 'warmup', 'Warm-up', '🤸')}`);
    } else if (s === LAST) {
      const { done, total } = totals();
      const skipped = day.exercises.map((e, i) => ({ e, i })).filter(({ i }) => !st.sets[i].some((x) => x.done));
      mount(body, html`
        ${checklist(day.cooldown || [], 'cooldown', 'Cooldown & Stretching', '🧘')}
        <section class="card step-card finish-card">
          <p class="eyebrow">🏁 Ringkasan</p>
          <div class="stat-tiles">
            <div class="tile"><b>${done}/${total}</b><span>set selesai</span></div>
            <div class="tile"><b id="sum-dur">${formatDuration((Date.now() - st.startedAt) / 1000)}</b><span>durasi</span></div>
            <div class="tile"><b>${fmtNum(volume())} kg</b><span>volume</span></div>
          </div>
          ${skipped.length ? html`<p class="small text-warn">Belum ada set tercentang: ${skipped.map(({ e }) => e.exercise?.name || e.exerciseId).join(', ')}</p>` : ''}
          <label class="field"><span>Catatan (opsional)</span><textarea id="wo-notes" rows="2" maxlength="500" placeholder="Gimana rasanya hari ini?">${st.notes || ''}</textarea></label>
          ${isFuture ? html`<p class="alert alert-warn">Workout untuk tanggal mendatang belum bisa diselesaikan.</p>` : ''}
          <button class="btn btn-primary btn-xl btn-block btn-glow" id="finish-btn" type="button" ${isFuture ? 'disabled' : ''}>✓ Selesaikan Workout</button>
        </section>`);
      $('#wo-notes').addEventListener('input', (e) => { st.notes = e.target.value; save(); });
      $('#finish-btn').addEventListener('click', (e) => finish(e.currentTarget));
    } else {
      const i = s - 1;
      const item = day.exercises[i];
      const ex = item.exercise || { name: item.exerciseId };
      const repTarget = String(item.reps ?? '');
      const video = safeUrl(ex.videoUrl);
      mount(body, html`
        <section class="card step-card ex-step">
          <div class="row between">
            <p class="eyebrow">Exercise ${i + 1} / ${N}</p>
            ${ex.equipment ? html`<span class="chip">${ex.equipment}</span>` : ''}
          </div>
          <h2 class="ex-title">${ex.name}</h2>
          ${ex.muscle ? html`<p class="ex-muscle">💪 ${ex.muscle}</p>` : ''}
          <div class="presc-box">
            <div><b>${item.sets}</b><span>set</span></div>
            <div><b>${repTarget}</b><span>reps</span></div>
            <div><b>${item.restSec}d</b><span>rest</span></div>
          </div>
          ${item.note ? html`<p class="ex-note">📝 ${item.note}</p>` : ''}
          ${video ? html`<a class="btn btn-video btn-block" href="${video}" target="_blank" rel="noopener noreferrer">▶ Tonton Video Panduan</a>` : ''}
          <div class="sets" role="group" aria-label="Set">
            <div class="set-row set-head"><span></span><span>Set</span><span>Reps</span><span>Beban (kg)</span></div>
            ${st.sets[i].map((x, j) => html`
              <div class="set-row ${x.done ? 'done' : ''}" data-set="${j}">
                <label class="set-check" aria-label="Set ${j + 1} selesai"><input type="checkbox" data-set-check="${j}" ${x.done ? 'checked' : ''}><span class="cb" aria-hidden="true"></span></label>
                <span class="set-num">${j + 1}</span>
                <input class="input-sm" type="number" inputmode="numeric" min="0" max="999" step="1" placeholder="${repTarget}" data-field="reps" data-j="${j}" value="${x.reps}" aria-label="Reps set ${j + 1}">
                <input class="input-sm" type="number" inputmode="decimal" min="0" max="999" step="0.5" placeholder="${lastWeight(i, j) || '-'}" data-field="weight" data-j="${j}" value="${x.weight}" aria-label="Beban set ${j + 1}">
              </div>`)}
          </div>
          <p class="small muted">Centang set setelah selesai — timer rest ${item.restSec} detik otomatis berjalan.</p>
        </section>
        <details class="card step-card how-to" open>
          <summary><h3>Cara melakukan</h3></summary>
          ${exerciseDetail(ex)}
        </details>`);
      // hide duplicate heading/video inside detail block
      $$('.how-to .ex-detail-head, .how-to .btn-video', body).forEach((n) => n.remove());

      body.querySelector('.sets').addEventListener('change', (e) => {
        const cb = e.target.closest('[data-set-check]');
        if (!cb) return;
        const j = Number(cb.dataset.setCheck);
        st.sets[i][j].done = cb.checked;
        cb.closest('.set-row').classList.toggle('done', cb.checked);
        save();
        updateProgress();
        if (cb.checked) {
          ensureAudio();
          const allDone = exDone(i);
          if (allDone && s < N) toast(`${ex.name} selesai! Lanjut ke exercise berikutnya.`, 'success');
          if (!(allDone && s === N)) startRest(item.restSec);
          if (allDone) $('#next-btn').classList.add('pulse');
        } else if (st.restEndsAt) stopRest(false);
      });
      body.querySelector('.sets').addEventListener('input', (e) => {
        const f = e.target.dataset.field;
        if (!f) return;
        st.sets[i][Number(e.target.dataset.j)][f] = e.target.value;
        save();
      });
    }
    body.querySelectorAll('[data-list]').forEach((cb) => cb.addEventListener('change', () => {
      st[cb.dataset.list][Number(cb.dataset.i)] = cb.checked;
      cb.closest('.check-item').classList.toggle('checked', cb.checked);
      save();
    }));
    $('#prev-btn').disabled = s === 0;
    $('#prev-btn').style.visibility = s === 0 ? 'hidden' : '';
    const next = $('#next-btn');
    next.classList.remove('pulse');
    next.hidden = s === LAST;
    next.textContent = s === 0 ? 'Mulai Exercise ›' : s === N ? 'Cooldown ›' : 'Exercise Berikutnya ›';
    updateProgress();
  };

  // previous set's weight as a placeholder hint
  const lastWeight = (i, j) => (j > 0 ? st.sets[i][j - 1].weight : '');
  const volume = () => st.sets.reduce((v, arr) => v + arr.reduce((a, x) => a + (x.done ? (Number(x.reps) || 0) * (Number(x.weight) || 0) : 0), 0), 0);

  const go = (n) => {
    st.step = Math.min(Math.max(0, n), LAST);
    save();
    renderStep();
    window.scrollTo({ top: 0 });
  };
  $('#prev-btn').addEventListener('click', () => go(st.step - 1));
  $('#next-btn').addEventListener('click', () => { ensureAudio(); go(st.step + 1); });

  // ----- finish -----
  const finish = async (btn) => {
    const { done, total } = totals();
    if (done === 0) { toast('Centang minimal satu set dulu ya!', 'warn'); return; }
    if (done < total) {
      const ok = await confirmDialog(`Baru ${done} dari ${total} set selesai. Tetap selesaikan workout?`, { okText: 'Selesaikan' });
      if (!ok) return;
    }
    const sets = [];
    day.exercises.forEach((e, i) => st.sets[i].forEach((x, j) => {
      const repNum = x.reps === '' ? (/^\d+$/.test(String(e.reps).trim()) && x.done ? Number(e.reps) : null) : Number(x.reps);
      sets.push({
        exerciseId: e.exerciseId,
        setIndex: j,
        reps: Number.isFinite(repNum) ? repNum : null,
        weight: x.weight === '' || !Number.isFinite(Number(x.weight)) ? null : Number(x.weight),
        done: !!x.done,
      });
    }));
    const durationSec = Math.min(MAX_DURATION, Math.max(1, Math.round((Date.now() - st.startedAt) / 1000)));
    await busy(btn, async () => {
      try {
        const res = await post('/api/workouts/complete', { date, dayId: day.id, durationSec, sets, notes: (st.notes || '').trim() || undefined });
        storageRemove(KEY);
        stopRest(false);
        celebrate(ctx, { date, day, res, durationSec, done });
        loadMe().catch(() => {});
      } catch (err) {
        if (err.status === 409) {
          storageRemove(KEY);
          toast('Workout ini sudah tercatat sebelumnya.', 'info');
          location.reload();
          return;
        }
        showError(err);
      }
    });
  };

  if (st.restEndsAt && st.restEndsAt < Date.now()) st.restEndsAt = 0;
  save();
  renderStep();
  tick();
}

function celebrate(ctx, { date, day, res, durationSec, done }) {
  const log = res.log || {};
  const streak = res.stats?.currentStreak ?? store.me?.stats?.currentStreak ?? 0;
  const best = res.stats?.bestStreak;
  const badges = Array.isArray(res.newBadges) ? res.newBadges : [];
  const colors = ['var(--accent)', 'var(--accent-2)', '#4dd9ff', '#ff4fa3', '#ffd23f'];
  const confetti = Array.from({ length: 36 }, (_, i) =>
    `<i style="left:${(i * 97) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 9) * 0.12}s;animation-duration:${2.2 + (i % 5) * 0.35}s"></i>`).join('');
  mount(ctx.container, html`
    <section class="celebrate">
      <div class="confetti" aria-hidden="true">${raw(confetti)}</div>
      <div class="done-stamp big">COMPLETED ✓</div>
      <h1 class="display">${day.name} beres!</h1>
      <div class="celebrate-streak">
        <span class="flame-wrap lit" aria-hidden="true">🔥</span>
        <div><b class="big-num">${streak}</b><span>hari streak${best ? ` · terbaik ${best}` : ''}</span></div>
      </div>
      <div class="stat-tiles">
        <div class="tile"><b>${formatDuration(durationSec)}</b><span>durasi</span></div>
        <div class="tile"><b>${log.setsDone ?? done}</b><span>set selesai</span></div>
        <div class="tile"><b>${fmtNum(log.totalVolume || 0)} kg</b><span>volume</span></div>
      </div>
      ${badges.length ? html`<div class="badges">${badges.map((b) => html`<span class="chip chip-accent">🏅 ${typeof b === 'string' ? b : b.name || b.title || b.label || b.id || ''}</span>`)}</div>` : ''}
      <div class="celebrate-actions">
        ${log.id ? html`<a class="btn btn-primary btn-xl btn-block" href="#/flex?log=${encodeURIComponent(log.id)}&day=${encodeURIComponent(day.name)}">📸 Pamer di Flexing Room</a>` : ''}
        <a class="btn btn-ghost btn-lg btn-block" href="#/dashboard">Kembali ke Beranda</a>
      </div>
    </section>`);
  window.scrollTo({ top: 0 });
  try { navigator.vibrate?.([100, 60, 100, 60, 250]); } catch { /* ignore */ }
}
