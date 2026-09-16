import { dbTransaction } from "./db.server";
import type { DbRow } from "./db-schema";
import type { ControlData, ControlIssue, ControlSiswa } from "./import-control";
import { nextControlKode } from "./import-control";

export interface ControlSyncSummary {
  cabangAdded: number;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  issues: ControlIssue[];
}

const PROFILE_COLUMNS = [
  "nama",
  "cabang_id",
  "jenjang",
  "kelas_tujuan",
  "no_hp_wali",
  "email",
  "jenis_kelamin",
  "program_jurusan",
] as const;

const str = (row: DbRow, key: string): string => String(row[key] ?? "");

const naturalKey = (
  nama: string,
  phone: string,
  cabang: string,
  jenjang: string,
): string => `${nama.trim().toUpperCase()}|${phone}|${cabang}|${jenjang}`;

function kodeSequence(
  kode: string,
): { cabang: string; letter: string; seq: number } | null {
  const m = /^([A-Z0-9]+)-([A-Z])(\d+)$/.exec(kode.toUpperCase());
  if (!m) return null;
  return { cabang: m[1], letter: m[2], seq: Number(m[3]) };
}

/**
 * Upsert non-destruktif: cocokkan identitas alami (nama+HP+cabang+jenjang,
 * fallback email unik), pertahankan id/kode/status/nilai lama. Baris yang
 * tidak ada di file tidak dihapus; cabang yang sudah ada tidak diubah.
 */
export async function syncControlData(
  data: ControlData,
): Promise<ControlSyncSummary> {
  return dbTransaction(async (tx) => {
    const issues = [...data.issues];
    const [cabangRows, siswaRows] = await Promise.all([
      tx.read("cabang"),
      tx.read("siswa"),
    ]);

    let cabangAdded = 0;
    const cabangIds = new Set(cabangRows.map((row) => str(row, "id")));
    for (const cabang of data.cabang) {
      if (cabangIds.has(cabang.id)) continue;
      await tx.append("cabang", {
        id: cabang.id,
        nama: cabang.nama,
        portal: String(cabang.portal),
        alamat: cabang.alamat,
        program: cabang.program,
        landing: String(cabang.landing),
      });
      cabangIds.add(cabang.id);
      cabangAdded += 1;
    }

    const byNatural = new Map<string, DbRow[]>();
    const byEmail = new Map<string, DbRow[]>();
    const byKode = new Map<string, DbRow>();
    const used = new Map<string, number>();
    for (const row of siswaRows) {
      const key = naturalKey(
        str(row, "nama"),
        str(row, "no_hp_wali"),
        str(row, "cabang_id"),
        str(row, "jenjang"),
      );
      byNatural.set(key, [...(byNatural.get(key) ?? []), row]);
      const email = str(row, "email").toLowerCase();
      if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), row]);
      const kode = str(row, "kode").toUpperCase();
      if (kode) byKode.set(kode, row);
      const parsed = kodeSequence(kode);
      if (parsed) {
        const mapKey = `${parsed.cabang}|${str(row, "jenjang")}`;
        used.set(mapKey, Math.max(used.get(mapKey) ?? 0, parsed.seq));
      }
    }

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    const claimed = new Set<string>();

    const claim = (row: DbRow, incoming: ControlSiswa): boolean => {
      const id = str(row, "id");
      if (claimed.has(id)) {
        issues.push({
          sheet: incoming.cabang_id,
          row: null,
          message: `Duplikat di file untuk ${incoming.nama}.`,
        });
        skipped += 1;
        return false;
      }
      claimed.add(id);
      return true;
    };

    for (const incoming of data.siswa) {
      const key = naturalKey(
        incoming.nama,
        incoming.no_hp_wali,
        incoming.cabang_id,
        incoming.jenjang,
      );
      const natural = byNatural.get(key) ?? [];
      let target: DbRow | null = null;
      if (natural.length === 1) {
        target = natural[0];
      } else if (natural.length > 1) {
        issues.push({
          sheet: incoming.cabang_id,
          row: null,
          message: `Identitas ganda di database untuk ${incoming.nama}; dilewati agar tidak salah timpa.`,
        });
        skipped += 1;
        continue;
      } else if (incoming.email) {
        const emailMatches = byEmail.get(incoming.email.toLowerCase()) ?? [];
        if (emailMatches.length === 1) {
          target = emailMatches[0];
        } else if (emailMatches.length > 1) {
          issues.push({
            sheet: incoming.cabang_id,
            row: null,
            message: `Email ganda di database untuk ${incoming.nama}; dilewati.`,
          });
          skipped += 1;
          continue;
        }
      }

      if (target) {
        if (!claim(target, incoming)) continue;
        const updates: DbRow = {};
        for (const column of PROFILE_COLUMNS) {
          const next = incoming[column as keyof ControlSiswa] as string;
          if (str(target, column) !== next) updates[column] = next;
        }
        if (Object.keys(updates).length === 0) {
          unchanged += 1;
        } else {
          await tx.update("siswa", str(target, "id"), updates);
          updated += 1;
        }
        continue;
      }

      let kode = nextControlKode(incoming.cabang_id, incoming.jenjang, used);
      while (byKode.has(kode.toUpperCase())) {
        kode = nextControlKode(incoming.cabang_id, incoming.jenjang, used);
      }
      const created = await tx.append("siswa", {
        kode,
        nama: incoming.nama,
        cabang_id: incoming.cabang_id,
        jenjang: incoming.jenjang,
        kelas_tujuan: incoming.kelas_tujuan,
        no_hp_wali: incoming.no_hp_wali,
        email: incoming.email,
        jenis_kelamin: incoming.jenis_kelamin,
        program_jurusan: incoming.program_jurusan,
        status_ujian: "belum",
      });
      byKode.set(kode.toUpperCase(), created);
      const createdKey = naturalKey(
        str(created, "nama"),
        str(created, "no_hp_wali"),
        str(created, "cabang_id"),
        str(created, "jenjang"),
      );
      byNatural.set(createdKey, [
        ...(byNatural.get(createdKey) ?? []),
        created,
      ]);
      inserted += 1;
    }

    return { cabangAdded, inserted, updated, unchanged, skipped, issues };
  });
}
