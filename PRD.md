# PRD — Landing Page "Tes Masuk Bersama" AL-WILDAN ISLAMIC SCHOOL

- **Versi**: 1.0 (final)
- **Tanggal**: 11 September 2026
- **Acara**: Ahad, 20 September 2026 (kinder/PG-TK ujian 19 — internal, tak diekspos)
- **Freeze pengembangan**: Jumat, 18 September 2026

---

## 1. Executive Summary

**Problem**: Tes masuk hampir seluruh cabang AL-WILDAN ISLAMIC SCHOOL, terpusat di Al-Wildan 3 BSD City. Informasi (jadwal, kelas, materi, denah, penguji), penilaian, kehadiran, dan berita acara serah terima (BAST) selama ini dicatat manual — sulit dilacak dan rawan kehilangan data menjelang acara (tinggal 8 hari).

**Solution**: Satu web app multi-cabang: landing publik + portal siswa/wali murid (W-ticket QR, BAST) + portal penguji (soal, nilai, foto arsip) + portal panitia/admin (scan kehadiran realtime, daftar on-the-spot, rekap, umumkan hasil) + ekspor BAST. Database = Google Sheets yang diakses melalui Google Apps Script (spreadsheet sebagai database). Di-deploy self-host dengan domain sendiri.

**Success Criteria (KPI)**:
- 100% nilai seluruh siswa terinput lewat web oleh penguji; nol data hilang saat penulisan bersamaan.
- Scan kedatangan memberi umpan balik < 2 detik; dashboard admin realtime menerima event kehadiran < 2 detik.
- 100% siswa cabang portal (AW3) memiliki W-ticket QR yang tervalidasi scanner.
- Pengumuman hasil publik tampil benar untuk semua cabang saat dibuka admin.
- BAST per-siswa aktif segera setelah ujian siswa selesai, tanpa input manual tambahan.

---

## 2. User Experience & Functionality

### Cakupan Cabang

- **Cabang portal** (login aktif): **AW3 = Al-Wildan 3 BSD City** (pusat ujian).
- **Landing publik** hanya menampilkan **3 sekolah utama** beserta info program (Ikhwan = LAKI-LAKI, Akhwat = PEREMPUAN):
  - **AW1 = Al-Wildan 1 Gading Serpong**: SD (Ikhwan/Akhwat) · SMP (Akhwat) · SMA (Akhwat).
  - **AW3 = Al-Wildan 3 BSD City**: SMP (Ikhwan) · SMA (Ikhwan).
  - **AW4 = Al-Wildan 4 Jakarta**: SD/SMP/SMA (Ikhwan/Akhwat).
- **Cabang satelit** (AW5–AW32): disembunyikan di landing (`landing=false`), tetap muncul di pengumuman hasil publik dan rekap admin (nama placeholder `Al-Wildan N` sampai ada nama resmi).
- **Pengumuman hasil publik** mencakup **semua cabang** (read-only, tanpa portal/login).

### Personas

| Persona | Akses | Kebutuhan utama |
|---|---|---|
| Pengunjung / orang tua | Publik | Info tes per cabang |
| Wali murid | `/siswa` via no. HP | Info tes, lokasi+denah, W-ticket QR, BAST |
| Penguji | `/penguji` via kode | Buka soal, penilaian, foto siswa |
| Panitia scanner | `/scanner` via kode | Scan kedatangan, daftar on-the-spot |
| Admin (panitia pusat) | `/admin` via kode+password | CMS, master data, monitoring realtime, rekap, umumkan hasil |

### Struktur Halaman

| Route | Akses | Fungsi |
|---|---|---|
| `/` | Publik | Landing: jadwal, kelas, materi, denah, penguji per cabang (toggle CMS) |
| `/pengumuman` | Publik | Daftar nama + status kelulusan (muncul saat dibuka admin) |
| `/siswa` | Lookup no. HP | Dashboard wali murid: info tes, lokasi+denah, W-ticket QR, BAST |
| `/penguji` | Kode | Dashboard penguji: jadwal tugasan, buka soal, penilaian, upload foto |
| `/admin` | Kode + password | CMS, master data, monitoring realtime, daftar on-the-spot, rekap, alert, umumkan hasil |
| `/scanner` | Kode panitia | Scan QR kamera (siswa & penguji), daftar manual on-the-spot |

### User Stories & Acceptance Criteria

1. **Wali murid melihat info & W-ticket**
   > Sebagai wali murid, saya input nomor telepon agar dapat melihat info tes, lokasi/denah, dan mendapatkan W-ticket QR anak saya.
   - AC: login via lookup no. HP (tanpa password); hanya data milik sendiri yang terekspos; QR berisi kode unik siswa; sesi cookie terpisah per-role.
   - AC: nomor tidak dikenal → pesan error non-revealing, tidak ada akses.

2. **BAST per-siswa pasca-ujian**
   > Sebagai wali murid, saya dapat melihat/mengunduh BAST yang menandakan anak saya telah melaksanakan ujian, tepat setelah ujiannya selesai.
   - AC: BAST aktif hanya saat `status_ujian = selesai` (di-set penguji saat penilaian lengkap).
   - AC: perubahan nilai setelah selesai dikunci/di-trigger ulang oleh admin.
   - AC: tombol lihat/download pada dashboard siswa.

3. **Penguji buka soal & nilai**
   > Sebagai penguji, saya login dengan kode agar dapat membuka soal, mengisi penilaian per siswa, dan mengunggah foto siswa saat ujian.
   - AC: hanya jadwal & siswa miliknya yang tampil; simpan nilai < 2 detik; tidak ada nilai hilang saat penguji lain menyimpan bersamaan (lock + retry).
   - AC: saat nilai semua materi siswa selesai → status `selesai` → BAST terbuka (atomik).
   - AC: foto siswa terunggah ke server dan tersimpan path-nya di database.

4. **Panitia scan kedatangan**
   > Sebagai panitia, saya scan QR siswa/penguji di kamera HP/tablet agar kehadiran tercatat realtime.
   - AC: scan valid → konfirmasi + tercatat; delay ke dashboard admin < 2 detik (WebSocket).
   - AC: scan tidak valid/duplikat → pesan in-place (tidak menggandakan catatan).
   - AC: panitia juga bisa membuka halaman lewat kode langsung.

5. **On-the-spot langsung aktif**
   > Sebagai panitia, saya mendaftarkan manual peserta yang datang on-the-spot agar peserta itu langsung bisa mengakses dashbunya.
   - AC: form daftar manual wajib mengisi nama, cabang, jenjang, dan **no. HP wali**; tanpa no. HP → ditolak validasi.
   - AC: begitu tersimpan, siswa langsung bisa login `/siswa` via no. HP + W-ticket QR aktif, `status_ujian = belum`.

6. **Admin CMS & monitoring**
   > Sebagai admin, saya mengatur informasi apa saja yang tampil di landing page, mengaktifkan countdown, memantau kehadiran realtime, merekap, dan mengumumkan hasil.
   - AC: toggle per bagian `jadwal/kelas/materi/denah/penguji/pengumuman/countdown`; bagian off **tidak dirender**; perubahan berlaku ≤ 60 detik (cache).
   - AC: input countdown (enable + tanggal/waktu target).
   - AC: dashboard realtime menunjukkan status hadir/tidak per penguji & siswa; alert visual/vokal untuk yang tidak hadir.
   - AC: rekap otomatis (per cabang/sesi, jumlah hadir/tidak).
   - AC: tombol "umumkan hasil" → daftar nama + status publik di `/pengumuman`.

7. **Pengumuman publik**
   > Sebagai siapa pun, saya dapat melihat daftar nama siswa dan status kelulusan tanpa login saat pengumuman dibuka.
   - AC: hanya render saat admin membuka; menampilkan nama + status (Lulus/Tidak Lulus); skor, no. HP, dan data psikolog/inklusi **tidak** ditampilkan.

8. **Cabang non-portal — pengumuman saja**
   > Sebagai cabang non-portal, data siswa + status kami dirapikan admin di spreadsheet dan muncul di pengumuman tanpa portal.
   - AC: read-only, tanpa login; muncul di `/pengumuman` sesuai cabang.

### Non-Goals

- Tidak ada notifikasi WhatsApp/email.
- Tidak ada tanda tangan digital wali murid.
- Tidak ada perhitungan kelulusan otomatis — keputusan manusiawi; satu-satunya poin gugur adalah hasil psikolog/inklusi dari dokumen eksternal; data ini privat dan hanya untuk admin.
- Al-Wildan tidak melakukan tes psikolog mandiri — sistem hanya menyimpan status akhir, tidak menalar kriteria.
- Foto siswa hanya arsip, tidak ditampilkan publik.
- Tidak ada IAM kompleks, tidak ada aplikasi mobile, tidak ada pembayaran.

---

## 3. AI System Requirements

Tidak berlaku — aplikasi CRUD + tampilan dinamis tanpa fitur AI.

---

## 4. Technical Specifications

### Stack

- **Framework**: TanStack Start (SSR) dijalankan dengan **Bun** (`Bun.serve`).
- **UI**: shadcn/ui di atas primitives Base UI; ikon **Hugeicons** (`@hugeicons/react`).
- **Design**: putih dominan, aksen biru (satu token warna, default `blue-600`); landing = komponen section modular yang di-toggle CMS.
- **Quality**: Biome (lint/format); prinsip Ponytail (tanpa dependensi spekulatif).
- **Database**: Google Sheets + Google Apps Script web app (baca `doGet` / tulis `doPost`).
- **QR**: `qrcode` (generate) + `html5-qrcode` (scan kamera) — 2 dependensi yang diperlukan, tidak ada native/stdlib untuk QR.
- **Auth**: sesi cookie httpOnly + Secure + SameSite=Lax, ditandatangani HMAC (Web Crypto); password admin di-hash scrypt (`node:crypto`), bukan argon2id.

### Arsitektur & Alur Data

```
Browser ──HTTPS── Caddy ──▶ Bun (TanStack Start SSR + WebSocket hub)
                                │
                                │ fetch (token server-side)
                                ▼
                    Google Apps Script Web App
                                │ LockService.getScriptLock() + retry backoff
                                ▼
                    Google Sheets (seluruh master data)
```

- **Baca publik** (landing, config): di-cache di memori Bun, re-fetch tiap 60 detik → landing cepat, GAS hemat kuota.
- **Tulis** (nilai, kedatangan, config, master data, on-the-spot): langsung ke GAS di dalam `LockService`; saat lock timeout → retry dengan backoff.
  - `ponytail:` ini memenuhi syarat queue/lock tanpa antrian kustom — cukup untuk 10–50 penguji; upgrade ke antrian DB hanya bila volume naik 10x.
- **Realtime**: Bun WebSocket hub — event scan kedatangan dikirim ke dashboard admin < 2 detik; **tidak ada polling GAS** (hemat kuota). Semua persist ke GAS hanya saat event.
- **Upload** (soal, foto siswa): disimpan di `server/uploads/` lokal VPS; path-nya disimpan di spreadsheet.

### Spreadsheet (sheet = tabel)

| Sheet | Kolom inti |
|---|---|
| `cabang` | `id`, `nama`, `portal` (true/false), `alamat`, `program` (teks segmen, mis. "SMP (Ikhwan) · SMA (Ikhwan)"), `landing` (true/false, tampil di landing) |
| `kelas` | `id`, `cabang_id`, `nama`, `jenjang` |
| `materi` | `id`, `cabang_id` (nullable), `nama`, `durasi`, `deskripsi` |
| `jadwal` | `id`, `cabang_id`, `tanggal`, `sesi`, `materi_id`, `kelas_id`, `ruang`, `penguji_id` |
| `denah` | `id`, `cabang_id`, `judul`, `image_url`, `keterangan` |
| `penguji` | `id`, `kode`, `nama`, `cabang_id`, `kontak` |
| `siswa` | `id`, `kode` (= nomor peserta `{CABANG}-{HURUF}{SEQ}`, mis. `AW1-A001`; huruf SD=A, SMP=B, SMA=C, Kinder=K; seq restart per cabang+jenjang), `nama`, `cabang_id`, `jenjang`, `kelas_tujuan`, `asal_sekolah`, `no_hp_wali`, `email`, `jenis_kelamin`, `program` (Boarding/Fullday), `peminatan`, `status_ujian` (`belum`/`selesai`) |
| `nilai` | `id`, `siswa_id`, `jadwal_id`, `materi_id`, `skor`, `catatan`, `foto_path`, `diisi_oleh`, `ts` |
| `users` | `kode`, `role` (`penguji`/`panitia`/`admin`), `password_hash` (admin), `ref_id` |
| `config` | `id`, `key`, `value`, `cabang_id` (nullable) |
| `kedatangan` | `id`, `kode_terdata`, `tipe` (`siswa`/`penguji`), `waktu`, `oleh` |
| `pengumuman` | `id`, `siswa_id`, `cabang_id`, `status` (`lulus`/`tidak_lulus`) |

Config keys contoh: `show_jadwal`, `show_kelas`, `show_materi`, `show_denah`, `show_penguji`, `show_pengumuman`, `countdown_enabled`, `countdown_at`, `umumkan_hasil`.

### Authentication

- **Siswa/wali**: lookup **no. HP saja** (keputusan pengguna). Mitigasi: sesi terpisah, ekspos data minimal (tanpa skor publik di luar pengumuman). Upgrade ke password tersedia bila diminta.
- **Penguji & panitia**: **kode** (di-generate, sumber dari spreadsheet yang disediakan pengguna).
- **Admin**: **kode + password** (scrypt via `node:crypto`).

### Keamanan & Privasi

- Token akses GAS hanya di environment server (Bun auto-load `.env`), tidak pernah ke client.
- Header keamanan HTTP (CORS ketat, security headers manual tanpa lib berat).
- Soal hanya untuk penguji yang login dan sesuai tugasan jadwalnya.
- Privasi: nama, no. HP wali, dan status inklusi/psikolog hanya untuk admin; tidak pernah dirender ke halaman publik (kecuali nama + status di pengumuman).
- Spreadsheet: hanya owner (akun Google sekolah) yang bisa edit manual; web app berjalan atas nama owner.

### BAST

- Template resmi sekolah akan diletakkan oleh pengguna di direktori repo (`bast/`) — **TBD**.
- Sampai template tiba: implementasi ekspor data siap-print (tabel HTML ringkas) + adapter pengisi template saat template tersedia. Tidak menambah dependensi tool doc/pdf sebelum template nyata.
- Trigger pembuatan BAST per-siswa: saat `status_ujian` berubah ke `selesai`.
- Dua bentuk: (1) BAST per-siswa di dashboard wali (bukti telah ujian), (2) rekap BAST (batch) untuk admin/panitia.

### Deployment

- VPS kecil (Hetzner CX22 / DigitalOcean droplet ≤ $6/bulan).
- **Caddy** sebagai reverse proxy (auto-HTTPS Let's Encrypt) → Bun SSR (port internal).
- Layanan `systemd` menjalankan build produksi TanStack Start.
- Domain milik sendiri. Spreadsheet berfungsi sebagai backup data master otomatis; folder `uploads/` pada VPS dicadangkan manual.

---

## 5. Risks & Roadmap

### Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Quota GAS (URL Fetch/hari) | Cache 60s + WebSocket lokal + tulis hanya saat event |
| Lock timeout saat tulis bersamaan | Retry backoff; probabilitas kecil untuk 10–50 penguji |
| Lookup no. HP lemah (tanpa password) | Keputusan pengguna; migrasi password = tambah kolom saja |
| Template BAST belum ada | Versi print-ready jalan duluan; wire template saat tiba |
| Upload di disk VPS | Foto hanya arsip; master tetap di Sheets; cadangkan `uploads/` manual |
| Jendela pengembangan hanya 7 hari | Paralelisasi + fallback pemangkasan (lihat bawah) |
| Data rill (no-HP, kode penguji) belum masuk | Dependensi data: harus tersedia sebelum Senin 14 Sep untuk UAT nyata |

### Fallback Pemangkasan (bila waktu menjepit, berurutan)

1. Alert suara → visual saja.
2. Foto siswa → tunda (arsip, non-kritis).
3. Rekap detil → tabel sederhana dulu.

### Roadmap (11–18 September 2026)

| Hari | Fokus |
|---|---|
| **Jum 11 Sep** | Foundation: scaffold TanStack+Bun+shadcn/baseui/Hugeicons; sheet schema + Apps Script (token, LockService CRUD); auth & sesi semua peran |
| **Sab 12 Sep** | Landing modular + CMS `config` + countdown + cache 60s |
| **Min 13 Sep** | Risk-front: scanner core + QR + WebSocket hub + pencatatan kedatangan |
| **Sen 14 Sep** | Portal siswa: W-ticket QR, denah, info tes, BAST view/download |
| **Sel 15 Sep** | Portal penguji: buka soal (upload), penilaian (lock+retry), upload foto arsip |
| **Rab 16 Sep** | Dashboard admin: monitor realtime, alert visual/vokal, daftar on-the-spot, rekap, umumkan hasil + pengumuman publik |
| **Kam 17 Sep** | BAST (print-ready; wire template bila masuk), deploy VPS+Caddy+HTTPS, UAT panitia, smoke keamanan/privasi/concurrency |
| **Jum 18 Sep** | **Freeze**: dry-run penuh (simulasi scan + nilai), backup, standby |

### Dependensi Data (dari pengguna)

Diminta masuk ke direktori repo sebelum **Senin 14 Sep**:
1. Data siswa portal cabang (termasuk **no. HP wali**).
2. Kode penguji (dan panitia/admin, bila perlu).
3. Template BAST (kapan pun; versi print-ready dipakai sebagai pengganti sementara).

---

## Lampiran — Keputusan Kunci

- Cabang portal: **AW3** (pusat ujian); cabang lain hanya pengumuman (data dirapikan admin di spreadsheet).
- Login wali: nomor HP wali (kanonis `08…`; input `+62…`/`62…`/`08…`/`wa.me` dinormalisasi); satu HP bisa punya beberapa anak (sibling, bisa lintas cabang) → flow **pilih anak**.
- Kinder (PG/TK) diimpor tapi disembunyikan dari tampilan publik (jadwal & pengumuman filter jenjang).
- Landing publik; nilai & data pribadi privat; pengumuman = daftar nama + status publik.
- BAST per-siswa aktif langsung setelah ujian selesai (`status_ujian`); pengumuman = proses terpisah.
- On-the-spot: langsung aktif + W-ticket QR langsung, wajib no. HP wali.
- Kode per peran: siswa (no. HP), penguji/panitia (kode), admin (kode + password).
- Infrastruktur: VPS + Caddy HTTPS + systemd; Bun SSR + WebSocket.
- Realtime: WebSocket (event), bukan polling GAS.
- CSS: putih + aksen biru, shadcn/ui + BaseUI + Hugeicons.