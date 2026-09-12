# Setup Spreadsheet + Apps Script (sekali saja)

## 1. Buat spreadsheet

1. Buat Google Sheet baru (akun Google sekolah) — mis. "TMB Database".
2. Catat ID spreadsheet bila perlu (tidak wajib untuk web app).

## 2. Pasang script

1. Di spreadsheet: **Extensions > Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel seluruh isi `Code.gs` dari folder ini.
3. Simpan (Ctrl/Cmd+S).

## 3. Buat sheet + header otomatis

1. Di editor Apps Script, pilih fungsi **`setupSheets`** lalu **Run**.
2. Setujui izin (akun sekolah) saat diminta.
3. Kembali ke spreadsheet — 12 sheet (`cabang` … `pengumuman`) sudah terbuat dengan header.

## 4. Set token API

1. Di editor Apps Script: **Project Settings (ikon gerigi) > Script Properties > Add script property**.
2. Property: `API_TOKEN`, Value: string acak panjang (samakan dengan `GAS_TOKEN` di `.env` aplikasi).
3. Save.

## 5. Deploy sebagai Web App

1. **Deploy > New deployment > Web app**.
2. **Execute as**: `Me` (akun sekolah). **Who has access**: `Anyone`.
3. **Deploy**, salin **Web app URL** → isi `GAS_URL` di `.env` aplikasi.

## 6. Isi data awal (manual di spreadsheet)

- `cabang`: AW1 / AW3 / AW4 (`portal=TRUE`) + cabang lain (`portal=FALSE`).
- `config`: toggle landing (`show_jadwal=TRUE`, dst), `umumkan_hasil=FALSE`, dsb.
- `users`: kode penguji/panitia/admin + `password_hash` admin (dibuat via halaman admin aplikasi setelah deploy, atau hash argon2id manual).
- `siswa`, `penguji`, `jadwal`, dst. — sesuai data panitia.

## Catatan

- Semua tulis (`append`/`update`) dikunci `LockService` 30 detik di sisi GAS; client melakukan retry + backoff.
- baca publik (`read` via GET) tidak memakai lock — aman untuk traffic landing.
- Lookup sensitif (no. HP, kode) selalu via POST agar tidak tercatat di URL log.
