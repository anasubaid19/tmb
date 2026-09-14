# Setup Spreadsheet + Apps Script (sekali saja)

Struktur sheet yang dipakai = model **FLAT**. Contoh tampilannya ada di file
`STRUKTUR SHEET DATABASE (GAS).xlsx` (tab `PETUNJUK` → `siswa`).

## 1. Siapkan spreadsheet

1. Buat Google Sheet baru (akun Google sekolah) — mis. "TMB Database".
   Ini yang menjadi **output database** aplikasi.
2. **Kosongkan** spreadsheet-nya (sheet default `Sheet1` boleh dibiarkan;
   `setupSheets` akan membuat sheet-sheet baru dengan nama persis skema).

## 2. Pasang script

1. Di spreadsheet: **Extensions > Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel seluruh isi `Code.gs` dari folder ini.
3. Simpan (Ctrl/Cmd+S).

## 3. Buat sheet + header otomatis

1. Di editor Apps Script, pilih fungsi **`setupSheets`** lalu **Run**.
2. Setujui izin (akun sekolah) saat diminta.
3. Kembali ke spreadsheet — **12 sheet sudah terbuat** dengan header, plus
   `materi` (5 materi ujian) dan `cabang` (AW1–AW4) ter-seed otomatis.

> `setupSheets` aman dijalankan ulang: tidak menimpa sheet/baris yang sudah ada.

## 4. Set token API

1. Di editor Apps Script: **Project Settings (ikon gerigi) > Script Properties > Add script property**.
2. Property: `API_TOKEN`, Value: string acak panjang.
3. Save.

## 5. Deploy sebagai Web App

1. **Deploy > New deployment > Web app**.
2. **Execute as**: `Me` (akun sekolah). **Who has access**: `Anyone`.
3. **Deploy**, salin **Web app URL**.

## 5b. Hubungkan aplikasi ke GAS (dua cara)

Cara **A — via CMS admin (disarankan)**:
1. Login admin di aplikasi (mode mock awal → akun `ADMIN-01` / `ADMIN-02`,
   password `admin123`).
2. Buka **Admin > Pengaturan > Koneksi GAS**.
3. Tempel **URL deploy** + **API_TOKEN** (harus sama dgn Script Properties),
   klik **Simpan & aktifkan**.
4. App langsung beralih dari mode mock → produksi. Konfigurasi tersimpan
   lokal di `server/gas-settings.json` (bukan di spreadsheet — karena app
   butuh URL untuk membaca spreadsheet).

Cara **B — via `.env`** (alternatif):
- Isi `GAS_URL` + `GAS_TOKEN` di `.env`. `.env` menang atas file lokal bila
  keduanya terisi.

## 6. Isi data (manual di spreadsheet, atau via CMS)

### Aturan `id` — GAS generate otomatis

Saat baris ditambahkan lewat API (`append`) dan kolom `id` dikosongkan, GAS
mengisi `id` otomatis (numerik, `max+1` per sheet). **Tidak perlu diisi manual.**

Ada **dua kelompok sheet**, dan ini penting:

| Kelompok | Sheet | `id` dipakai sebagai? | Isi `id` |
|---|---|---|---|
| **Referensi** (id = kunci bisnis, di-referensi sheet lain) | `cabang`, `kelas`, `materi`, `penguji` | `siswa.cabang_id`, `jadwal.materi_id/kelas_id/penguji_id`, `users.ref_id` | **Wajib manual & stabil** — `AW1`, `K1`, `M1`, `P1`, dst. GAS tidak boleh generate angka acak di sini |
| **Baris data** (id internal saja) | `siswa`, `kedatangan`, `pengumuman`, `lembar`, `config`, `denah` | hanya untuk operasi `update` | **Biarkan GAS generate** — kosongkan saat input |

> Ringkasnya: `cabang/kelas/materi/penguji` diisi manual (id deskriptif),
> sisanya biarkan GAS mengisi `id` numerik otomatis.

### Model FLAT — poin penting
- **`siswa` = SATU sheet semua cabang**, dibedakan kolom `cabang_id`
  (bukan per-tab AW1/AW2/…). Tambah cabang baru (mis. AW5) = tambah baris
  di `cabang` + baris siswa dengan `cabang_id` baru. **Tanpa tab baru.**
- **Kolom nilai ada di baris siswa** (`nilai_calistung_math`,
  `nilai_english`, `nilai_arabic`, `nilai_quran`, `nilai_ortu`).
  Ini satu-satunya sumber nilai — diisi langsung di sheet (penguji/manajemen)
  atau lewat CMS; keduanya tersinkron karena sama-sama baca/tulis sheet.
  - Calistung (SD) / Math (SMP, SMA)
  - Interview English/Arabic/Al-Qur'an (semua jenjang)
  - Interview Orangtua (penguji = manajemen)
- **`users`**: satu sheet semua role (`role`: admin|panitia|penguji).
  - **Password admin = PLAINTEXT**, bisa diubah langsung di sheet.
  - `kode` = username login: admin login `kode`+`password`,
    panitia/penguji login `kode` saja.
  - Sheet `users` **tidak punya kolom `id`** — kuncinya kolom `kode`.
    `ref_id` = `id` penguji (mis. `P1`) untuk role penguji.

### Contoh isi minimal
- `cabang`: AW1/AW3/AW4 (`portal=TRUE` untuk AW3, `landing=TRUE` untuk 3 utama) — sudah ter-seed.
- `materi`: M1..M5 — sudah ter-seed.
- `config`: `show_jadwal=TRUE`, `umumkan_hasil=FALSE`, dsb.
- `users`: kode + nama + role + password (admin). Contoh:
  - `ADMIN-01 | Anas Ubaid | admin | <password> |`
  - `P101 | Ahmad Hidayat | penguji |  | P1`
  - `SCAN-01 | Teti Sunarwati | panitia |  |`
- `penguji`: id + kode + nama + cabang_id + kontak. `id` manual (`P1`),
  `kode` manual (`P101`).
- `siswa`, `kelas`, `jadwal`, `denah`, dst. — sesuai data panitia.
  - `siswa.id` = **biarkan GAS generate**; `kode` siswa = `{CABANG}-{HURUF}{SEQ}`
    (SD=A, SMP=B, SMA=C, Kinder=K), mis. `AW1-A001`. Saat daftar on-the-spot
    lewat aplikasi, `kode` dihitung app dan `id` diisi GAS.
  - `kelas.id` manual (`K1`), `jadwal.id` manual (`J1`), `denah.id` manual (`D1`).

## Catatan

- Semua tulis (`append`/`update`) dikunci `LockService` 30 detik di sisi GAS; client melakukan retry + backoff.
- baca publik (`read` via GET) tidak memakai lock — aman untuk traffic landing.
- Lookup sensitif (no. HP, kode) selalu via POST agar tidak tercatat di URL log.
- Perubahan manual di spreadsheet langsung terlihat aplikasi pada read berikutnya (cache aplikasi 60 dtk / 2 dtk untuk feed scanner).