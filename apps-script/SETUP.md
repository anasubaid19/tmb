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
- `users`: kode penguji/panitia/admin. Baris admin WAJIB `role=admin`, kolom `nama`, dan `password_hash` scrypt (`scrypt$…`, format yang sama dengan aplikasi — lihat `password.server.ts`). Contoh baris admin:
  - `ADMIN-01 | Anas Ubaid | admin | scrypt$2c75e516fff0660df20151bbf49dd58a$7d24e11db1ddfc11ae1e6e53c4c4f23ee2ee591246fd24f32cd0997715b261e4 |` (kode, nama, role, password_hash, ref_id kosong)
  - `ADMIN-02 | Kemal Prabowo | admin | scrypt$939e165ca355e2aee4fa3f4824bcfffb$1403b72f0812efb2a0c686f638286ce554798fe032f72c69f93d26b3bde0fd30 |`
  - Password keduanya tercatat terpisah (lihat catatan deploy ke tim IT) — baris di atas bisa ditempel langsung ke sheet.
- `siswa`, `penguji`, `jadwal`, dst. — sesuai data panitia.

## Catatan

- Semua tulis (`append`/`update`) dikunci `LockService` 30 detik di sisi GAS; client melakukan retry + backoff.
- baca publik (`read` via GET) tidak memakai lock — aman untuk traffic landing.
- Lookup sensitif (no. HP, kode) selalu via POST agar tidak tercatat di URL log.
