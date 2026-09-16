#!/usr/bin/env python3
"""
Import data siswa dari F_DATA CONTROL (xlsx) → CSV siap tempel ke sheet DB GAS.

Pakai:
    python3 scripts/import_siswa.py ["/path/ke/F_DATA CONTROL.xlsx"]

Output (folder scripts/output/):
    - cabang.csv  → sheet `cabang`
    - siswa.csv   → sheet `siswa`
    - laporan.txt → anomali data yang perlu dicek manual

Aturan:
    - Sheet ber-suffix "_" digabung ke cabang yang sama (AW1 + AW1_ → AW1).
    - REKAP dilewati. Kolom TYPE dibuang (berantakan).
    - HP dinormalisasi ke format kanonis 08… (sama dengan src/lib/phone.ts).
    - kode = nomor peserta {CABANG}-{HURUF}{SEQ}, mis. AW1-A001.
  Huruf: SD=A, SMP=B, SMA=C, Kinder (PG/TK)=K (sama dengan src/lib/kode.ts).
    - Kinder (PG/TK) tetap diimport (disembunyikan di sisi aplikasi).
"""

import csv
import os
import re
import sys
from collections import Counter, defaultdict

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_XLSX = os.path.join(
    os.path.dirname(ROOT),
    "F_DATA CONTROL (SISWA TES BERSAMA 19-20 SEPT 2026).xlsx",
)
OUT_DIR = os.path.join(ROOT, "scripts", "output")

PORTAL_BRANCH = "AW3"

# Huruf jenjang untuk kode peserta (sinkron dengan src/lib/kode.ts).
JENJANG_LETTER = {"SD": "A", "SMP": "B", "SMA": "C", "PG": "K"}


def jenjang_letter(jenjang: str) -> str:
    j = (jenjang or "").strip().upper()
    if j.startswith("TK"):
        return "K"
    return JENJANG_LETTER.get(j, "X")

# Nama resmi cabang (kapital semua, ID AW… tetap). Hanya AW4 yang angkanya
# sebelum "ISLAMIC SCHOOL".
CABANG_KOTA = {
    "AW1": "GADING SERPONG",
    "AW3": "BSD CITY",
    "AW4": "JAKARTA",
    "AW5": "JAKARTA",
}


def cabang_nama(cab: str) -> str:
    num = re.sub(r"\D", "", cab or "")
    ekor = f" {CABANG_KOTA[cab]}" if cab in CABANG_KOTA else ""
    if cab == "AW4":
        return f"AL-WILDAN {num} ISLAMIC SCHOOL{ekor}".strip()
    return f"AL-WILDAN ISLAMIC SCHOOL {num}{ekor}".strip()


# 3 sekolah utama: info program (Ikhwan/Akhwat) untuk landing; nama resmi dari
# cabang_nama() agar satu sumber.
SEKOLAH_UTAMA = {
    "AW1": (
        cabang_nama("AW1"),
        "SD (Ikhwan/Akhwat) · SMP (Akhwat) · SMA (Akhwat)",
    ),
    "AW3": (cabang_nama("AW3"), "SMP (Ikhwan) · SMA (Ikhwan)"),
    "AW4": (
        cabang_nama("AW4"),
        "SD (Ikhwan/Akhwat) · SMP (Ikhwan/Akhwat) · SMA (Ikhwan/Akhwat)",
    ),
}


def norm_phone(value) -> str:
    if value is None:
        return ""
    s = str(value).strip()
    s = re.sub(r"^wa\.me/", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\.0+$", "", s)
    digits = re.sub(r"\D", "", s)
    if not digits:
        return ""
    if digits.startswith("62"):
        digits = digits[2:]
    if not digits.startswith("0"):
        digits = "0" + digits
    return digits


def norm_kelas(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    s = str(value).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s


def norm_program(value) -> str:
    s = str(value or "").strip().upper()
    if s in ("FULLDAY", "FULDAY"):
        return "FULLDAY"
    if s == "BOARDING":
        return "BOARDING"
    return s


def norm_jk(value) -> str:
    s = str(value or "").strip().upper()
    if s.startswith("LAKI"):
        return "LAKI-LAKI"
    if s.startswith("PEREMPUAN"):
        return "PEREMPUAN"
    return s


def norm_peminatan(value) -> str:
    if value is None:
        return ""
    s = str(value).strip().upper().replace("-", " ")
    s = re.sub(r"\s+", " ", s)
    return {"INTERNATIONAL": "INTER", "AMERICA EUROPE": "AE"}.get(s, s).strip()


def program_jurusan(program: str, peminatan: str) -> str:
    """Gabung program (FULLDAY/BOARDING) + peminatan → satu kolom, mis. FULLDAY · INTER."""
    return " · ".join(p for p in (program, peminatan) if p)


def canonical_sheet(name: str) -> str:
    return name.rstrip("_")


def read_rows(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    students = []
    sheets = []
    twins = {sn for sn in wb.sheetnames if sn.endswith("_")}
    for sn in wb.sheetnames:
        if sn == "REKAP":
            continue
        # ponytail: sheet polos dgn kembaran "_" (mis. AW1 vs AW1_) adalah
        # dump sisa (AW1 cuma 1 baris); sumber penuhnya yang "_".
        if not sn.endswith("_") and f"{sn}_" in twins:
            continue
        cab = canonical_sheet(sn)
        sheets.append(cab)
        ws = wb[sn]
        for r in range(2, ws.max_row + 1):
            nama = ws.cell(row=r, column=2).value
            if nama in (None, ""):
                continue
            students.append(
                {
                    "cabang_id": cab,
                    "nama": str(nama).strip(),
                    "email": str(ws.cell(row=r, column=3).value or "").strip(),
                    "no_hp_wali": norm_phone(ws.cell(row=r, column=4).value),
                    "jenis_kelamin": norm_jk(ws.cell(row=r, column=5).value),
                    "jenjang": str(ws.cell(row=r, column=6).value or "").strip().upper(),
                    "program": norm_program(ws.cell(row=r, column=7).value),
                    "kelas_tujuan": norm_kelas(ws.cell(row=r, column=8).value),
                    "peminatan": norm_peminatan(ws.cell(row=r, column=10).value),
                    "program_jurusan": program_jurusan(
                        norm_program(ws.cell(row=r, column=7).value),
                        norm_peminatan(ws.cell(row=r, column=10).value),
                    ),
                }
            )
    return students, sorted(set(sheets))


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    if not os.path.exists(xlsx):
        print(f"File tidak ditemukan: {xlsx}")
        sys.exit(1)

    students, branches = read_rows(xlsx)
    os.makedirs(OUT_DIR, exist_ok=True)

    # cabang.csv
    with open(os.path.join(OUT_DIR, "cabang.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "nama", "portal", "alamat", "program", "landing"])
        for cab in branches:
            if cab in SEKOLAH_UTAMA:
                nama, program = SEKOLAH_UTAMA[cab]
                landing = "true"
            else:
                nama, program, landing = cabang_nama(cab), "", "false"
            w.writerow(
                [cab, nama, "true" if cab == PORTAL_BRANCH else "false", "", program, landing]
            )

    # siswa.csv — kode = {cabang}-{huruf}{seq}, seq restart per cabang+jenjang
    seq = Counter()
    kode_bounds = {}
    with open(os.path.join(OUT_DIR, "siswa.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "id",
                "kode",
                "nama",
                "cabang_id",
                "jenjang",
                "kelas_tujuan",
                "no_hp_wali",
                "email",
                "jenis_kelamin",
                "program_jurusan",
                "status_ujian",
            ]
        )
        for i, s in enumerate(students, start=1):
            letter = jenjang_letter(s["jenjang"])
            key = (s["cabang_id"], letter)
            seq[key] += 1
            kode = f"{s['cabang_id']}-{letter}{seq[key]:03d}"
            if key not in kode_bounds:
                kode_bounds[key] = [kode, kode]
            else:
                kode_bounds[key][1] = kode
            w.writerow(
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
                ]
            )

    # laporan.txt
    per_cabang = Counter(s["cabang_id"] for s in students)
    per_jenjang = Counter(s["jenjang"] for s in students)
    phones = defaultdict(list)
    for s in students:
        if s["no_hp_wali"]:
            phones[s["no_hp_wali"]].append(s["nama"])
    siblings = {k: v for k, v in phones.items() if len(v) > 1}
    short_phones = [
        (s["nama"], s["no_hp_wali"]) for s in students if len(s["no_hp_wali"]) < 10
    ]
    non_mobile = [
        (s["nama"], s["no_hp_wali"])
        for s in students
        if s["no_hp_wali"] and not s["no_hp_wali"].startswith("08")
    ]
    no_phone = [s["nama"] for s in students if not s["no_hp_wali"]]

    name_phone = Counter((s["nama"], s["no_hp_wali"]) for s in students)
    exact_dupes = [k for k, n in name_phone.items() if n > 1]

    lines = []
    lines.append(f"Total siswa: {len(students)}")
    lines.append(f"Total cabang: {len(branches)} (portal: {PORTAL_BRANCH})")
    lines.append("")
    lines.append("Per cabang:")
    for c, n in sorted(per_cabang.items()):
        lines.append(f"  {c:6s} {n}")
    lines.append("")
    lines.append("Per jenjang:")
    for j, n in sorted(per_jenjang.items()):
        lines.append(f"  {j:6s} {n}")
    lines.append("")
    lines.append("Rentang kode per cabang+jenjang:")
    for (c, letter), (first, last) in sorted(kode_bounds.items()):
        span = first if first == last else f"{first}..{last}"
        lines.append(f"  {c:6s} {span}")
    lines.append("")
    lines.append(f"Grup sibling (HP sama, >1 anak): {len(siblings)}")
    for hp, kids in sorted(siblings.items()):
        lines.append(f"  {hp}: {'; '.join(kids)}")
    lines.append("")
    lines.append(f"HP <10 digit (perlu dicek): {len(short_phones)}")
    for nama, hp in short_phones:
        lines.append(f"  {nama}: {hp}")
    lines.append("")
    lines.append(f"HP non-mobile (bukan awalan 08): {len(non_mobile)}")
    for nama, hp in non_mobile:
        lines.append(f"  {nama}: {hp}")
    lines.append("")
    lines.append(f"Duplikat persis (nama + HP sama): {len(exact_dupes)}")
    for nama, hp in exact_dupes:
        lines.append(f"  {nama}: {hp}")
    lines.append("")
    lines.append(f"Tanpa HP: {len(no_phone)}")
    for nama in no_phone:
        lines.append(f"  {nama}")

    with open(os.path.join(OUT_DIR, "laporan.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("\n".join(lines[:8]))
    print(f"\n→ {OUT_DIR}/cabang.csv")
    print(f"→ {OUT_DIR}/siswa.csv")
    print(f"→ {OUT_DIR}/laporan.txt")


if __name__ == "__main__":
    main()
