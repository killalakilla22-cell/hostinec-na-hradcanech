// Reusable render fragments shared by several pages.
import { html, raw, pct, formatDate } from './ui.js';

/** Subscription history newest-first (server sends newest-first; tolerate ascending too). */
export function historyNewestFirst(sub) {
  const h = [...(sub?.history || [])];
  if (h.length > 1 && Number(h[0].cycleNumber) < Number(h[h.length - 1].cycleNumber)) h.reverse();
  return h;
}
export const lastLocked = (sub) => historyNewestFirst(sub).find((h) => h.result === 'locked') || null;

export const STATUS_LABEL = { active: 'Aktif', locked: 'Terkunci', unpaid: 'Belum Bayar' };

/** Completion progress bar with the 50% requirement marker. */
export function completionBar(rate, required = 0.5) {
  const v = Math.max(0, Math.min(1, Number(rate) || 0));
  const below = v < required;
  return html`
    <div class="meter ${below ? 'meter-warn' : 'meter-ok'}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v * 100)}" aria-label="Completion rate">
      <div class="meter-fill" style="width:${raw((v * 100).toFixed(1))}%"></div>
      <div class="meter-mark" style="left:${raw((required * 100).toFixed(1))}%"><span>${Math.round(required * 100)}%</span></div>
    </div>`;
}

/** Subscription status card (dashboard + billing). */
export function subscriptionCard(sub, { compact = false } = {}) {
  if (!sub) return '';
  const status = sub.status || 'unpaid';
  if (status !== 'active') {
    const last = lastLocked(sub);
    return html`
      <section class="card sub-card sub-${status}">
        <div class="card-head"><h3>Langganan</h3><span class="pill pill-${status}">${STATUS_LABEL[status]}</span></div>
        <p>${status === 'locked'
          ? html`Siklus terakhir kamu hanya menyelesaikan <b>${pct(last?.completionRate)}</b> workout (syarat minimal <b>50%</b>), jadi akses dikunci. Bayar untuk memulai siklus 2 bulan baru.`
          : 'Mulai perjalananmu! Bayar sekali untuk 2 bulan. Selesaikan minimal 50% workout terjadwal dan siklus berikutnya GRATIS.'}</p>
        <a class="btn btn-primary btn-block" href="#/billing">${status === 'locked' ? 'Buka Kunci — Rp 199.000' : 'Aktifkan — Rp 199.000 / 2 bulan'}</a>
      </section>`;
  }
  const rate = Number(sub.completionRate) || 0;
  const required = sub.required ?? 0.5;
  const below = rate < required && (sub.scheduledCount || 0) > 0;
  const remainingNeeded = Math.max(0, Math.ceil((sub.scheduledCount || 0) * required) - (sub.completedCount || 0));
  return html`
    <section class="card sub-card">
      <div class="card-head">
        <h3>Langganan · Siklus ${sub.cycleNumber ?? 1}</h3>
        <span class="pill pill-active">Aktif</span>
      </div>
      <div class="sub-days"><span class="big-num">${sub.daysLeft ?? '-'}</span><span class="muted">hari tersisa${sub.cycleEnd ? html` · sampai ${formatDate(sub.cycleEnd)}` : ''}</span></div>
      <div class="row between small"><span>Completion rate</span><b class="${below ? 'text-warn' : 'text-ok'}">${pct(rate)}</b></div>
      ${completionBar(rate, required)}
      <p class="small muted">${sub.completedCount ?? 0} dari ${sub.scheduledCount ?? 0} workout terjadwal selesai.</p>
      ${below
        ? html`<div class="alert alert-warn" role="alert"><b>⚠️ Di bawah 50%!</b> ${compact ? '' : html`Kalau sampai akhir siklus tetap di bawah 50%, akunmu akan terkunci dan harus bayar lagi. `}Kejar ${remainingNeeded} workout lagi untuk aman.</div>`
        : html`<div class="alert alert-ok">✅ Aman! Pertahankan ≥50% agar siklus berikutnya gratis.</div>`}
    </section>`;
}

/** Monday-first week of YYYY-MM-DD strings containing `date`. */
export function weekDates(date) {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const dow = (base.getDay() + 6) % 7; // 0=Monday
  const out = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(y, m - 1, d - dow + i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
  }
  return out;
}

/** Full exercise detail (modal body / workout step). */
export function exerciseDetail(ex, { prescription = null } = {}) {
  if (!ex) return html`<p class="muted">Detail exercise tidak tersedia.</p>`;
  return html`
    <div class="ex-detail">
      <div class="ex-detail-head">
        <h2>${ex.name}</h2>
        <div class="chips">
          ${ex.muscle ? html`<span class="chip chip-accent">${ex.muscle}</span>` : ''}
          ${ex.equipment ? html`<span class="chip">${ex.equipment}</span>` : ''}
          ${ex.level ? html`<span class="chip">${ex.level}</span>` : ''}
        </div>
      </div>
      ${prescription}
      ${ex.steps?.length ? html`<h4>Cara melakukan</h4><ol class="steps">${ex.steps.map((s) => html`<li>${s}</li>`)}</ol>` : ''}
      ${ex.tips?.length ? html`<h4>Tips</h4><ul class="tips">${ex.tips.map((s) => html`<li>${s}</li>`)}</ul>` : ''}
      ${safeUrl(ex.videoUrl) ? html`<a class="btn btn-video" href="${safeUrl(ex.videoUrl)}" target="_blank" rel="noopener noreferrer">▶ Tonton Video Panduan</a>` : ''}
    </div>`;
}

/** Only allow http(s) links. */
export function safeUrl(u) {
  try {
    const url = new URL(u, location.origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch { return ''; }
}

/** First local date that counts for "missed" marks (before the user's first paid cycle nothing is missed). */
export function trackingStart(me) {
  const h = me?.subscription?.history || [];
  const src = h.length ? h[0].start : me?.subscription?.cycleStart || me?.user?.createdAt;
  const d = src ? new Date(src) : null;
  if (!d || isNaN(d)) return '0000-00-00';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
