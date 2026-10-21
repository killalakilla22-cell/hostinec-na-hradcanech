# FitStreak — Kontrak Arsitektur & API (sumber kebenaran bersama)

Zero-dependency: Node.js >= 22.13 (`node:http`, `node:sqlite`, `node:crypto`), frontend vanilla JS SPA (ES modules, tanpa build step).
UI berbahasa Indonesia (istilah gym tetap Inggris: set, reps, rest, push/pull/legs).

## Struktur folder
```
fitstreak/
  package.json            # "start": "node server/index.js", "test": "node --test server/"
  server/
    index.js              # HTTP server, static file serving dari ../public, router /api/*
    db.js                 # skema SQLite + helper (file: fitstreak/data/fitstreak.db, :memory: jika FITSTREAK_DB=':memory:')
    seed-data.js          # DATA: export const EXERCISES, PROGRAMS (lihat bawah) — ditulis agen konten
    rules.js              # logika bisnis murni (streak, siklus langganan, eligibility 50%, leaderboard)
    *.test.js             # node:test
  public/
    index.html, css/app.css, js/*.js   # SPA hash router (#/dashboard, #/workout/:dayId, ...)
  data/                   # gitignored, db + uploads/ (foto flexing)
```

## Aturan bisnis
- **Langganan**: user bayar untuk 1 siklus = 60 hari (2 bulan). Pembayaran DISIMULASIKAN (`POST /api/subscription/pay`) — titik integrasi payment gateway nanti (Midtrans/Stripe).
- **Syarat bertahan**: di akhir tiap siklus, completion rate = workout selesai / workout terjadwal dalam siklus (hanya hari yang sudah lewat/hari ini, berdasar jadwal user). Jika >= 50% → siklus baru otomatis diberikan GRATIS (status `active`). Jika < 50% → status `locked`, user harus bayar lagi untuk siklus baru. Evaluasi dilakukan lazy setiap request `GET /api/me` (dan middleware auth) bila `now >= cycle_end`.
- Status: `unpaid` (belum pernah bayar) | `active` | `locked`. Fitur premium (workout, log, flex, thread post, leaderboard) butuh `active`; `unpaid`/`locked` hanya bisa lihat dashboard/billing + program preview. API mengembalikan 402 `{error:"subscription_required"}`.
- **Jadwal**: user memilih program; setiap program punya `days` (mis. Push, Pull, Legs) dan `defaultSchedule` = map weekday(0=Minggu..6=Sabtu) → dayId atau null (rest). User boleh mengubah map ini.
- **Streak**: jumlah hari terjadwal berturut-turut (mundur dari hari ini) yang diselesaikan. Hari rest tidak memutus streak. Hari ini yang belum selesai tidak memutus streak (dihitung mulai kemarin). Simpan juga `best_streak`.
- **Completed**: satu workout_log per (user, tanggal lokal YYYY-MM-DD, dayId). Tanggal dikirim client (`date`), server validasi format & tidak di masa depan > 1 hari.
- **Leaderboard "The Most ___ Player"** kategori: `consistent` (streak saat ini), `dedicated` (total workout selesai), `hardworking` (total set selesai), `liked` (total like di flex), `talkative` (jumlah thread+reply). Periode: `all` | `month` (30 hari terakhir; untuk consistent pakai streak saat ini).

## Data konten (server/seed-data.js)
```js
export const EXERCISES = [{
  id: 'push-up', name: 'Push-Up', muscle: 'Dada, Trisep, Bahu depan', equipment: 'Bodyweight' | 'Dumbbell' | 'Barbell' | 'Machine' | 'Cable' | ...,
  level: 'Pemula' | 'Menengah' | 'Lanjut',
  steps: ['Langkah 1 ...', 'Langkah 2 ...'],     // instruksi step-by-step bahasa Indonesia
  tips: ['...'],
  videoUrl: 'https://www.youtube.com/results?search_query=push+up+proper+form',  // selalu link pencarian YouTube (dijamin valid)
}];
export const PROGRAMS = [{
  id: 'ppl-gym', name: 'Push Pull Legs (Gym)', goal: 'muscle' | 'fatloss' | 'strength' | 'general',
  location: 'gym' | 'home', level: 'Pemula'|..., description: '...',
  days: [{ id: 'ppl-gym-push', name: 'Push', focus: 'Dada, Bahu, Trisep', warmup: ['...'], cooldown: ['...'],
           exercises: [{ exerciseId: 'bench-press', sets: 4, reps: '8-10', restSec: 90, note: '' }] }],
  defaultSchedule: { 0: null, 1: 'ppl-gym-push', 2: 'ppl-gym-pull', 3: 'ppl-gym-legs', 4: 'ppl-gym-push', 5: 'ppl-gym-pull', 6: 'ppl-gym-legs' },
}];
```
`reps` adalah string (bisa '8-10', '12', '30 detik', 'AMRAP'). Day id unik global.

## API (JSON, cookie session `fs_sid` HttpOnly SameSite=Lax)
Error: `{error: "<code>", message?: "<teks Indonesia>"}` dengan status 400/401/402/403/404/409.

Auth
- `POST /api/auth/register` `{name, email, password}` → 201 `{user}` + set cookie. password min 8.
- `POST /api/auth/login` `{email, password}` → `{user}` + set cookie
- `POST /api/auth/logout` → `{ok:true}`
- `GET /api/me` → `{user, subscription, stats}` (401 bila belum login)
  - `user`: `{id, name, email, avatarColor, programId|null, schedule|null, createdAt}`
  - `subscription`: `{status, cycleStart, cycleEnd, daysLeft, cycleNumber, completionRate (0..1), scheduledCount, completedCount, required: 0.5, history:[{cycleNumber, start, end, completionRate, result:'renewed'|'locked'|'paid'}]}`
  - `stats`: `{currentStreak, bestStreak, totalWorkouts, totalSets, thisWeekDone, thisWeekScheduled}`

Langganan
- `POST /api/subscription/pay` `{plan:'2-months'}` → `{subscription}` (mulai siklus baru 60 hari dari sekarang; hanya bila unpaid/locked, else 409)

Konten (boleh tanpa langganan aktif, butuh login)
- `GET /api/programs` → `{programs:[...tanpa detail exercise lengkap ok, sertakan days]}`
- `GET /api/programs/:id` → `{program}` dengan days[].exercises[] di-join `exercise` object lengkap
- `GET /api/exercises` → `{exercises}`

Jadwal (aktif)
- `PUT /api/me/program` `{programId, schedule?}` → `{user}` (schedule default = program.defaultSchedule)
- `PUT /api/me/schedule` `{schedule: {0..6: dayId|null}}` → `{user}` (dayId harus milik program user)
- `GET /api/calendar?month=YYYY-MM` → `{month, days:[{date:'YYYY-MM-DD', dayId|null, dayName|null, completed:bool, isRest:bool}]}`
- `GET /api/today?date=YYYY-MM-DD` → `{date, day: {id,name,focus,warmup,cooldown,exercises:[{exerciseId,sets,reps,restSec,note,exercise:{...}}]}|null, completed:bool, log|null}`

Workout log (aktif)
- `POST /api/workouts/complete` `{date, dayId, durationSec, sets:[{exerciseId, setIndex, reps:number|null, weight:number|null, done:bool}], notes?}` → 201 `{log, stats, newBadges?:[]}`; 409 bila sudah tercatat untuk (date, dayId).
- `GET /api/workouts/history?limit=50` → `{logs:[{id,date,dayId,dayName,programId,durationSec,setsDone,totalVolume,notes,createdAt}]}`

Progress (aktif)
- `GET /api/progress` → `{bodyLogs:[{id,date,weight,bodyFat|null,waist|null,note}], weeklyWorkouts:[{weekStart, count}] (12 minggu), exerciseBests:[{exerciseId, name, bestWeight, bestReps}]}`
- `POST /api/progress/body` `{date, weight, bodyFat?, waist?, note?}` → 201 `{bodyLog}`
- `DELETE /api/progress/body/:id` → `{ok:true}`

Flexing room (GET butuh login; POST/like butuh aktif)
- `GET /api/flex?limit=30` → `{posts:[{id, user:{id,name,avatarColor}, caption, imageUrl|null, workoutLogId|null, likes, likedByMe, createdAt}]}`
- `POST /api/flex` `{caption, imageData?: 'data:image/(png|jpeg|webp);base64,...' (<= 3MB), workoutLogId?}` → 201 `{post}`; gambar disimpan ke data/uploads, disajikan di `/uploads/<file>`
- `POST /api/flex/:id/like` → `{likes, likedByMe}` (toggle)
- `DELETE /api/flex/:id` (hanya pemilik) → `{ok:true}`

Discussion room (thread style)
- `GET /api/threads?category=` → `{threads:[{id, title, category, user, replyCount, lastActivityAt, createdAt, excerpt}]}`; kategori: `umum`|`nutrisi`|`program`|`motivasi`|`tanya`
- `POST /api/threads` `{title, body, category}` → 201 `{thread}`
- `GET /api/threads/:id` → `{thread:{id,title,body,category,user,createdAt}, replies:[{id, body, user, parentId|null, createdAt}]}` (balasan bertingkat 1 level via parentId)
- `POST /api/threads/:id/replies` `{body, parentId?}` → 201 `{reply}`

Leaderboard
- `GET /api/leaderboard?category=consistent|dedicated|hardworking|liked|talkative&period=all|month` → `{category, title:'The Most Consistent Player', unit:'hari streak', entries:[{rank, user:{id,name,avatarColor}, value, isMe}], me:{rank,value}|null}` (top 50)

Dev
- Jika env `FITSTREAK_DEV=1`, `POST /api/dev/time-travel` `{days}` menggeser "now" server (untuk demo evaluasi siklus). Selain itu 404.

## Catatan implementasi (setelah build)
- `subscription.history` urut terbaru dulu; satu siklus bisa punya baris `paid` (saat mulai) dan `renewed`/`locked` (saat dievaluasi).
- `POST /api/dev/time-travel {days}` menambah offset (kumulatif), respons `{ok, offsetDays, now, today}`.
- Leaderboard: nilai 0 tidak ditampilkan; nilai sama → rank sama.
- Script test: `node --test "server/*.test.js"`.
