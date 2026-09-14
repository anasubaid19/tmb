#!/usr/bin/env python3
"""
Generate src/lib/seed-control.generated.ts dari F_DATA CONTROL (xlsx).

Pakai ulang logika import_siswa.py (read_rows, jenjang_letter, penamaan
cabang) agar seed mock identik dengan CSV yang ditempel ke sheet DB GAS:
kode {CABANG}-{HURUF}{SEQ} dengan seq per cabang+huruf, HP kanonis 08….

Pakai:
    python3 scripts/seed_control.py ["/path/ke/F_DATA CONTROL.xlsx"]

Kolom email sengaja dibuang (tak dipakai aplikasi) untuk mengurangi PII.
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from import_siswa import (  # noqa: E402
    PORTAL_BRANCH,
    SEKOLAH_UTAMA,
    canonical_sheet,
    jenjang_letter,
    read_rows,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_XLSX = os.path.join(
    os.path.dirname(ROOT),
    "F_DATA CONTROL (SISWA TES BERSAMA 19-20 SEPT 2026).xlsx",
)
OUT_TS = os.path.join(ROOT, "src", "lib", "seed-control.generated.ts")


def cabang_rows(sheets: list) -> list:
    rows = []
    for cab in sorted(set(sheets)):
        if cab in SEKOLAH_UTAMA:
            nama, program = SEKOLAH_UTAMA[cab]
            landing = "true"
        else:
            num = re.sub(r"\D", "", cab)
            nama, program, landing = f"Al-Wildan {num}", "", "false"
        rows.append(
            {
                "id": cab,
                "nama": nama,
                "portal": "true" if cab == PORTAL_BRANCH else "false",
                "alamat": "",
                "program": program,
                "landing": landing,
            }
        )
    return rows


def siswa_rows(students: list) -> list:
    seq: dict = {}
    out = []
    for i, s in enumerate(students, start=1):
        letter = jenjang_letter(s["jenjang"])
        key = (s["cabang_id"], letter)
        seq[key] = seq.get(key, 0) + 1
        out.append(
            {
                "id": str(i),
                "kode": f"{s['cabang_id']}-{letter}{seq[key]:03d}",
                "nama": s["nama"],
                "cabang_id": s["cabang_id"],
                "jenjang": s["jenjang"],
                "kelas_tujuan": s["kelas_tujuan"],
                "no_hp_wali": s["no_hp_wali"],
                "jenis_kelamin": s["jenis_kelamin"],
                "program_jurusan": s["program_jurusan"],
                "status_ujian": "belum",
            }
        )
    return out


def emit_ts(name: str, rows: list) -> str:
    body = ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows)
    return f"export const {name}: GasRow[] = [\n{body},\n];\n"


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    if not os.path.exists(xlsx):
        print(f"File tidak ditemukan: {xlsx}")
        sys.exit(1)
    students, sheets = read_rows(xlsx)
    cabang = cabang_rows(sheets)
    siswa = siswa_rows(students)
    assert len({s["kode"] for s in siswa}) == len(siswa), "kode duplikat!"
    assert all("-X" not in s["kode"] for s in siswa), "ada huruf X!"

    header = (
        "// GENERATED — jangan edit manual. Dibuat oleh scripts/seed_control.py\n"
        f"// dari {os.path.basename(xlsx)} "
        f"({len(siswa)} siswa, {len(cabang)} cabang).\n"
        '// Regen: python3 scripts/seed_control.py && bunx biome check src && bun run build\n'
        'import type { GasRow } from "./gas.server";\n\n'
    )
    with open(OUT_TS, "w", encoding="utf-8") as f:
        f.write(header + emit_ts("CONTROL_CABANG", cabang) + "\n" + emit_ts("CONTROL_SISWA", siswa))
    print(f"{len(siswa)} siswa, {len(cabang)} cabang → {OUT_TS}")


if __name__ == "__main__":
    main()
