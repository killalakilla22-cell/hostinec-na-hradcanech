# Hostinec na Hradčanech — Website Profil Restoran

Website profil satu halaman (one-page) untuk **Hostinec na Hradčanech**, Rokycany, Republik Ceko.
Desain terinspirasi dari [rusters.com](https://rusters.com/whats-on/) — minimalis, earthy, tipografi tebal uppercase.

**Dibangun dengan Bootstrap 5.3** (via CDN) + satu file CSS tema custom di atasnya.

## Komponen Bootstrap yang dipakai

| Bagian | Komponen Bootstrap |
|---|---|
| Layout semua section | Grid (`container`, `row`, `col-*`, `g-5`, `row-cols-*`) |
| Navbar sticky + menu mobile | `navbar navbar-expand-lg sticky-top` + **Offcanvas** |
| Penanda menu aktif saat scroll | **ScrollSpy** (`data-bs-spy="scroll"` di `<body>`) |
| Preview gambar (menu & galeri) | **Modal** (`#imageModal`, src gambar diisi via `data-img`) |
| Rasio galeri & peta | `ratio ratio-1x1` / `ratio-4x3` + `object-fit-cover` |
| Tombol | `.btn` + skin custom `btn-cream` / `btn-outline-cream` / `btn-ink` (CSS variables `--bs-btn-*`) |
| Responsive utilities | `d-none d-md-block`, `d-grid`, `order-lg-*`, `flex-*`, dll. |

Butuh internet untuk memuat Bootstrap CDN, Google Fonts, dan Google Maps.
Kalau mau full offline, download `bootstrap.min.css` + `bootstrap.bundle.min.js` lalu arahkan `<link>`/`<script>` di `index.html` ke file lokal.

## Cara menjalankan

Tidak perlu build/instalasi apa pun — ini website statis murni.

- **Cara termudah:** klik dua kali `index.html` (terbuka di browser).
- **Dengan server lokal (disarankan agar font & map loading lancar):**
  ```powershell
  cd "C:\Users\eland\Downloads\website designer"
  python -m http.server 8000
  # lalu buka http://localhost:8000
  ```

## Struktur file

```
index.html          → seluruh konten halaman (bahasa Ceko), markup Bootstrap
css/style.css       → tema custom DI ATAS Bootstrap (warna, font, komponen khas)
js/main.js          → animasi reveal, shadow navbar, isi gambar modal
favicon.svg         → ikon tab browser
images/             → foto asli venue (di-download dari situs resmi)
  exterier.jpg          → fasad gedung (hero)
  exterier-ulice.jpg    → fasad lama dari jalan (bagian "Náš příběh")
  interier.jpg          → interior lokal (příběh + galeri)
  zahradka-1.jpg        → zahrádka (dinding ivy)
  zahradka-2.jpg        → zahrádka (tumpukan kayu)
  zahradka-kvetiny.jpg  → zahrádka (bunga, galeri)
  pivo-1.jpg            → menuang bir (galeri)
  pivo-2.jpg            → keran bir (banner kutipan)
  jidelni-listek.png    → menu harian asli (tombol "Zobrazit lístek")
  napoje1.png/2.png     → scan menu minuman asli (arsip/sumber data)
```

## Bagian halaman (sesuai permintaan)

| Section | ID anchor | Isi |
|---|---|---|
| Úvod | `#uvod` | Hero + pernyataan pembuka + kartu info |
| Náš příběh | `#pribeh` | Sejarah sejak 1890 (teks asli yang diberikan) |
| Jídelní lístek | `#jidelni-listek` | Menu harian Rabu 10 Juni 2026 (dari gambar menu) |
| Nápojový lístek | `#napojovy-listek` | Menu minuman lengkap (diekstrak dari menu resmi) |
| Zahrádka | `#zahradka` | Teks ajakan zahrádka (teks asli yang diberikan) |
| Kde nás najdete | `#kontakt` | Alamat, telepon, email, jam buka + Google Maps |

## Data yang dipakai (sumber)

- **Menu makanan**: gambar jídelní lístek (Středa 10. června 2026).
- **Menu minuman**: diekstrak dari gambar nápojový lístek di situs resmi
  (`hostinec-na-hradcanech.cz/vina/`). Dua koreksi kecil dari menu cetak:
  "Johnnie Walket" → *Johnnie Walker*, dan ukuran destiláty "0,2 l / 0,4 l"
  → *0,02 l / 0,04 l* (2 cl / 4 cl, sesuai standar — di menu cetak tampak typo).
  Ubah kembali di `index.html` bila ingin persis seperti menu cetak.
- **Jam buka & email**: halaman kontak situs resmi
  (Po–Pá 10:00–22:00, So–Ne 14:00–22:00, dapur hari kerja 10:00–14:00).
- **Telepon**: `+420 735 076 713` (sesuai yang tercetak di jídelní lístek).
  ⚠️ Halaman kontak situs lama menulis `734 076 713` — satu digit berbeda.
  Mohon verifikasi nomor yang benar, lalu cari-ganti di `index.html` bila perlu.

## Cara update menu harian

Menu harian berubah setiap hari. Untuk memperbarui:
1. Buka `index.html`, cari `<!-- ======= JÍDELNÍ LÍSTEK ======= -->`.
2. Ubah tanggal di `<p class="menu__date">`.
3. Edit item di dalam `menu-list` (pola: jumlah / nama / harga).
4. Ganti `images/jidelni-listek.png` dengan scan menu terbaru (nama file sama).

## Kustomisasi cepat

- **Warna**: ubah variabel di bagian atas `css/style.css` (`--cream`, `--ink`, `--amber`).
- **Font**: Archivo (judul), Inter (teks), Cormorant Garamond (aksen italic) — dimuat dari Google Fonts.
- **Peta**: iframe Google Maps di section `#kontakt` (query alamat, tanpa API key).
