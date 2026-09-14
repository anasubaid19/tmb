#!/usr/bin/env python3
"""
Edit langsung "DATA TES BERSAMA_DATA SHEET INTERNAL KSP.xlsx" (in-place):

1. Sheet `siswa`: reshape kolom LAMA (18) → BARU (16, persis SCHEMA.siswa).
   - buang `asal_sekolah` (kosong semua)
   - gabung program + peminatan → `program_jurusan` ("FULLDAY · INTER")
   - generate `id` (1..N) dan `kode` ({CABANG}-{HURUF}{SEQ})
   - normalisasi: jenis_kelamin (Perempuan→PEREMPUAN), HP (62→08),
     kelas_tujuan (7.0→7), jenjang (upper), program (Fullday→FULLDAY)
   - status_ujian = "belum"
2. Sheet `penguji`: tambah kolom `materi_id` di header (sesuai SCHEMA baru).

Idempoten: aman dijalankan ulang. Backup dibuat otomatis ke *.bak (jika belum ada).
"""

import csv
import os
import re
import sys

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from import_siswa import (  # noqa: E402
    jenjang_letter,
    norm_jk,
    norm_kelas,
    norm_peminatan,
    norm_phone,
    norm_program,
    program_jurusan,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "DATA TES BERSAMA_DATA SHEET INTERNAL KSP.xlsx")

# Persis SCHEMA.siswa di Code.gs (16 kolom).
SISWA_HEADER = [
    "id", "kode", "nama", "cabang_id", "jenjang", "kelas_tujuan",
    "no_hp_wali", "email", "jenis_kelamin", "program_jurusan", "status_ujian",
    "nilai_calistung_math", "nilai_english", "nilai_arabic",
    "nilai_quran", "nilai_ortu",
]

PENGUJI_HEADER = ["id", "kode", "nama", "cabang_id", "kontak", "materi_id"]


def read_old_siswa(ws):
    hdr = [str(c.value) for c in ws[1]]
    col = {name: i + 1 for i, name in enumerate(hdr)}
    out = []
    for r in range(2, ws.max_row + 1):
        nama = ws.cell(row=r, column=col["nama"]).value
        if nama in (None, ""):
            continue
        program = norm_program(ws.cell(row=r, column=col["program"]).value)
        peminatan = norm_peminatan(ws.cell(row=r, column=col["peminatan"]).value)
        out.append(
            {
                "nama": str(nama).strip(),
                "cabang_id": str(ws.cell(row=r, column=col["cabang_id"]).value or "").strip(),
                "jenjang": str(ws.cell(row=r, column=col["jenjang"]).value or "").strip().upper(),
                "kelas_tujuan": norm_kelas(ws.cell(row=r, column=col["kelas_tujuan"]).value),
                "no_hp_wali": norm_phone(ws.cell(row=r, column=col["no_hp_wali"]).value),
                "email": str(ws.cell(row=r, column=col["email"]).value or "").strip(),
                "jenis_kelamin": norm_jk(ws.cell(row=r, column=col["jenis_kelamin"]).value),
                "program_jurusan": program_jurusan(program, peminatan),
            }
        )
    return out


def rewrite_siswa(ws, rows):
    # Hapus seluruh isi sheet lalu tulis ulang.
    ws.delete_rows(1, ws.max_row)
    ws.append(SISWA_HEADER)
    seq = {}
    kodes = set()
    dup = []
    for i, s in enumerate(rows, start=1):
        letter = jenjang_letter(s["jenjang"])
        key = (s["cabang_id"], letter)
        seq[key] = seq.get(key, 0) + 1
        kode = f"{s['cabang_id']}-{letter}{seq[key]:03d}"
        if kode in kodes:
            dup.append(kode)
        kodes.add(kode)
        ws.append(
            [
                i,
                kode,
                s["nama"],
                s["cabang_id"],
                s["jenjang"],
                s["kelas_tujuan"],
                s["no_hp_wali"],
                s["email"],
                s["jenis_kelamin"],
                s["program_jurusan"],
                "belum",
                "", "", "", "", "",
            ]
        )
    return len(rows), dup


def fix_penguji(ws):
    ws.delete_rows(1, ws.max_row)
    ws.append(PENGUJI_HEADER)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    if not os.path.exists(src):
        print(f"File tidak ditemukan: {src}")
        sys.exit(1)

    bak = src + ".bak"
    if not os.path.exists(bak):
        import shutil
        shutil.copy2(src, bak)
        print(f"backup → {bak}")

    wb = openpyxl.load_workbook(src)
    n, dup = rewrite_siswa(wb["siswa"], read_old_siswa(wb["siswa"]))
    fix_penguji(wb["penguji"])
    wb.save(src)

    print(f"{n} siswa di-reshape + id/kode digenerate")
    print("penguji header →", PENGUJI_HEADER)
    if dup:
        print("DUPLIKAT KODE:", dup)
    else:
        print("kode unik: OK")


if __name__ == "__main__":
    main()
