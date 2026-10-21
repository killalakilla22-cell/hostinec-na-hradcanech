import { html, mount, $, toast, busy, formatDate, pct, emptyState } from '../ui.js';
import { post, loadMe, showError } from '../api.js';
import { subscriptionCard, STATUS_LABEL, historyNewestFirst, lastLocked as findLocked } from '../components.js';

const RESULT = { renewed: ['Gratis diperpanjang', 'ok'], locked: ['Terkunci', 'warn'], paid: ['Dibayar', 'info'] };

export default async function billing(ctx) {
  const { subscription: sub } = await loadMe();
  if (!ctx.alive()) return;
  const status = sub?.status || 'unpaid';
  const canPay = status !== 'active';
  const history = historyNewestFirst(sub);
  // A free-renewed cycle has no history row of its own yet: show it as the running cycle.
  if (status === 'active' && sub.cycleStart && !history.some((h) => h.cycleNumber === sub.cycleNumber)) {
    history.unshift({ cycleNumber: sub.cycleNumber, start: sub.cycleStart, end: sub.cycleEnd, completionRate: sub.completionRate, result: 'renewed-running' });
  }
  const lastLocked = findLocked(sub);

  mount(ctx.container, html`
    <header class="page-head"><h1 class="display">Langganan</h1></header>
    ${status === 'locked' ? html`
      <div class="alert alert-warn big-alert" role="alert">
        <b>🔒 Akunmu terkunci.</b>
        Di siklus ${lastLocked?.cycleNumber ?? 'terakhir'}${lastLocked ? ` (${formatDate(lastLocked.start)} – ${formatDate(lastLocked.end)})` : ''} kamu menyelesaikan
        <b>${pct(lastLocked?.completionRate)}</b> workout terjadwal, di bawah syarat minimal <b>50%</b>. Bayar untuk memulai siklus baru — streak dan riwayatmu tetap aman.
      </div>` : ''}
    <div class="billing-grid">
      <section class="card plan-card">
        <span class="pill pill-${status}">${STATUS_LABEL[status]}</span>
        <p class="eyebrow">Paket FitStreak</p>
        <h2 class="plan-name">2 Bulan</h2>
        <div class="plan-price"><span class="cur">Rp</span>199.000</div>
        <p class="muted small">≈ Rp 3.300 per hari · 60 hari akses penuh</p>
        <ul class="plan-feats">
          <li>✓ Workout player step-by-step + rest timer</li>
          <li>✓ Kalender & jadwal mingguan fleksibel</li>
          <li>✓ Log progress, grafik & personal best</li>
          <li>✓ Flexing Room, Diskusi & Leaderboard</li>
          <li>✓ <b>Siklus berikutnya GRATIS</b> jika completion ≥ 50%</li>
        </ul>
        ${canPay
          ? html`<button class="btn btn-primary btn-xl btn-block btn-glow" id="pay-btn" type="button">Bayar Rp 199.000</button>
                 <p class="small muted center-text">Pembayaran disimulasikan (mode demo) — belum ada tagihan sungguhan.</p>`
          : html`<div class="alert alert-ok">Langganan aktif sampai <b>${formatDate(sub.cycleEnd)}</b> (${sub.daysLeft} hari lagi).</div>`}
      </section>
      <div class="billing-side">
        ${status === 'active' ? subscriptionCard(sub) : ''}
        <section class="card rule-card">
          <h3>Aturan 50% — Konsisten = Gratis</h3>
          <ol class="rule-list">
            <li><b>Bayar sekali</b> untuk 1 siklus = <b>2 bulan (60 hari)</b>.</li>
            <li>Selama siklus, kami hitung <b>completion rate</b>: jumlah workout yang kamu selesaikan dibagi jumlah workout yang terjadwal (sesuai jadwal mingguanmu, sampai hari ini). Rest day tidak dihitung.</li>
            <li>Di akhir siklus, kalau completion rate-mu <b>minimal 50%</b>, siklus 2 bulan berikutnya <b>otomatis gratis</b>. 🎉</li>
            <li>Kalau <b>di bawah 50%</b>, akun dikunci dan kamu perlu bayar lagi untuk lanjut.</li>
          </ol>
          <p class="small muted">Contoh: jadwal 4×/minggu ≈ 34 workout dalam 60 hari. Selesaikan minimal 17 workout dan kamu lanjut gratis.</p>
        </section>
      </div>
    </div>
    <section class="card">
      <h3>Riwayat Siklus</h3>
      ${history.length ? html`
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Siklus</th><th>Periode</th><th class="num">Completion</th><th>Hasil</th></tr></thead>
          <tbody>${history.map((h) => {
            const current = status === 'active' && h === history.find((x) => x.cycleNumber === sub.cycleNumber);
            const [label, tone] = current ? ['Berjalan', 'ok'] : RESULT[h.result] || [h.result, 'info'];
            const rate = current ? sub.completionRate : h.result === 'paid' ? null : h.completionRate;
            return html`<tr><td>#${h.cycleNumber}</td><td class="nowrap">${formatDate(h.start, { year: false })} – ${formatDate(h.end)}</td><td class="num">${rate == null ? '-' : pct(rate)}</td><td><span class="pill pill-${tone}">${label}</span></td></tr>`;
          })}</tbody>
        </table></div>` : emptyState('Belum ada riwayat', 'Riwayat siklus langgananmu akan muncul di sini.')}
    </section>`);

  $('#pay-btn')?.addEventListener('click', async (e) => {
    await busy(e.currentTarget, async () => {
      try {
        await post('/api/subscription/pay', { plan: '2-months' });
        await loadMe();
        toast('Pembayaran berhasil! Siklus 2 bulan dimulai 🔥', 'success');
        location.hash = '#/dashboard';
      } catch (err) {
        if (err.status === 409) { toast('Langgananmu sudah aktif.', 'info'); await loadMe(); billing(ctx); return; }
        showError(err);
      }
    });
  });
}
