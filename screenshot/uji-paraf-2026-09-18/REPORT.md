# Laporan Uji Paraf & Fitur — tes.tes-alwildan.id

Tanggal: 2026-09-18 · Akun: ADMIN-01 (admin123), P-065, P-050, P-042, P-040
Deploy: commit `e8ad174` sudah live; migrasi kolom `*_oleh` sudah jalan (terbukti dari ekspor).

## Kesimpulan

Paraf lembar validasi kini mengikuti **penguji yang benar-benar submit** (`nilai_*_oleh`),
bukan lagi pengampu pertama di peta jadwal. Bug "P-065 submit → paraf P-041" sudah FIXED.

## Studi kasus

| # | Penguji submit | Materi | Siswa | Hasil paraf lembar | Screenshot |
|---|---|---|---|---|---|
| 1 | P-065 Moh Nur Nugraha | Arabic | AWI-162 | **Moh Nur Nugraha** ✅ (sebelumnya kosong) | 02, 03 |
| 2 | P-050 Dr. Abd Rahim Algresiky | Arabic | AWI-212 | **Abd Rahim Algresiky** ✅ | 04 |
| 3 | P-042 Miss Erica | English | AWI-173 | **Miss Erica** ✅ (bukan Yulia P-039) | 07 |
| 4 | P-040 Syaikhah Dr. Khairiyah | Al-Qur'an | AWI-135 | **Khairiyah Al - Qodiri** ✅ | 08 |
| 5 | P-050 (re-submit) | Arabic | AWI-131 | **Nur Fauziah → Abd Rahim** ✅ (data lama sembuh) | 09 |

Bukti data (ekspor `nilai_arabic_oleh`): lihat `bukti-ekspor-nilai.xlsx`
- AWI-162 `nilai_arabic=86` (`oleh=P-065`)
- AWI-212 `nilai_arabic=90` (`oleh=P-050`)
- AWI-173 `nilai_english=18` (`oleh=P-042`)
- AWI-135 `nilai_quran=90` (`oleh=P-040`)

## Batasan (perlu diketahui)

Nilai yang di-submit **sebelum** migrasi tidak punya `_oleh`, jadi paraf memakai
fallback peta → semua siswa tampil satu nama.

Bukti: AWI-131, AWI-107, AWI-279 (data lama) semua menampilkan **Nur Fauziah (P-041)**
meski penguji sebenarnya beda. AWI-084 `nilai_arabic=86` (`oleh` kosong) → paraf P-041.
Solusi: submit ulang materi tsb (sudah dibuktikan di AWI-131 → berubah ke P-050).

## Fitur lain yang diverifikasi live

| Fitur | Status | Screenshot |
|---|---|---|
| Tombol Kembali primer + Keluar ghost (anti salah-klik) | ✅ | 05 |
| Soal santri opsional: tertutup → field nilai ikut sembunyi | ✅ | 05 |
| Buka soal santri → soal + 4 aspek muncul | ✅ | 06 |
| "&" tampil benar (bukan `&amp;`) | ✅ | 06 |
| Ekspor XLSX nilai per jenjang (SD/SMP/SMA) | ✅ (394 KB, 3 sheet) | 10, `bukti-ekspor-nilai.xlsx` |
| Tombol Ekspor Kedatangan & Penilaian | ✅ | 10 |
| Tab Admin (Tambah admin + Ganti password) | ✅ | 11 |
| Urut Penguji per Kode/Nama | ✅ | 12 |

## Catatan operasional

- Data uji **dibersihkan**: AWI-173, AWI-212, AWI-135 direset via admin (semua kolom nilai `-`).
- **AWI-162 & AWI-131 sengaja TIDAK direset penuh** — keduanya punya nilai asli
  (AWI-162: English 15 + interview ortu P-027; AWI-131: English 20 + santri).
  Reset penuh akan menghapus nilai asli itu. Pembersihan terarah (hanya kolom Arabic)
  tersedia via script: `app/scripts/reset-uji-paraf.ts` (commit `f1f40c9`).
  Jalankan di VPS: `cd app && bun scripts/reset-uji-paraf.ts` lalu `--apply`.
- Temuan kecil: nama berkas ekspor memakai jam UTC (`tmb-nilai-2026-09-18-13-32-43.xlsx`
  padahal 20:32 WIB). **Sudah diperbaiki** (`wibStamp()`, commit `2c8a3d4`) — menunggu deploy.
- Bug "Baru Tiba" jam (timezone) belum diuji runtime (belum ada scan hari ini);
  perbaikan `Asia/Jakarta` terverifikasi via unit test.
