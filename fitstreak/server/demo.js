// Demo data for a freshly created DB (FITSTREAK_DEMO=1) so leaderboard and
// community pages look alive. All demo accounts use password "demo12345".
import { tx } from './db.js';
import { now, localDate } from './time.js';
import * as rules from './rules.js';
import { listPrograms, getDay, getExercise } from './content.js';
import { hashPassword, AVATAR_COLORS } from './routes/auth.js';

export const DEMO_EMAIL = 'demo@fitstreak.app';
export const DEMO_PASSWORD = 'demo12345';
const DAY = 86_400_000;

const PEOPLE = [
  { name: 'Demo Atlet', email: DEMO_EMAIL, rate: 0.9 },
  { name: 'Rina Kusuma', email: 'rina@fitstreak.app', rate: 0.95 },
  { name: 'Budi Santoso', email: 'budi@fitstreak.app', rate: 0.7 },
  { name: 'Sari Wulandari', email: 'sari@fitstreak.app', rate: 0.8 },
  { name: 'Agus Pratama', email: 'agus@fitstreak.app', rate: 0.5 },
];

// Deterministic PRNG so demo data is stable between runs.
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function weightFor(equipment, rnd) {
  if (!equipment || /bodyweight/i.test(equipment)) return null;
  if (/barbell/i.test(equipment)) return 40 + Math.round(rnd() * 8) * 5;
  if (/machine|cable/i.test(equipment)) return 20 + Math.round(rnd() * 8) * 5;
  return 6 + Math.round(rnd() * 8) * 2;
}

export async function seedDemo(db) {
  const programs = listPrograms();
  if (!programs.length) return false;
  const hash = await hashPassword(DEMO_PASSWORD);
  const rnd = prng(42);
  const t = now();
  const todayStr = localDate(t);
  const iso = (ms) => new Date(ms).toISOString();

  tx(db, () => {
    const userIds = [];
    PEOPLE.forEach((p, i) => {
      const program = programs[i % programs.length];
      const schedule = rules.normalizeSchedule(program.defaultSchedule, program.days.map((d) => d.id)) || null;
      const created = t - (40 + i) * DAY;
      const cycleStart = t - (25 + i) * DAY;
      const id = Number(db.prepare(`INSERT INTO users (name, email, password_hash, avatar_color, program_id, schedule, sub_status, cycle_start, cycle_end, cycle_number, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, 1, ?)`).run(
        p.name, p.email, hash, AVATAR_COLORS[(i * 3) % AVATAR_COLORS.length], program.id, JSON.stringify(schedule),
        iso(cycleStart), iso(cycleStart + rules.CYCLE_DAYS * DAY), iso(created),
      ).lastInsertRowid);
      db.prepare(`INSERT INTO subscription_history (user_id, cycle_number, start, end, completion_rate, result, created_at) VALUES (?, 1, ?, ?, 0, 'paid', ?)`)
        .run(id, iso(cycleStart), iso(cycleStart + rules.CYCLE_DAYS * DAY), iso(cycleStart));
      userIds.push(id);

      // Workout logs for the past 21 days (+ today for some), following the schedule.
      const insLog = db.prepare(`INSERT INTO workout_logs (user_id, date, day_id, program_id, duration_sec, sets_done, total_volume, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)`);
      const insSet = db.prepare('INSERT INTO workout_sets (log_id, exercise_id, set_index, reps, weight, done) VALUES (?, ?, ?, ?, ?, ?)');
      for (let back = 21; back >= (i % 2 ? 0 : 1); back--) {
        const date = rules.addDays(todayStr, -back);
        const dayId = rules.scheduledDayId(schedule, date);
        if (!dayId) continue;
        // keep the last 5 days clean for the top players so streaks look nice
        if (back > 5 || i > 2) { if (rnd() > p.rate) continue; }
        const found = getDay(dayId);
        if (!found) continue;
        let setsDone = 0;
        let volume = 0;
        const sets = [];
        for (const ex of found.day.exercises || []) {
          const e = getExercise(ex.exerciseId);
          const reps = parseInt(ex.reps, 10) || 10;
          const w = weightFor(e?.equipment, rnd);
          for (let s = 0; s < (ex.sets || 3); s++) {
            const done = rnd() < 0.93;
            sets.push([ex.exerciseId, s, reps, w, done ? 1 : 0]);
            if (done) { setsDone++; volume += reps * (w || 0); }
          }
        }
        const logId = Number(insLog.run(id, date, dayId, found.program.id, 2400 + Math.round(rnd() * 1800), setsDone, volume,
          iso(t - back * DAY)).lastInsertRowid);
        for (const s of sets) insSet.run(logId, ...s);
      }
    });

    // Body logs for the demo user
    for (let w = 3; w >= 0; w--) {
      db.prepare('INSERT INTO body_logs (user_id, date, weight, body_fat, waist, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(userIds[0], rules.addDays(todayStr, -w * 7), 72.4 - (3 - w) * 0.4, 21 - (3 - w) * 0.3, 84 - (3 - w) * 0.5, w === 0 ? 'Mulai kelihatan hasilnya!' : '', iso(t - w * 7 * DAY));
    }

    // Flex posts + likes
    const flex = [
      [1, 'PR baru di squat hari ini! Konsisten itu kuncinya 💪', 2],
      [2, 'Leg day selesai. Besok jalan kayak penguin 🐧', 1],
      [3, 'Minggu ketiga tanpa bolos. Siapa yang ikut challenge?', 3],
      [0, 'Pagi-pagi push day dulu sebelum kerja ☀️', 0],
    ];
    flex.forEach(([ui, caption, daysAgo], k) => {
      const pid = Number(db.prepare('INSERT INTO flex_posts (user_id, caption, image_file, workout_log_id, created_at) VALUES (?, ?, NULL, NULL, ?)')
        .run(userIds[ui], caption, iso(t - daysAgo * DAY - k * 3600_000)).lastInsertRowid);
      userIds.forEach((liker, li) => {
        if (li !== ui && (li + k) % 3 !== 0) {
          db.prepare('INSERT INTO flex_likes (post_id, user_id, created_at) VALUES (?, ?, ?)').run(pid, liker, iso(t - daysAgo * DAY + 3600_000));
        }
      });
    });

    // Threads + replies
    const threads = [
      [2, 'Berapa protein harian yang ideal untuk pemula?', 'Aku baru mulai gym 3 minggu. Biasanya kalian makan protein berapa gram per hari? Berat badanku 70 kg.', 'nutrisi', 6,
        [[1, 'Umumnya 1.6–2.2 g per kg berat badan. Jadi sekitar 110–150 g per hari.'], [0, 'Setuju. Bagi ke 3–4 kali makan biar gampang.'], [2, 'Makasih! Aku coba mulai dari 120 g dulu.']]],
      [1, 'Tips tetap konsisten saat lagi sibuk kerja', 'Share dong cara kalian tetap latihan walau jadwal kerja padat. Aku biasanya latihan jam 6 pagi.', 'motivasi', 4,
        [[3, 'Aku siapkan baju gym dari malam sebelumnya. Kedengarannya sepele tapi ngaruh banget.'], [4, 'Kalau lagi mepet, aku tetap datang walau cuma 20 menit.']]],
      [3, 'PPL atau Full Body untuk 3x seminggu?', 'Lebih efektif mana untuk yang cuma bisa latihan 3 hari seminggu?', 'program', 2,
        [[0, 'Kalau 3x seminggu, full body biasanya lebih pas karena tiap otot dilatih 3x.']]],
      [4, 'Halo semua, member baru di sini!', 'Salam kenal, aku Agus. Target tahun ini turun 8 kg. Mohon bimbingannya 🙏', 'umum', 1,
        [[1, 'Selamat datang Agus! Semangat!'], [2, 'Welcome! Jangan lupa isi progress berat badan tiap minggu.']]],
    ];
    for (const [ui, title, body, category, daysAgo, replies] of threads) {
      const created = t - daysAgo * DAY;
      const tid = Number(db.prepare('INSERT INTO threads (user_id, title, body, category, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(userIds[ui], title, body, category, iso(created)).lastInsertRowid);
      let firstReply = null;
      replies.forEach(([ri, text], k) => {
        const rid = Number(db.prepare('INSERT INTO replies (thread_id, user_id, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(tid, userIds[ri], k === 2 ? firstReply : null, text, iso(created + (k + 1) * 3 * 3600_000)).lastInsertRowid);
        if (k === 0) firstReply = rid;
      });
    }
  });
  return true;
}
