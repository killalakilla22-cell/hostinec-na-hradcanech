// FitStreak — data konten (latihan & program). Lihat CONTRACT.md bagian "Data konten".
// videoUrl selalu link pencarian YouTube (dijamin valid, tanpa ID video yang dikarang).

const yt = (name) =>
  'https://www.youtube.com/results?search_query=' +
  encodeURIComponent(`${name} proper form`).replace(/%20/g, '+');

const ex = (id, name, muscle, equipment, level, steps, tips) => ({
  id, name, muscle, equipment, level, steps, tips, videoUrl: yt(name),
});

export const EXERCISES = [
  // ───────── Barbell ─────────
  ex('bench-press', 'Barbell Bench Press', 'Dada, Trisep, Bahu depan', 'Barbell', 'Menengah', [
    'Berbaring di bench, mata tepat di bawah barbell, kaki menapak kuat di lantai.',
    'Genggam bar sedikit lebih lebar dari bahu, rapatkan tulang belikat ke belakang dan bawah.',
    'Angkat bar dari rack dan posisikan di atas dada dengan lengan lurus.',
    'Turunkan bar perlahan ke dada bagian bawah/puting, siku sekitar 45° dari badan.',
    'Dorong bar kembali ke atas secara eksplosif hingga lengan lurus tanpa mengunci keras.',
  ], [
    'Jangan memantulkan bar di dada — kontrol fase turun.',
    'Gunakan spotter atau safety pin saat mengangkat beban berat.',
    'Hindari siku melebar 90° karena membebani sendi bahu.',
  ]),
  ex('incline-bench-press', 'Incline Barbell Bench Press', 'Dada atas, Bahu depan, Trisep', 'Barbell', 'Menengah', [
    'Atur bench pada sudut 30–45°.',
    'Berbaring, rapatkan tulang belikat, kaki menapak di lantai.',
    'Genggam bar sedikit lebih lebar dari bahu dan angkat dari rack.',
    'Turunkan bar ke dada atas (di bawah tulang selangka) dengan terkontrol.',
    'Dorong bar ke atas hingga lengan lurus.',
  ], [
    'Sudut terlalu tinggi (>45°) membuat beban pindah ke bahu.',
    'Jaga pantat tetap menempel di bench.',
  ]),
  ex('overhead-press', 'Overhead Press', 'Bahu, Trisep, Core', 'Barbell', 'Menengah', [
    'Berdiri dengan kaki selebar pinggul, bar di depan bahu (front rack).',
    'Genggam bar sedikit lebih lebar dari bahu, siku sedikit di depan bar.',
    'Kencangkan perut dan bokong agar punggung bawah tidak melengkung.',
    'Dorong bar lurus ke atas, tarik kepala sedikit ke belakang agar bar lewat.',
    'Kunci lengan di atas kepala dengan bar sejajar telinga, lalu turunkan perlahan.',
  ], [
    'Jangan mencondongkan badan ke belakang berlebihan — itu tanda beban terlalu berat.',
    'Peras bokong sepanjang gerakan untuk melindungi punggung bawah.',
  ]),
  ex('barbell-row', 'Barbell Bent Over Row', 'Punggung atas, Lats, Bisep', 'Barbell', 'Menengah', [
    'Berdiri dengan kaki selebar pinggul, pegang bar dengan genggaman overhand selebar bahu.',
    'Tekuk lutut sedikit dan condongkan badan ke depan (hip hinge) sekitar 45°, punggung lurus.',
    'Biarkan bar menggantung di bawah bahu dengan lengan lurus.',
    'Tarik bar ke arah perut bagian bawah sambil merapatkan tulang belikat.',
    'Turunkan bar perlahan hingga lengan lurus kembali.',
  ], [
    'Jangan membulatkan punggung — jaga tulang belakang netral.',
    'Hindari mengayun badan untuk menarik beban.',
    'Leher netral, pandangan ke lantai sedikit di depan.',
  ]),
  ex('deadlift', 'Conventional Deadlift', 'Punggung bawah, Hamstring, Glutes, Punggung atas', 'Barbell', 'Lanjut', [
    'Berdiri dengan bar di atas pertengahan kaki, kaki selebar pinggul.',
    'Tekuk pinggul dan lutut, genggam bar tepat di luar lutut.',
    'Dada tegak, punggung lurus, tarik "slack" dari bar hingga badan kencang.',
    'Dorong lantai dengan kaki dan angkat bar menempel tulang kering hingga berdiri tegak.',
    'Kunci pinggul di atas tanpa melengkung ke belakang.',
    'Turunkan bar dengan mendorong pinggul ke belakang, tetap dekat dengan kaki.',
  ], [
    'Punggung membulat adalah kesalahan paling berbahaya — kurangi beban bila terjadi.',
    'Bar harus tetap dekat badan sepanjang gerakan.',
    'Jangan menyentak bar dari lantai.',
  ]),
  ex('romanian-deadlift', 'Romanian Deadlift', 'Hamstring, Glutes, Punggung bawah', 'Barbell', 'Menengah', [
    'Berdiri tegak memegang bar di depan paha, kaki selebar pinggul.',
    'Tekuk lutut sedikit dan kunci posisi itu.',
    'Dorong pinggul ke belakang sambil menurunkan bar menyusuri paha.',
    'Turunkan hingga terasa regangan kuat di hamstring (biasanya di bawah lutut).',
    'Dorong pinggul ke depan untuk kembali berdiri tegak.',
  ], [
    'Ini gerakan pinggul, bukan squat — lutut jangan banyak menekuk.',
    'Jaga punggung tetap lurus; berhenti sebelum punggung membulat.',
  ]),
  ex('back-squat', 'Barbell Back Squat', 'Paha depan, Glutes, Hamstring, Core', 'Barbell', 'Menengah', [
    'Letakkan bar di punggung atas (trapezius), bukan di leher.',
    'Keluarkan bar dari rack, kaki selebar bahu, ujung kaki sedikit menghadap keluar.',
    'Tarik napas dalam dan kencangkan perut (bracing).',
    'Turun dengan mendorong pinggul ke belakang dan menekuk lutut searah jari kaki.',
    'Turun hingga paha minimal sejajar lantai, dada tetap tegak.',
    'Dorong lantai dengan seluruh telapak kaki untuk kembali berdiri.',
  ], [
    'Jangan biarkan lutut jatuh ke dalam (valgus).',
    'Tumit harus tetap menempel di lantai.',
    'Selalu gunakan safety bar di squat rack.',
  ]),
  ex('hip-thrust', 'Barbell Hip Thrust', 'Glutes, Hamstring', 'Barbell', 'Menengah', [
    'Duduk di lantai dengan punggung atas bersandar di tepi bench.',
    'Gulingkan barbell (pakai pad) hingga berada di lipatan pinggul.',
    'Tekuk lutut, telapak kaki menapak selebar pinggul.',
    'Dorong pinggul ke atas hingga badan lurus dari bahu ke lutut.',
    'Peras bokong 1 detik di atas, lalu turunkan perlahan.',
  ], [
    'Dagu sedikit ditekuk agar punggung bawah tidak melengkung berlebihan.',
    'Tulang kering harus vertikal di posisi atas.',
  ]),
  ex('barbell-curl', 'Barbell Curl', 'Bisep', 'Barbell', 'Pemula', [
    'Berdiri tegak, pegang bar dengan genggaman underhand selebar bahu.',
    'Siku menempel di sisi badan.',
    'Angkat bar ke arah bahu dengan menekuk siku.',
    'Peras bisep di atas, lalu turunkan perlahan hingga lengan lurus.',
  ], [
    'Jangan mengayun badan atau menggunakan punggung.',
    'Fase turun yang lambat memberi stimulus lebih besar.',
  ]),

  // ───────── Dumbbell / Kettlebell ─────────
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'Dada atas, Bahu depan, Trisep', 'Dumbbell', 'Pemula', [
    'Atur bench pada sudut 30–45° dan duduk dengan dumbbell di paha.',
    'Berbaring sambil membawa dumbbell ke samping dada.',
    'Dorong dumbbell ke atas hingga hampir bersentuhan di atas dada.',
    'Turunkan perlahan hingga siku sedikit di bawah bench.',
  ], [
    'Siku sekitar 45° dari badan, jangan terlalu melebar.',
    'Kontrol dumbbell — jangan dijatuhkan terlalu dalam.',
  ]),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', 'Dada, Trisep, Bahu depan', 'Dumbbell', 'Pemula', [
    'Duduk di bench datar dengan dumbbell di paha, lalu berbaring.',
    'Posisikan dumbbell di samping dada, telapak menghadap kaki.',
    'Rapatkan tulang belikat dan dorong dumbbell ke atas.',
    'Turunkan perlahan ke samping dada dengan terkontrol.',
  ], [
    'Jangan membenturkan dumbbell di atas.',
    'Kaki tetap menapak di lantai untuk stabilitas.',
  ]),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Bahu, Trisep', 'Dumbbell', 'Pemula', [
    'Duduk di bench tegak (atau berdiri), dumbbell setinggi bahu.',
    'Telapak tangan menghadap depan, siku sedikit di depan badan.',
    'Dorong dumbbell ke atas hingga lengan hampir lurus.',
    'Turunkan perlahan ke setinggi telinga/bahu.',
  ], [
    'Jangan melengkungkan punggung bawah — kencangkan perut.',
    'Hindari mengunci siku dengan keras di atas.',
  ]),
  ex('lateral-raise', 'Dumbbell Lateral Raise', 'Bahu samping', 'Dumbbell', 'Pemula', [
    'Berdiri tegak memegang dumbbell di samping badan.',
    'Tekuk siku sedikit dan kunci posisinya.',
    'Angkat dumbbell ke samping hingga setinggi bahu.',
    'Tahan sebentar lalu turunkan perlahan.',
  ], [
    'Gunakan beban ringan — ayunan badan adalah tanda beban terlalu berat.',
    'Pimpin gerakan dengan siku, bukan tangan.',
    'Jangan mengangkat bahu ke arah telinga.',
  ]),
  ex('rear-delt-fly', 'Dumbbell Rear Delt Fly', 'Bahu belakang, Punggung atas', 'Dumbbell', 'Pemula', [
    'Condongkan badan ke depan hampir sejajar lantai, punggung lurus.',
    'Biarkan dumbbell menggantung di bawah dada, siku sedikit ditekuk.',
    'Angkat dumbbell ke samping hingga setinggi badan.',
    'Turunkan perlahan dengan terkontrol.',
  ], [
    'Fokus pada bahu belakang, bukan merapatkan tulang belikat berlebihan.',
    'Beban ringan dan gerakan pelan lebih efektif.',
  ]),
  ex('dumbbell-row', 'One Arm Dumbbell Row', 'Lats, Punggung atas, Bisep', 'Dumbbell', 'Pemula', [
    'Letakkan satu lutut dan tangan di bench, punggung sejajar lantai.',
    'Pegang dumbbell dengan tangan lainnya, lengan lurus ke bawah.',
    'Tarik dumbbell ke arah pinggul dengan siku dekat badan.',
    'Peras punggung di atas, lalu turunkan perlahan.',
  ], [
    'Jangan memutar badan untuk mengangkat beban.',
    'Bayangkan menarik dengan siku, bukan tangan.',
  ]),
  ex('dumbbell-curl', 'Dumbbell Bicep Curl', 'Bisep', 'Dumbbell', 'Pemula', [
    'Berdiri tegak memegang dumbbell di samping badan, telapak menghadap depan.',
    'Siku menempel di sisi badan.',
    'Angkat dumbbell ke arah bahu dengan menekuk siku.',
    'Peras bisep di atas lalu turunkan perlahan.',
  ], [
    'Hindari mengayun badan.',
    'Turunkan hingga lengan benar-benar lurus untuk rentang gerak penuh.',
  ]),
  ex('hammer-curl', 'Hammer Curl', 'Bisep, Brachialis, Lengan bawah', 'Dumbbell', 'Pemula', [
    'Berdiri memegang dumbbell dengan telapak saling berhadapan (netral).',
    'Siku menempel di sisi badan.',
    'Angkat dumbbell ke arah bahu tanpa memutar pergelangan.',
    'Turunkan perlahan ke posisi awal.',
  ], [
    'Jaga pergelangan tetap lurus.',
    'Jangan biarkan siku maju ke depan.',
  ]),
  ex('overhead-tricep-extension', 'Dumbbell Overhead Tricep Extension', 'Trisep', 'Dumbbell', 'Pemula', [
    'Duduk atau berdiri, pegang satu dumbbell dengan kedua tangan di atas kepala.',
    'Siku menghadap depan dan dekat dengan kepala.',
    'Turunkan dumbbell ke belakang kepala dengan menekuk siku.',
    'Luruskan siku untuk mengangkat dumbbell kembali ke atas.',
  ], [
    'Jangan biarkan siku melebar ke samping.',
    'Kencangkan perut agar punggung tidak melengkung.',
  ]),
  ex('goblet-squat', 'Goblet Squat', 'Paha depan, Glutes, Core', 'Dumbbell', 'Pemula', [
    'Pegang satu dumbbell/kettlebell vertikal di depan dada.',
    'Kaki selebar bahu, ujung kaki sedikit keluar.',
    'Turun dengan menekuk lutut dan pinggul, dada tetap tegak.',
    'Turun hingga siku menyentuh bagian dalam lutut atau paha sejajar lantai.',
    'Dorong lantai untuk kembali berdiri.',
  ], [
    'Tumit jangan terangkat.',
    'Lutut searah dengan jari kaki.',
  ]),
  ex('dumbbell-lunge', 'Dumbbell Walking Lunge', 'Paha depan, Glutes, Hamstring', 'Dumbbell', 'Pemula', [
    'Berdiri tegak memegang dumbbell di samping badan.',
    'Melangkah satu kaki ke depan dengan langkah lebar.',
    'Turunkan badan hingga kedua lutut menekuk sekitar 90°.',
    'Dorong dengan kaki depan dan langsung melangkah dengan kaki belakang ke depan.',
    'Ulangi bergantian kaki.',
  ], [
    'Lutut belakang hampir menyentuh lantai, jangan dibenturkan.',
    'Badan tetap tegak, jangan condong ke depan.',
  ]),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'Paha depan, Glutes', 'Dumbbell', 'Menengah', [
    'Berdiri membelakangi bench, letakkan punggung kaki belakang di atas bench.',
    'Kaki depan sekitar dua langkah di depan bench.',
    'Turunkan badan hingga paha depan sejajar lantai.',
    'Dorong dengan tumit kaki depan untuk naik kembali.',
    'Selesaikan semua repetisi lalu ganti kaki.',
  ], [
    'Bisa dilakukan tanpa beban terlebih dahulu.',
    'Condong sedikit ke depan untuk menekankan glutes.',
  ]),
  ex('dumbbell-rdl', 'Dumbbell Romanian Deadlift', 'Hamstring, Glutes', 'Dumbbell', 'Pemula', [
    'Berdiri memegang dumbbell di depan paha.',
    'Tekuk lutut sedikit dan kunci.',
    'Dorong pinggul ke belakang, turunkan dumbbell menyusuri kaki.',
    'Turun hingga terasa regangan di hamstring, punggung tetap lurus.',
    'Dorong pinggul ke depan untuk berdiri tegak.',
  ], [
    'Jangan membulatkan punggung.',
    'Dumbbell tetap dekat dengan kaki.',
  ]),
  ex('dumbbell-thruster', 'Dumbbell Thruster', 'Seluruh badan, Paha, Bahu', 'Dumbbell', 'Menengah', [
    'Pegang dumbbell setinggi bahu, kaki selebar bahu.',
    'Lakukan squat hingga paha sejajar lantai.',
    'Dorong naik secara eksplosif dan gunakan momentum untuk menekan dumbbell ke atas kepala.',
    'Turunkan dumbbell ke bahu sambil langsung masuk ke squat berikutnya.',
  ], [
    'Gerakan harus mengalir — squat dan press dalam satu ritme.',
    'Pilih beban ringan-sedang; ini latihan conditioning.',
  ]),
  ex('kettlebell-swing', 'Kettlebell Swing', 'Glutes, Hamstring, Core, Kardio', 'Kettlebell', 'Menengah', [
    'Berdiri dengan kaki sedikit lebih lebar dari bahu, kettlebell di depan.',
    'Hip hinge dan genggam kettlebell dengan kedua tangan.',
    'Ayunkan kettlebell ke belakang di antara kaki.',
    'Dorong pinggul ke depan secara eksplosif hingga kettlebell terayun setinggi dada.',
    'Biarkan kettlebell jatuh kembali dan langsung lanjut ke ayunan berikutnya.',
  ], [
    'Tenaga dari pinggul, bukan dari bahu/lengan.',
    'Ini bukan squat — lutut hanya sedikit menekuk.',
    'Kunci glutes dan perut di puncak ayunan.',
  ]),

  // ───────── Cable ─────────
  ex('lat-pulldown', 'Lat Pulldown', 'Lats, Bisep, Punggung atas', 'Cable', 'Pemula', [
    'Duduk dan kunci paha di bawah pad.',
    'Genggam bar lebih lebar dari bahu, telapak menghadap depan.',
    'Condong sedikit ke belakang, dada terangkat.',
    'Tarik bar ke dada atas sambil menurunkan siku ke samping badan.',
    'Kembalikan bar perlahan hingga lengan lurus.',
  ], [
    'Jangan menarik bar ke belakang leher.',
    'Hindari mengayun badan ke belakang.',
  ]),
  ex('seated-cable-row', 'Seated Cable Row', 'Punggung tengah, Lats, Bisep', 'Cable', 'Pemula', [
    'Duduk dengan kaki di pijakan, lutut sedikit ditekuk.',
    'Pegang handle, punggung tegak dan lengan lurus.',
    'Tarik handle ke arah perut sambil merapatkan tulang belikat.',
    'Tahan sebentar lalu kembalikan perlahan.',
  ], [
    'Jangan mengayun badan maju-mundur.',
    'Bahu tetap turun, jauh dari telinga.',
  ]),
  ex('cable-fly', 'Cable Fly', 'Dada', 'Cable', 'Pemula', [
    'Atur pulley setinggi bahu, berdiri di tengah sambil memegang kedua handle.',
    'Melangkah satu langkah ke depan, siku sedikit ditekuk.',
    'Bawa kedua tangan ke depan dada dengan gerakan memeluk.',
    'Peras dada lalu kembalikan perlahan hingga terasa regangan.',
  ], [
    'Sudut siku tetap sama sepanjang gerakan.',
    'Jangan meregang terlalu jauh ke belakang.',
  ]),
  ex('tricep-pushdown', 'Tricep Rope Pushdown', 'Trisep', 'Cable', 'Pemula', [
    'Pasang rope di pulley atas dan pegang kedua ujungnya.',
    'Siku menempel di sisi badan.',
    'Dorong rope ke bawah hingga lengan lurus, buka rope di bawah.',
    'Kembalikan perlahan hingga siku sekitar 90°.',
  ], [
    'Siku tidak boleh maju-mundur.',
    'Jangan mencondongkan badan berlebihan untuk menambah tenaga.',
  ]),
  ex('face-pull', 'Face Pull', 'Bahu belakang, Punggung atas, Rotator cuff', 'Cable', 'Pemula', [
    'Pasang rope di pulley setinggi wajah.',
    'Pegang rope dengan telapak menghadap ke bawah, mundur hingga lengan lurus.',
    'Tarik rope ke arah wajah sambil membuka tangan ke samping.',
    'Siku tinggi, tahan sebentar, lalu kembalikan perlahan.',
  ], [
    'Bagus untuk kesehatan bahu — gunakan beban ringan.',
    'Jangan menarik dengan punggung bawah.',
  ]),

  // ───────── Machine ─────────
  ex('leg-press', 'Leg Press', 'Paha depan, Glutes', 'Machine', 'Pemula', [
    'Duduk di mesin, punggung menempel sandaran.',
    'Letakkan kaki selebar bahu di tengah platform.',
    'Lepaskan pengaman dan turunkan platform hingga lutut sekitar 90°.',
    'Dorong platform kembali tanpa mengunci lutut.',
  ], [
    'Jangan mengunci lutut di atas — berisiko cedera.',
    'Pinggul tidak boleh terangkat dari kursi di bawah.',
  ]),
  ex('leg-curl', 'Lying Leg Curl', 'Hamstring', 'Machine', 'Pemula', [
    'Berbaring tengkurap di mesin, pad tepat di atas tumit.',
    'Pegang handle untuk stabilitas.',
    'Tekuk lutut untuk menarik pad ke arah bokong.',
    'Turunkan perlahan hingga kaki hampir lurus.',
  ], [
    'Pinggul tetap menempel di bantalan.',
    'Fase turun lambat (2–3 detik).',
  ]),
  ex('leg-extension', 'Leg Extension', 'Paha depan', 'Machine', 'Pemula', [
    'Duduk di mesin, pad di depan pergelangan kaki bagian bawah.',
    'Pegang handle samping.',
    'Luruskan lutut untuk mengangkat beban.',
    'Peras paha depan di atas lalu turunkan perlahan.',
  ], [
    'Hindari menendang beban dengan momentum.',
    'Atur sandaran agar lutut sejajar poros mesin.',
  ]),
  ex('calf-raise', 'Standing Calf Raise', 'Betis', 'Machine', 'Pemula', [
    'Berdiri di mesin calf raise (atau tepi anak tangga), ujung kaki di pijakan.',
    'Turunkan tumit hingga betis teregang.',
    'Jinjit setinggi mungkin.',
    'Tahan 1 detik di atas lalu turunkan perlahan.',
  ], [
    'Jangan memantul — gunakan rentang gerak penuh.',
    'Bisa dilakukan di rumah di tepi tangga dengan bodyweight.',
  ]),

  // ───────── Bodyweight ─────────
  ex('push-up', 'Push-Up', 'Dada, Trisep, Bahu depan', 'Bodyweight', 'Pemula', [
    'Posisi plank dengan tangan sedikit lebih lebar dari bahu.',
    'Badan lurus dari kepala hingga tumit, perut dikencangkan.',
    'Turunkan dada hingga hampir menyentuh lantai, siku sekitar 45°.',
    'Dorong lantai untuk kembali ke posisi awal.',
  ], [
    'Jangan biarkan pinggul turun atau terangkat.',
    'Pemula bisa mulai dengan lutut di lantai atau tangan di meja.',
  ]),
  ex('incline-push-up', 'Incline Push-Up', 'Dada bawah, Trisep, Bahu depan', 'Bodyweight', 'Pemula', [
    'Letakkan tangan di tepi meja, kursi kokoh, atau bench.',
    'Mundurkan kaki hingga badan lurus dan miring.',
    'Turunkan dada ke arah tepi permukaan.',
    'Dorong kembali hingga lengan lurus.',
  ], [
    'Semakin tinggi permukaan, semakin mudah gerakannya.',
    'Pastikan permukaan tidak bergeser.',
  ]),
  ex('diamond-push-up', 'Diamond Push-Up', 'Trisep, Dada', 'Bodyweight', 'Menengah', [
    'Posisi plank dengan kedua tangan rapat membentuk berlian di bawah dada.',
    'Badan lurus, perut kencang.',
    'Turunkan dada ke arah tangan, siku menempel badan.',
    'Dorong kembali ke atas.',
  ], [
    'Lakukan dengan lutut di lantai bila belum kuat.',
    'Siku jangan melebar ke samping.',
  ]),
  ex('pike-push-up', 'Pike Push-Up', 'Bahu, Trisep', 'Bodyweight', 'Menengah', [
    'Mulai dari posisi push-up, angkat pinggul tinggi membentuk huruf V terbalik.',
    'Tangan selebar bahu, kepala di antara lengan.',
    'Tekuk siku dan turunkan kepala ke arah lantai di depan tangan.',
    'Dorong kembali hingga lengan lurus.',
  ], [
    'Semakin dekat kaki ke tangan, semakin berat untuk bahu.',
    'Kontrol kepala — jangan sampai membentur lantai.',
  ]),
  ex('dip', 'Dips', 'Trisep, Dada bawah, Bahu depan', 'Bodyweight', 'Menengah', [
    'Pegang dip bar (atau dua kursi kokoh) dan angkat badan dengan lengan lurus.',
    'Condong sedikit ke depan untuk dada, tegak untuk trisep.',
    'Turunkan badan hingga siku sekitar 90°.',
    'Dorong kembali ke atas hingga lengan lurus.',
  ], [
    'Jangan turun terlalu dalam bila bahu terasa sakit.',
    'Bahu tetap turun, jangan mengangkat ke telinga.',
  ]),
  ex('bench-dip', 'Bench Dip', 'Trisep', 'Bodyweight', 'Pemula', [
    'Duduk di tepi kursi/bench, tangan di samping pinggul.',
    'Geser pinggul ke depan, kaki lurus atau ditekuk.',
    'Turunkan badan dengan menekuk siku hingga sekitar 90°.',
    'Dorong kembali ke atas.',
  ], [
    'Punggung dekat dengan kursi.',
    'Tekuk lutut untuk versi lebih mudah.',
  ]),
  ex('pull-up', 'Pull-Up', 'Lats, Bisep, Punggung atas', 'Bodyweight', 'Menengah', [
    'Gantung di pull-up bar dengan genggaman overhand sedikit lebih lebar dari bahu.',
    'Tarik bahu ke bawah dan kencangkan perut.',
    'Tarik badan ke atas hingga dagu melewati bar.',
    'Turunkan perlahan hingga lengan lurus.',
  ], [
    'Hindari mengayun (kipping) bila tujuannya membangun kekuatan.',
    'Gunakan resistance band atau mesin assisted bila belum bisa.',
  ]),
  ex('chin-up', 'Chin-Up', 'Lats, Bisep', 'Bodyweight', 'Menengah', [
    'Gantung di bar dengan genggaman underhand selebar bahu.',
    'Kencangkan perut, bahu turun.',
    'Tarik badan hingga dagu melewati bar.',
    'Turunkan perlahan dengan terkontrol.',
  ], [
    'Lebih mudah dari pull-up karena melibatkan bisep lebih banyak.',
    'Lakukan negative (turun lambat) bila belum bisa naik.',
  ]),
  ex('inverted-row', 'Inverted Row', 'Punggung atas, Lats, Bisep', 'Bodyweight', 'Pemula', [
    'Berbaring di bawah meja kokoh atau bar rendah, pegang tepinya.',
    'Badan lurus dari kepala hingga tumit, tumit di lantai.',
    'Tarik dada ke arah meja/bar sambil merapatkan tulang belikat.',
    'Turunkan perlahan hingga lengan lurus.',
  ], [
    'Pastikan meja benar-benar kokoh dan tidak terbalik.',
    'Tekuk lutut untuk versi lebih mudah.',
  ]),
  ex('bodyweight-squat', 'Bodyweight Squat', 'Paha depan, Glutes', 'Bodyweight', 'Pemula', [
    'Berdiri dengan kaki selebar bahu, tangan di depan dada.',
    'Dorong pinggul ke belakang dan tekuk lutut.',
    'Turun hingga paha sejajar lantai, dada tetap tegak.',
    'Dorong lantai dengan tumit untuk berdiri.',
  ], [
    'Lutut searah jari kaki, jangan jatuh ke dalam.',
    'Tumit tetap menempel di lantai.',
  ]),
  ex('reverse-lunge', 'Reverse Lunge', 'Paha depan, Glutes, Hamstring', 'Bodyweight', 'Pemula', [
    'Berdiri tegak, tangan di pinggang.',
    'Melangkah satu kaki ke belakang.',
    'Turunkan badan hingga kedua lutut sekitar 90°.',
    'Dorong dengan kaki depan untuk kembali berdiri.',
    'Ganti kaki secara bergantian.',
  ], [
    'Lebih ramah lutut dibanding forward lunge.',
    'Badan tetap tegak.',
  ]),
  ex('glute-bridge', 'Glute Bridge', 'Glutes, Hamstring', 'Bodyweight', 'Pemula', [
    'Berbaring telentang, lutut ditekuk, kaki menapak selebar pinggul.',
    'Tangan di samping badan.',
    'Dorong tumit dan angkat pinggul hingga badan lurus dari bahu ke lutut.',
    'Peras bokong 1–2 detik lalu turunkan perlahan.',
  ], [
    'Jangan melengkungkan punggung bawah di atas.',
    'Versi satu kaki untuk tantangan lebih.',
  ]),
  ex('single-leg-rdl', 'Single Leg Romanian Deadlift', 'Hamstring, Glutes, Keseimbangan', 'Bodyweight', 'Menengah', [
    'Berdiri dengan satu kaki, lutut sedikit ditekuk.',
    'Condongkan badan ke depan sambil mengangkat kaki lain ke belakang.',
    'Turun hingga badan hampir sejajar lantai, pinggul tetap rata.',
    'Kembali berdiri dengan meremas glutes kaki tumpuan.',
  ], [
    'Pegang dinding bila keseimbangan belum stabil.',
    'Bisa ditambah dumbbell di tangan.',
  ]),
  ex('plank', 'Plank', 'Core, Bahu', 'Bodyweight', 'Pemula', [
    'Bertumpu pada lengan bawah dan ujung kaki.',
    'Siku tepat di bawah bahu.',
    'Badan lurus dari kepala hingga tumit, kencangkan perut dan bokong.',
    'Tahan posisi sambil bernapas normal.',
  ], [
    'Jangan biarkan pinggul turun atau terlalu tinggi.',
    'Jangan menahan napas.',
  ]),
  ex('side-plank', 'Side Plank', 'Obliques, Core', 'Bodyweight', 'Pemula', [
    'Berbaring miring, bertumpu pada satu lengan bawah, siku di bawah bahu.',
    'Kaki lurus bertumpuk.',
    'Angkat pinggul hingga badan lurus.',
    'Tahan, lalu ganti sisi.',
  ], [
    'Pinggul jangan turun.',
    'Tekuk lutut bawah untuk versi lebih mudah.',
  ]),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Perut bawah, Hip flexor', 'Bodyweight', 'Menengah', [
    'Gantung di pull-up bar dengan lengan lurus.',
    'Kencangkan perut dan hindari mengayun.',
    'Angkat kaki (lurus atau lutut ditekuk) hingga setinggi pinggul atau lebih.',
    'Turunkan perlahan dengan terkontrol.',
  ], [
    'Mulai dengan lutut ditekuk bila belum kuat.',
    'Hentikan ayunan sebelum repetisi berikutnya.',
  ]),
  ex('lying-leg-raise', 'Lying Leg Raise', 'Perut bawah', 'Bodyweight', 'Pemula', [
    'Berbaring telentang, tangan di samping atau di bawah pinggul.',
    'Kaki lurus dan rapat.',
    'Angkat kaki hingga tegak lurus lantai.',
    'Turunkan perlahan tanpa menyentuh lantai.',
  ], [
    'Punggung bawah tetap menempel di lantai.',
    'Tekuk lutut bila punggung bawah terangkat.',
  ]),
  ex('bicycle-crunch', 'Bicycle Crunch', 'Perut, Obliques', 'Bodyweight', 'Pemula', [
    'Berbaring telentang, tangan di samping kepala, lutut terangkat 90°.',
    'Angkat bahu dari lantai.',
    'Putar badan, bawa siku kanan ke lutut kiri sambil meluruskan kaki kanan.',
    'Ganti sisi dalam gerakan seperti mengayuh sepeda.',
  ], [
    'Jangan menarik leher dengan tangan.',
    'Gerakan lambat dan terkontrol lebih efektif.',
  ]),
  ex('superman', 'Superman Hold', 'Punggung bawah, Glutes', 'Bodyweight', 'Pemula', [
    'Berbaring tengkurap dengan lengan lurus di depan.',
    'Angkat lengan, dada, dan kaki bersamaan dari lantai.',
    'Tahan 2–3 detik sambil meremas bokong.',
    'Turunkan perlahan.',
  ], [
    'Pandangan ke lantai agar leher netral.',
    'Jangan mengangkat terlalu tinggi secara paksa.',
  ]),

  // ───────── Kardio / HIIT ─────────
  ex('burpee', 'Burpee', 'Seluruh badan, Kardio', 'Bodyweight', 'Menengah', [
    'Berdiri tegak dengan kaki selebar bahu.',
    'Jongkok dan letakkan tangan di lantai.',
    'Lompatkan kaki ke belakang ke posisi plank (opsional: lakukan push-up).',
    'Lompatkan kaki kembali ke dekat tangan.',
    'Melompat ke atas dengan tangan terangkat.',
  ], [
    'Pemula: langkahkan kaki ke belakang tanpa melompat.',
    'Mendarat dengan lembut, lutut sedikit ditekuk.',
    'Jaga pinggul tidak turun saat posisi plank.',
  ]),
  ex('mountain-climber', 'Mountain Climber', 'Core, Bahu, Kardio', 'Bodyweight', 'Pemula', [
    'Mulai dari posisi plank tinggi, tangan di bawah bahu.',
    'Tarik satu lutut ke arah dada.',
    'Kembalikan kaki dan tarik lutut lainnya dengan cepat.',
    'Ulangi bergantian dengan ritme seperti berlari.',
  ], [
    'Pinggul tetap rendah, sejajar bahu.',
    'Bahu tetap di atas tangan.',
  ]),
  ex('jumping-jack', 'Jumping Jack', 'Seluruh badan, Kardio', 'Bodyweight', 'Pemula', [
    'Berdiri tegak, kaki rapat, tangan di samping.',
    'Lompat sambil membuka kaki dan mengangkat tangan ke atas kepala.',
    'Lompat kembali ke posisi awal.',
    'Ulangi dengan ritme stabil.',
  ], [
    'Mendarat di ujung kaki dengan lembut.',
    'Versi low impact: langkahkan kaki ke samping bergantian.',
  ]),
  ex('high-knees', 'High Knees', 'Kaki, Core, Kardio', 'Bodyweight', 'Pemula', [
    'Berdiri tegak dengan kaki selebar pinggul.',
    'Lari di tempat sambil mengangkat lutut setinggi pinggul.',
    'Ayunkan lengan berlawanan dengan kaki.',
    'Pertahankan tempo cepat.',
  ], [
    'Mendarat di ujung kaki.',
    'Badan tegak, jangan condong ke belakang.',
  ]),
  ex('butt-kicks', 'Butt Kicks', 'Hamstring, Kardio', 'Bodyweight', 'Pemula', [
    'Berdiri tegak dan mulai lari di tempat.',
    'Tendang tumit ke arah bokong setiap langkah.',
    'Ayunkan lengan secara alami.',
    'Jaga tempo cepat dan ringan.',
  ], [
    'Lutut tetap mengarah ke bawah.',
    'Cocok sebagai pemanasan dinamis.',
  ]),
  ex('jump-squat', 'Jump Squat', 'Paha, Glutes, Kardio', 'Bodyweight', 'Menengah', [
    'Berdiri dengan kaki selebar bahu.',
    'Lakukan squat hingga paha hampir sejajar lantai.',
    'Lompat setinggi mungkin secara eksplosif.',
    'Mendarat lembut dan langsung masuk ke squat berikutnya.',
  ], [
    'Mendarat dengan lutut sedikit ditekuk untuk meredam benturan.',
    'Lutut jangan jatuh ke dalam saat mendarat.',
  ]),
  ex('skater-jump', 'Skater Jump', 'Kaki, Glutes, Keseimbangan, Kardio', 'Bodyweight', 'Menengah', [
    'Berdiri dengan satu kaki, lutut sedikit ditekuk.',
    'Lompat ke samping dan mendarat dengan kaki lainnya.',
    'Silangkan kaki belakang di belakang kaki tumpuan.',
    'Lompat kembali ke sisi lain dan ulangi.',
  ], [
    'Mulai dengan lompatan pendek, perlebar bertahap.',
    'Mendarat dengan lembut dan stabil.',
  ]),
  ex('plank-jack', 'Plank Jack', 'Core, Bahu, Kardio', 'Bodyweight', 'Pemula', [
    'Mulai di posisi plank tinggi atau plank lengan bawah.',
    'Lompatkan kedua kaki ke samping.',
    'Lompatkan kembali ke posisi rapat.',
    'Jaga pinggul tetap stabil.',
  ], [
    'Jangan biarkan pinggul naik turun.',
    'Kencangkan perut sepanjang gerakan.',
  ]),
  ex('battle-rope', 'Battle Rope Waves', 'Bahu, Lengan, Core, Kardio', 'Battle Rope', 'Menengah', [
    'Pegang ujung tali dengan kedua tangan, kaki selebar bahu, lutut sedikit ditekuk.',
    'Condong sedikit ke depan, punggung lurus.',
    'Ayunkan lengan naik-turun bergantian dengan cepat membuat gelombang.',
    'Pertahankan ritme selama interval.',
  ], [
    'Tenaga dari bahu dan core, bukan punggung bawah.',
    'Tetap dalam posisi setengah jongkok.',
  ]),
  ex('rowing-machine', 'Rowing Machine', 'Seluruh badan, Kardio', 'Machine', 'Pemula', [
    'Duduk dan kunci kaki di pijakan, pegang handle dengan lengan lurus.',
    'Dorong dengan kaki terlebih dahulu.',
    'Setelah kaki hampir lurus, condong sedikit ke belakang lalu tarik handle ke perut.',
    'Kembali dengan urutan terbalik: lengan, badan, lalu tekuk lutut.',
  ], [
    'Urutan: kaki – badan – lengan, lalu kebalikannya.',
    'Jangan membungkuk; punggung tetap lurus.',
  ]),
  ex('incline-treadmill-walk', 'Incline Treadmill Walk', 'Kaki, Glutes, Kardio', 'Machine', 'Pemula', [
    'Atur kemiringan treadmill 8–12% dan kecepatan 4–6 km/jam.',
    'Berjalan tegak dengan langkah alami.',
    'Ayunkan lengan dan jangan berpegangan pada handle.',
    'Pertahankan intensitas sedang (masih bisa bicara pendek).',
  ], [
    'Berpegangan pada handle mengurangi efektivitas latihan.',
    'Kardio intensitas rendah ini cocok setelah sesi beban.',
  ]),
];

// ───────── Helper untuk menyusun program ─────────
const E = (exerciseId, sets, reps, restSec, note = '') => ({ exerciseId, sets, reps, restSec, note });

const WARMUP_GYM_UPPER = [
  '5 menit kardio ringan (rowing/sepeda)',
  'Arm circles & band pull-apart 2x15',
  'Rotasi bahu dan thoracic 10x per sisi',
  '2 set pemanasan ringan latihan pertama',
];
const WARMUP_GYM_LOWER = [
  '5 menit kardio ringan (sepeda/treadmill)',
  'Leg swing depan-belakang & samping 10x per kaki',
  'Bodyweight squat 15x dan hip hinge 10x',
  '2 set pemanasan ringan latihan pertama',
];
const WARMUP_HOME = [
  'Jumping jack 1 menit',
  'Arm circles 30 detik per arah',
  'Bodyweight squat 15x',
  'Inchworm 5x',
];
const WARMUP_HIIT = [
  'Jalan/lari di tempat 1 menit',
  'Butt kicks 30 detik',
  'Leg swing 10x per kaki',
  'Hip circles & arm circles 30 detik',
];
const COOLDOWN_UPPER = [
  'Stretching dada di pintu 30 detik per sisi',
  'Stretching lats & trisep 30 detik per sisi',
  'Napas dalam 1 menit',
];
const COOLDOWN_LOWER = [
  'Stretching hamstring 30 detik per kaki',
  'Stretching quad berdiri 30 detik per kaki',
  'Pigeon stretch 30 detik per sisi',
];
const COOLDOWN_FULL = [
  'Jalan santai 2–3 menit',
  'Stretching seluruh badan (child pose, hamstring, dada) 3 menit',
  'Napas dalam 1 menit',
];

export const PROGRAMS = [
  // 1. Push Pull Legs (Gym)
  {
    id: 'ppl-gym',
    name: 'Push Pull Legs (Gym)',
    goal: 'muscle',
    location: 'gym',
    level: 'Menengah',
    description: 'Program klasik membangun otot 6 hari per minggu. Setiap kelompok otot dilatih 2x seminggu dengan volume tinggi. Cocok untuk kamu yang sudah terbiasa nge-gym minimal 6 bulan.',
    days: [
      {
        id: 'ppl-gym-push', name: 'Push', focus: 'Dada, Bahu, Trisep',
        warmup: WARMUP_GYM_UPPER, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('bench-press', 4, '6-8', 150, 'Latihan utama — tambah beban bila semua reps tercapai.'),
          E('overhead-press', 3, '8-10', 120),
          E('incline-dumbbell-press', 3, '10-12', 90),
          E('lateral-raise', 4, '12-15', 60, 'Beban ringan, kontrol penuh.'),
          E('cable-fly', 3, '12-15', 60),
          E('tricep-pushdown', 3, '10-12', 60),
          E('overhead-tricep-extension', 3, '10-12', 60),
        ],
      },
      {
        id: 'ppl-gym-pull', name: 'Pull', focus: 'Punggung, Bisep, Bahu belakang',
        warmup: WARMUP_GYM_UPPER, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('deadlift', 3, '5', 180, 'Prioritaskan teknik, punggung tetap lurus.'),
          E('pull-up', 3, '6-10', 120, 'Pakai assisted bila perlu.'),
          E('barbell-row', 3, '8-10', 120),
          E('seated-cable-row', 3, '10-12', 90),
          E('face-pull', 3, '15', 60),
          E('barbell-curl', 3, '8-10', 60),
          E('hammer-curl', 3, '10-12', 60),
        ],
      },
      {
        id: 'ppl-gym-legs', name: 'Legs', focus: 'Paha, Glutes, Hamstring, Betis',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_LOWER,
        exercises: [
          E('back-squat', 4, '6-8', 180, 'Turun minimal sejajar.'),
          E('romanian-deadlift', 3, '8-10', 120),
          E('leg-press', 3, '10-12', 90),
          E('leg-curl', 3, '10-12', 60),
          E('leg-extension', 3, '12-15', 60),
          E('calf-raise', 4, '12-15', 45),
        ],
      },
    ],
    defaultSchedule: { 0: null, 1: 'ppl-gym-push', 2: 'ppl-gym-pull', 3: 'ppl-gym-legs', 4: 'ppl-gym-push', 5: 'ppl-gym-pull', 6: 'ppl-gym-legs' },
  },

  // 2. Upper/Lower 4 hari
  {
    id: 'upper-lower-gym',
    name: 'Upper/Lower 4 Hari (Gym)',
    goal: 'strength',
    location: 'gym',
    level: 'Menengah',
    description: 'Kombinasi kekuatan dan hipertrofi: 2 hari upper body dan 2 hari lower body. Hari A fokus beban berat (reps rendah), hari B fokus volume. Ideal untuk jadwal sibuk dengan hasil maksimal.',
    days: [
      {
        id: 'upper-lower-gym-upper-a', name: 'Upper A (Kekuatan)', focus: 'Dada, Punggung, Bahu',
        warmup: WARMUP_GYM_UPPER, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('bench-press', 4, '5', 180, 'Beban berat, istirahat cukup.'),
          E('barbell-row', 4, '5-6', 150),
          E('overhead-press', 3, '6-8', 120),
          E('pull-up', 3, '6-8', 120),
          E('barbell-curl', 2, '8-10', 60),
          E('tricep-pushdown', 2, '10-12', 60),
        ],
      },
      {
        id: 'upper-lower-gym-lower-a', name: 'Lower A (Kekuatan)', focus: 'Paha depan, Glutes',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_LOWER,
        exercises: [
          E('back-squat', 4, '5', 180, 'Bracing kuat setiap repetisi.'),
          E('romanian-deadlift', 3, '6-8', 150),
          E('leg-press', 3, '8-10', 120),
          E('calf-raise', 4, '10-12', 60),
          E('plank', 3, '45 detik', 45),
        ],
      },
      {
        id: 'upper-lower-gym-upper-b', name: 'Upper B (Volume)', focus: 'Dada atas, Punggung, Lengan',
        warmup: WARMUP_GYM_UPPER, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('incline-dumbbell-press', 4, '8-12', 90),
          E('lat-pulldown', 4, '10-12', 90),
          E('dumbbell-shoulder-press', 3, '10-12', 90),
          E('seated-cable-row', 3, '10-12', 90),
          E('lateral-raise', 3, '15', 60),
          E('hammer-curl', 3, '12', 60),
          E('overhead-tricep-extension', 3, '12', 60),
        ],
      },
      {
        id: 'upper-lower-gym-lower-b', name: 'Lower B (Volume)', focus: 'Hamstring, Glutes, Paha',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_LOWER,
        exercises: [
          E('deadlift', 3, '5', 180, 'Teknik lebih penting dari beban.'),
          E('bulgarian-split-squat', 3, '10 per kaki', 90),
          E('hip-thrust', 3, '10-12', 90),
          E('leg-curl', 3, '12', 60),
          E('leg-extension', 3, '12-15', 60),
          E('hanging-leg-raise', 3, '10-12', 60),
        ],
      },
    ],
    defaultSchedule: { 0: null, 1: 'upper-lower-gym-upper-a', 2: 'upper-lower-gym-lower-a', 3: null, 4: 'upper-lower-gym-upper-b', 5: 'upper-lower-gym-lower-b', 6: null },
  },

  // 3. Full Body Pemula
  {
    id: 'fullbody-beginner-gym',
    name: 'Full Body Pemula (Gym)',
    goal: 'general',
    location: 'gym',
    level: 'Pemula',
    description: 'Titik awal terbaik untuk pemula: 3x seminggu (Senin, Rabu, Jumat) dengan dua sesi A/B bergantian. Fokus belajar teknik gerakan dasar dan membangun kebiasaan rutin.',
    days: [
      {
        id: 'fullbody-beginner-gym-a', name: 'Full Body A', focus: 'Seluruh badan (squat & press)',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_FULL,
        exercises: [
          E('goblet-squat', 3, '10-12', 90, 'Fokus kedalaman dan dada tegak.'),
          E('dumbbell-bench-press', 3, '10-12', 90),
          E('lat-pulldown', 3, '10-12', 90),
          E('dumbbell-shoulder-press', 2, '10-12', 75),
          E('glute-bridge', 2, '15', 60),
          E('plank', 3, '30 detik', 45),
        ],
      },
      {
        id: 'fullbody-beginner-gym-b', name: 'Full Body B', focus: 'Seluruh badan (hinge & row)',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_FULL,
        exercises: [
          E('leg-press', 3, '10-12', 90),
          E('dumbbell-rdl', 3, '10-12', 90, 'Rasakan regangan di hamstring.'),
          E('seated-cable-row', 3, '10-12', 90),
          E('incline-push-up', 3, '8-12', 60),
          E('dumbbell-curl', 2, '12', 60),
          E('tricep-pushdown', 2, '12', 60),
          E('side-plank', 2, '20 detik per sisi', 45),
        ],
      },
    ],
    defaultSchedule: { 0: null, 1: 'fullbody-beginner-gym-a', 2: null, 3: 'fullbody-beginner-gym-b', 4: null, 5: 'fullbody-beginner-gym-a', 6: null },
  },

  // 4. Home Muscle Building
  {
    id: 'home-muscle',
    name: 'Home Muscle Building',
    goal: 'muscle',
    location: 'home',
    level: 'Pemula',
    description: 'Bangun otot di rumah dengan bodyweight, ditambah dumbbell opsional. Struktur Push / Pull / Legs & Core, 5 hari seminggu. Tingkatkan kesulitan dengan menambah reps, tempo lambat, atau beban.',
    days: [
      {
        id: 'home-muscle-push', name: 'Push (Rumah)', focus: 'Dada, Bahu, Trisep',
        warmup: WARMUP_HOME, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('push-up', 4, '10-15', 75, 'Tempo turun 3 detik untuk lebih berat.'),
          E('pike-push-up', 3, '8-12', 75),
          E('incline-push-up', 3, '12-15', 60),
          E('dumbbell-shoulder-press', 3, '10-12', 60, 'Opsional: ganti botol air/ransel bila tidak ada dumbbell.'),
          E('diamond-push-up', 3, '8-12', 60),
          E('bench-dip', 3, '12-15', 60),
        ],
      },
      {
        id: 'home-muscle-pull', name: 'Pull (Rumah)', focus: 'Punggung, Bisep',
        warmup: WARMUP_HOME, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('pull-up', 4, 'AMRAP', 120, 'Tanpa bar? Ganti dengan inverted row.'),
          E('inverted-row', 3, '10-12', 75),
          E('dumbbell-row', 3, '10-12 per sisi', 60),
          E('rear-delt-fly', 3, '12-15', 60),
          E('dumbbell-curl', 3, '10-12', 60),
          E('superman', 3, '12', 45),
        ],
      },
      {
        id: 'home-muscle-legs-core', name: 'Legs & Core (Rumah)', focus: 'Paha, Glutes, Perut',
        warmup: WARMUP_HOME, cooldown: COOLDOWN_LOWER,
        exercises: [
          E('bulgarian-split-squat', 4, '10-12 per kaki', 90, 'Gunakan kursi atau sofa sebagai pijakan.'),
          E('goblet-squat', 3, '12-15', 75),
          E('single-leg-rdl', 3, '10 per kaki', 60),
          E('glute-bridge', 3, '15-20', 60),
          E('calf-raise', 3, '15-20', 45, 'Lakukan di tepi anak tangga.'),
          E('lying-leg-raise', 3, '12-15', 45),
          E('plank', 3, '45 detik', 45),
        ],
      },
    ],
    defaultSchedule: { 0: null, 1: 'home-muscle-push', 2: 'home-muscle-pull', 3: 'home-muscle-legs-core', 4: null, 5: 'home-muscle-push', 6: 'home-muscle-pull' },
  },

  // 5. Fat Loss HIIT di Rumah
  {
    id: 'fatloss-hiit-home',
    name: 'Fat Loss HIIT di Rumah',
    goal: 'fatloss',
    location: 'home',
    level: 'Pemula',
    description: 'Bakar lemak tanpa alat, 5 hari seminggu, sekitar 25–30 menit per sesi. Format interval: kerja 30–45 detik, istirahat singkat. Kombinasikan dengan defisit kalori untuk hasil optimal.',
    days: [
      {
        id: 'fatloss-hiit-home-fullbody', name: 'HIIT Full Body', focus: 'Seluruh badan, Kardio',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_FULL,
        exercises: [
          E('jumping-jack', 4, '40 detik', 20),
          E('bodyweight-squat', 4, '40 detik', 20),
          E('push-up', 4, '30 detik', 30, 'Boleh dengan lutut.'),
          E('mountain-climber', 4, '40 detik', 20),
          E('burpee', 4, '30 detik', 30),
        ],
      },
      {
        id: 'fatloss-hiit-home-lower', name: 'HIIT Lower Body', focus: 'Kaki, Glutes, Kardio',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_LOWER,
        exercises: [
          E('jump-squat', 4, '30 detik', 30, 'Ganti squat biasa bila lutut tidak nyaman.'),
          E('reverse-lunge', 4, '40 detik', 20),
          E('skater-jump', 4, '30 detik', 30),
          E('glute-bridge', 4, '40 detik', 20),
          E('high-knees', 4, '30 detik', 30),
        ],
      },
      {
        id: 'fatloss-hiit-home-core', name: 'HIIT Core & Kardio', focus: 'Perut, Core, Kardio',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_FULL,
        exercises: [
          E('mountain-climber', 4, '40 detik', 20),
          E('plank-jack', 4, '30 detik', 20),
          E('bicycle-crunch', 4, '40 detik', 20),
          E('high-knees', 4, '30 detik', 20),
          E('plank', 3, '45 detik', 30),
          E('side-plank', 2, '30 detik per sisi', 20),
        ],
      },
      {
        id: 'fatloss-hiit-home-upper', name: 'HIIT Upper Body', focus: 'Dada, Bahu, Lengan, Kardio',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('push-up', 4, '30 detik', 30),
          E('jumping-jack', 4, '40 detik', 20),
          E('pike-push-up', 4, '30 detik', 30),
          E('bench-dip', 4, '30 detik', 20),
          E('burpee', 3, '30 detik', 30),
        ],
      },
      {
        id: 'fatloss-hiit-home-tabata', name: 'Tabata Finisher', focus: 'Kardio intensitas tinggi',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_FULL,
        exercises: [
          E('burpee', 8, '20 detik', 15, 'Format Tabata: kerja 20 detik maksimal.'),
          E('jump-squat', 8, '20 detik', 15),
          E('mountain-climber', 8, '20 detik', 15),
          E('butt-kicks', 4, '30 detik', 15),
        ],
      },
    ],
    defaultSchedule: { 0: null, 1: 'fatloss-hiit-home-fullbody', 2: 'fatloss-hiit-home-lower', 3: null, 4: 'fatloss-hiit-home-core', 5: 'fatloss-hiit-home-upper', 6: 'fatloss-hiit-home-tabata' },
  },

  // 6. Fat Loss Gym
  {
    id: 'fatloss-gym',
    name: 'Fat Loss Gym',
    goal: 'fatloss',
    location: 'gym',
    level: 'Menengah',
    description: 'Pertahankan otot sambil membakar lemak: latihan beban compound dipadukan dengan sirkuit conditioning dan kardio. 5 hari seminggu dengan istirahat lebih singkat untuk menjaga detak jantung tetap tinggi.',
    days: [
      {
        id: 'fatloss-gym-upper', name: 'Upper Strength + Finisher', focus: 'Dada, Punggung, Bahu',
        warmup: WARMUP_GYM_UPPER, cooldown: COOLDOWN_UPPER,
        exercises: [
          E('bench-press', 4, '6-8', 120),
          E('barbell-row', 4, '8', 90),
          E('dumbbell-shoulder-press', 3, '10', 75),
          E('lat-pulldown', 3, '10-12', 60),
          E('battle-rope', 4, '30 detik', 30, 'Finisher: kerja maksimal.'),
        ],
      },
      {
        id: 'fatloss-gym-lower', name: 'Lower Strength + Finisher', focus: 'Paha, Glutes, Hamstring',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_LOWER,
        exercises: [
          E('back-squat', 4, '6-8', 120),
          E('romanian-deadlift', 3, '8-10', 90),
          E('dumbbell-lunge', 3, '10 per kaki', 75),
          E('leg-curl', 3, '12', 60),
          E('kettlebell-swing', 4, '15', 30, 'Finisher: eksplosif dari pinggul.'),
        ],
      },
      {
        id: 'fatloss-gym-circuit-a', name: 'Metabolic Circuit A', focus: 'Seluruh badan, Conditioning',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_FULL,
        exercises: [
          E('dumbbell-thruster', 4, '12', 30, 'Lakukan sebagai sirkuit: pindah langsung ke latihan berikutnya.'),
          E('kettlebell-swing', 4, '15', 30),
          E('push-up', 4, '12-15', 30),
          E('dumbbell-row', 4, '12 per sisi', 30),
          E('burpee', 4, '10', 30),
          E('rowing-machine', 1, '5 menit', 60, 'Penutup kardio intensitas sedang.'),
        ],
      },
      {
        id: 'fatloss-gym-circuit-b', name: 'Metabolic Circuit B', focus: 'Kaki, Core, Conditioning',
        warmup: WARMUP_HIIT, cooldown: COOLDOWN_FULL,
        exercises: [
          E('goblet-squat', 4, '15', 30, 'Sirkuit: minim istirahat antar latihan.'),
          E('mountain-climber', 4, '40 detik', 20),
          E('dumbbell-rdl', 4, '12', 30),
          E('jump-squat', 4, '30 detik', 30),
          E('hanging-leg-raise', 3, '10-12', 30),
          E('battle-rope', 4, '30 detik', 30),
        ],
      },
      {
        id: 'fatloss-gym-cardio', name: 'Full Body + LISS', focus: 'Seluruh badan, Kardio ringan',
        warmup: WARMUP_GYM_LOWER, cooldown: COOLDOWN_FULL,
        exercises: [
          E('deadlift', 3, '5', 150, 'Beban sedang, teknik sempurna.'),
          E('incline-dumbbell-press', 3, '10-12', 75),
          E('seated-cable-row', 3, '12', 60),
          E('face-pull', 3, '15', 45),
          E('incline-treadmill-walk', 1, '25 menit', 60, 'LISS: intensitas sedang, masih bisa bicara.'),
        ],
      },
    ],
    defaultSchedule: { 0: null, 1: 'fatloss-gym-upper', 2: 'fatloss-gym-circuit-a', 3: 'fatloss-gym-lower', 4: null, 5: 'fatloss-gym-circuit-b', 6: 'fatloss-gym-cardio' },
  },
];
