# FitStreak — Panduan Gym / Home Workout

Web app panduan latihan (muscle building & fat loss) dengan jadwal, streak, dan komunitas.
Zero-dependency: Node.js ≥ 22.13 (`node:sqlite` bawaan) + vanilla JS SPA.

## Jalankan
```bash
cd fitstreak
npm run dev     # data demo + endpoint time-travel; login: demo@fitstreak.app / demo12345
npm start       # produksi (PORT default 3000, DB di data/fitstreak.db)
npm test        # unit + integration test
```
Buka http://localhost:3000

## Fitur
- **Program & gerakan**: 6 program (PPL Gym, Upper/Lower, Full Body Pemula, Home Muscle, Fat Loss HIIT Rumah, Fat Loss Gym), 63 gerakan dengan langkah step-by-step, tips, link video panduan.
- **Workout player**: warmup → tiap exercise (set × reps, rest timer otomatis, input reps/beban) → cooldown → **COMPLETED** tercatat per user.
- **Kalender**: jadwal mingguan (mis. Senin Push, Selasa Pull, Rabu Legs) bisa diubah, tanda ✓ untuk hari selesai.
- **Streak** 🔥 (hari rest tidak memutus streak), badge milestone.
- **Progress**: berat badan, grafik, workout per minggu, personal best, riwayat.
- **Flexing Room** (foto + like) & **Diskusi** (thread + balasan).
- **Leaderboard "The Most ___ Player"**: Consistent, Dedicated, Hardworking, Liked, Talkative (semua / 30 hari).
- **Langganan 2 bulan**: di akhir siklus 60 hari, completion ≥ 50% → siklus berikutnya gratis; < 50% → akun terkunci, harus bayar lagi.

## Catatan
- Pembayaran masih **simulasi** (`POST /api/subscription/pay`) — titik integrasi Midtrans/Stripe.
- Link video = pencarian YouTube; ganti `videoUrl` di `server/seed-data.js` dengan video sendiri.
- Spesifikasi API lengkap: `CONTRACT.md`.
