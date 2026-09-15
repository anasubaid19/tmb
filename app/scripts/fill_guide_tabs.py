#!/usr/bin/env python3
"""
Isi tab-tab kosong di "DATA TES BERSAMA_DATA SHEET INTERNAL KSP.xlsx"
dengan CONTOH/PANDUAN baris (idempoten: hanya isi bila sheet masih kosong,
bukan menimpa data). Nilai mengikuti seed.ts + SETUP.md + SCHEMA di Code.gs.

Tab yang diisi (baris contoh):
  penguji, users, kelas, jadwal, denah, config, kedatangan, pengumuman, lembar
"""

import os
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "DATA TES BERSAMA_DATA SHEET INTERNAL KSP.xlsx")

PENGUJI = [
    ["P1", "P101", "Ahmad Hidayat", "AW3", "081200000101", "M1"],
    ["P2", "P102", "Siti Rahma", "AW3", "081200000102", "M2"],
    ["P3", "P103", "Budi Santoso", "AW3", "081200000103", "M3"],
    ["P4", "P104", "Dewi Lestari", "AW1", "081200000104", "M4"],
]

USERS = [
    ["ADMIN-01", "Anas Ubaid", "admin", "admin123", ""],
    ["ADMIN-02", "Kemal Prabowo", "admin", "admin123", ""],
    ["SCAN-01", "Teti Sunarwati", "panitia", "", ""],
    ["P101", "Ahmad Hidayat", "penguji", "", "P1"],
    ["P102", "Siti Rahma", "penguji", "", "P2"],
    ["P103", "Budi Santoso", "penguji", "", "P3"],
]

# id | cabang_id | nama | jenjang
KELAS = [
    ["K1", "AW3", "Kelas 7", "SMP"],
    ["K2", "AW3", "Kelas 10", "SMA"],
    ["K9", "AW3", "Kelas 8", "SMP"],
    ["K10", "AW3", "Kelas 11", "SMA"],
    ["K3", "AW1", "Kelas 1", "SD"],
    ["K11", "AW1", "Kelas 2–5", "SD"],
    ["K4", "AW1", "Kelas 7", "SMP"],
    ["K12", "AW1", "Kelas 8", "SMP"],
    ["K5", "AW1", "Kelas 10", "SMA"],
    ["K13", "AW1", "Kelas 11", "SMA"],
    ["K6", "AW4", "Kelas 1", "SD"],
    ["K14", "AW4", "Kelas 2–5", "SD"],
    ["K7", "AW4", "Kelas 7", "SMP"],
    ["K15", "AW4", "Kelas 8", "SMP"],
    ["K8", "AW4", "Kelas 10", "SMA"],
    ["K16", "AW4", "Kelas 11", "SMA"],
]

# id | cabang_id | tanggal | sesi | materi_id | kelas_id | ruang | penguji_id | tampil
JADWAL = [
    ["J1", "AW3", "Ahad, 20 Sep 2026", "Sesi 1 (07.30–08.30)", "M1", "K1", "A1", "P1", "true"],
    ["J2", "AW3", "Ahad, 20 Sep 2026", "Sesi 1 (07.30–08.30)", "M2", "K2", "B1", "P2", "true"],
    ["J3", "AW3", "Ahad, 20 Sep 2026", "Sesi 2 (09.15–10.15)", "M3", "K1", "A1", "P1", "true"],
    ["J4", "AW3", "Ahad, 20 Sep 2026", "Sesi 2 (09.15–10.15)", "M4", "K2", "B1", "P2", "true"],
]

# id | cabang_id | sesi | jenjang | waktu | tampil
# cabang_id kosong = global (dipakai semua cabang); terisi = override per-cabang.
SESI = [
    ["S1", "", "Sesi 1", "SD", "07.30–08.30", "true"],
    ["S2", "", "Sesi 2", "SMP & SMA (Akhwat)", "09.15–10.15", "true"],
    ["S3", "", "Sesi 3", "SMP & SMA (Ikhwan)", "11.00–12.00", "true"],
    ["S1-AW3", "AW3", "Sesi 1", "SD", "07.30–08.30", "true"],
]

# id | cabang_id | judul | image_url | keterangan
DENAH = [
    ["D1", "AW3", "Denah Gedung Ujian",
     "https://drive.google.com/uc?export=view&id=CONTOH_ID_GAMBAR",
     "Parkir wali di sisi timur. Peserta masuk via Gerbang Masuk."],
]

# id | key | value | cabang_id
CONFIG = [
    ["1", "show_jadwal", "true", ""],
    ["2", "show_kelas", "true", ""],
    ["3", "show_materi", "true", ""],
    ["4", "show_denah", "false", ""],
    ["5", "show_pengumuman", "true", ""],
    ["6", "countdown_enabled", "false", ""],
    ["7", "countdown_at", "2026-09-20T07:00:00+07:00", ""],
    ["8", "umumkan_hasil", "false", ""],
    ["9", "math_gform_url", "", ""],
]

# id (auto) | kode_terdata | tipe | waktu | oleh
KEDATANGAN = [
    ["", "AW3-B001", "siswa", "2026-09-20T06:55:00+07:00", "SCAN-01"],
]

# id (auto) | siswa_id | cabang_id | status (lulus|tidak_lulus)
PENGUMUMAN = [
    ["", "1", "AW3", "lulus"],
]

# id (auto) | siswa_id | diisi_oleh | nama_pengelola | foto_paths | ts
LEMBAR = [
    ["", "1", "P101", "Ahmad Hidayat", "[]", "2026-09-20T08:00:00+07:00"],
]


def fill_if_empty(ws, rows):
    if ws.max_row > 1:
        return 0  # sudah ada data (di bawah header), jangan ditimpa
    for r in rows:
        ws.append(r)
    return len(rows)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    if not os.path.exists(src):
        print(f"File tidak ditemukan: {src}")
        sys.exit(1)

    wb = openpyxl.load_workbook(src)
    plan = {
        "penguji": PENGUJI,
        "users": USERS,
        "kelas": KELAS,
        "jadwal": JADWAL,
        "sesi": SESI,
        "denah": DENAH,
        "config": CONFIG,
        "kedatangan": KEDATANGAN,
        "pengumuman": PENGUMUMAN,
        "lembar": LEMBAR,
    }
    for name, rows in plan.items():
        if name not in wb.sheetnames:
            print(f"  [skip] sheet {name} tidak ada")
            continue
        n = fill_if_empty(wb[name], rows)
        tag = "diisi" if n else "sudah ada data (skip)"
        print(f"  {name:12s} → {n} baris {tag}")
    wb.save(src)
    print("selesai.")


if __name__ == "__main__":
    main()
