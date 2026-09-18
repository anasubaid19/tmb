// GENERATED — jangan edit manual.
// Dibuat oleh scripts/denah_from_svg.ts dari denah-ruangan-tes-bersama.svg.
// Regen: bun scripts/denah_from_svg.ts && bun run check:fix && bun run build

export type DenahRoomType =
  | "pir"
  | "in"
  | "wr"
  | "toilet"
  | "tangga"
  | "lift"
  | "lapangan"
  | "gym"
  | "lab"
  | "kantor"
  | "kesehatan"
  | "perpustakaan"
  | "kelas"
  | "asrama"
  | "meeting"
  | "cctv"
  | "lorong"
  | "gudang"
;

export interface DenahRoom {
  key: string;
  label: string;
  type: DenahRoomType;
  /** Posisi & ukuran relatif lantai (persen 0..100). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DenahFloor {
  id: string;
  label: string;
  zone: string;
  /** Rasio lebar:tinggi area lantai. */
  aspect: number;
  rooms: DenahRoom[];
}

export const DENAH_FLOORS: DenahFloor[] = [
  {
    id: "lt1",
    label: "Lantai 1",
    zone: "SD, SMP & SMA — tiap sesi terjadwal",
    aspect: 2.093,
    rooms: [
      { key: "tiapsesiterjad", label: "TIAP SESI TERJADWAL)", type: "kantor", x: 50.57, y: -6.47, w: 32.48, h: 5.9 },
      { key: "rguru", label: "R. GURU", type: "kantor", x: 14.97, y: 0, w: 25.09, h: 8.9 },
      { key: "toilet", label: "TOILET", type: "toilet", x: 39.96, y: 0, w: 10.09, h: 8.9 },
      { key: "rmd", label: "R. MD", type: "kantor", x: 0, y: 0, w: 14.97, h: 8.9 },
      { key: "in1", label: "IN-1", type: "in", x: 9.99, y: 8.7, w: 10.09, h: 8.9 },
      { key: "pir1", label: "PIR-1", type: "pir", x: 19.98, y: 8.7, w: 10.09, h: 8.9 },
      { key: "in2", label: "IN-2", type: "in", x: 29.97, y: 8.7, w: 10.09, h: 8.9 },
      { key: "pir2", label: "PIR-2", type: "pir", x: 39.96, y: 8.7, w: 10.09, h: 8.9 },
      { key: "rwakasek", label: "R. WAKASEK", type: "kantor", x: 0, y: 8.7, w: 10.09, h: 17.39 },
      { key: "in3", label: "IN-3", type: "in", x: 39.96, y: 17.39, w: 10.09, h: 8.9 },
      { key: "rpresdir", label: "R. PRESDIR", type: "kantor", x: 9.99, y: 17.39, w: 10.09, h: 17.6 },
      { key: "pir3", label: "PIR-3", type: "pir", x: 39.96, y: 26.09, w: 10.09, h: 8.9 },
      { key: "rkepsek", label: "R. KEPSEK", type: "kantor", x: 0, y: 26.09, w: 10.09, h: 15.22 },
      { key: "pir5", label: "PIR-5", type: "pir", x: 9.99, y: 34.78, w: 10.09, h: 8.9 },
      { key: "in4", label: "IN-4", type: "in", x: 39.96, y: 34.78, w: 10.09, h: 8.9 },
      { key: "lapbadminton", label: "LAP. BADMINTON", type: "lapangan", x: 20.08, y: 43.69, w: 19.98, h: 8.7 },
      { key: "pir4", label: "PIR-4", type: "pir", x: 39.96, y: 43.48, w: 10.09, h: 8.9 },
      { key: "rdirpen", label: "R. DIRPEN", type: "kantor", x: 0, y: 41.31, w: 10.09, h: 10.87 },
      { key: "tanggaakhwat", label: "TANGGA AKHWAT", type: "tangga", x: 9.99, y: 43.48, w: 10.09, h: 8.9 },
      { key: "rfinance", label: "R. FINANCE", type: "kantor", x: 9.99, y: 52.17, w: 10.09, h: 8.9 },
      { key: "rwadir", label: "R. WADIR", type: "kantor", x: 0, y: 52.18, w: 10.09, h: 8.69 },
      { key: "rboarding", label: "R. BOARDING", type: "asrama", x: 49.95, y: 52.17, w: 10.09, h: 8.9 },
      { key: "rmarkaz", label: "R. MARKAZ", type: "kantor", x: 0, y: 60.87, w: 10.09, h: 8.7 },
      { key: "pir6", label: "PIR-6", type: "pir", x: 9.99, y: 60.87, w: 10.09, h: 8.9 },
      { key: "lift", label: "LIFT", type: "lift", x: 20.08, y: 61.08, w: 29.97, h: 8.7 },
      { key: "wr1", label: "WR-1", type: "wr", x: 9.99, y: 69.57, w: 10.09, h: 8.9 },
      { key: "radministrasit", label: "R. ADMINISTRASI TU", type: "kantor", x: 19.98, y: 69.57, w: 20.08, h: 8.9 },
      { key: "rarabic", label: "R. ARABIC", type: "kantor", x: 0, y: 69.56, w: 10.09, h: 9.73 },
      { key: "rcctv", label: "R. CCTV", type: "cctv", x: 49.95, y: 69.57, w: 12.5, h: 8.9 },
      { key: "rgym", label: "R. GYM", type: "gym", x: 62.45, y: 69.57, w: 17.56, h: 8.9 },
      { key: "toilet2", label: "TOILET", type: "toilet", x: 79.92, y: 69.57, w: 10.09, h: 8.9 },
      { key: "rguru2", label: "R. GURU", type: "kantor", x: 0, y: 79.3, w: 10.09, h: 10.77 },
      { key: "rmeeting", label: "R. MEETING", type: "meeting", x: 49.95, y: 78.26, w: 10.09, h: 13.04 },
      { key: "labkomputer", label: "LAB. KOMPUTER", type: "lab", x: 77.39, y: 78.47, w: 22.61, h: 12.84 },
      { key: "tanggaikhwan", label: "TANGGA (IKHWAN)", type: "tangga", x: 39.96, y: 78.26, w: 10.09, h: 13.04 },
      { key: "lappingpong", label: "LAP. PING PONG", type: "lapangan", x: 60.04, y: 78.47, w: 17.35, h: 12.84 },
      { key: "rppdb", label: "R. PPDB", type: "kantor", x: 9.99, y: 78.26, w: 10.09, h: 21.74 },
      { key: "ryayasan", label: "R. YAYASAN", type: "kantor", x: 49.95, y: 91.1, w: 30.07, h: 8.9 },
      { key: "ruks", label: "R. UKS", type: "kesehatan", x: 0, y: 90.06, w: 10.09, h: 9.94 },
      { key: "ruangbuku", label: "RUANG BUKU", type: "kantor", x: 79.92, y: 91.1, w: 10.09, h: 8.9 },
    ],
  },
  {
    id: "lt2",
    label: "Lantai 2",
    zone: "SD, SMP & SMA — tiap sesi terjadwal",
    aspect: 1.924,
    rooms: [
      { key: "tiapsesiterjad", label: "TIAP SESI TERJADWAL)", type: "kantor", x: 45.09, y: -6.6, w: 36.09, h: 6.03 },
      { key: "toiletikhwan", label: "TOILET IKHWAN", type: "toilet", x: 33.3, y: 0, w: 11.21, h: 8.88 },
      { key: "in7", label: "IN-7", type: "in", x: 22.2, y: 8.67, w: 11.21, h: 8.88 },
      { key: "pir8", label: "PIR-8", type: "pir", x: 11.1, y: 8.67, w: 11.21, h: 8.88 },
      { key: "rmusyrif", label: "R. MUSYRIF", type: "asrama", x: 33.3, y: 8.67, w: 11.21, h: 8.88 },
      { key: "in6", label: "IN-6", type: "in", x: 0, y: 8.67, w: 11.21, h: 8.76 },
      { key: "in5", label: "IN-5", type: "in", x: 0, y: 17.43, w: 11.21, h: 8.79 },
      { key: "wr4", label: "WR-4", type: "wr", x: 33.3, y: 17.34, w: 11.21, h: 8.88 },
      { key: "wr3", label: "WR-3", type: "wr", x: 0, y: 26, w: 11.21, h: 8.88 },
      { key: "in8", label: "IN-8", type: "in", x: 33.3, y: 26, w: 11.21, h: 8.88 },
      { key: "pir9", label: "PIR-9", type: "pir", x: 33.3, y: 34.67, w: 11.21, h: 8.88 },
      { key: "tanggaakhwat", label: "TANGGA AKHWAT", type: "tangga", x: 0, y: 34.67, w: 11.21, h: 8.88 },
      { key: "lapbadminton", label: "LAP. BADMINTON", type: "lapangan", x: 11.21, y: 43.55, w: 22.2, h: 8.67 },
      { key: "in9", label: "IN-9", type: "in", x: 33.3, y: 43.34, w: 11.21, h: 8.88 },
      { key: "rgc", label: "R. G&C", type: "kantor", x: 0, y: 52.01, w: 11.21, h: 8.88 },
      { key: "pir12", label: "PIR-12", type: "pir", x: 0, y: 60.68, w: 11.21, h: 8.77 },
      { key: "lift", label: "LIFT", type: "lift", x: 11.21, y: 60.89, w: 88.79, h: 8.67 },
      { key: "in12", label: "IN-12", type: "in", x: 66.58, y: 69.34, w: 11.22, h: 8.88 },
      { key: "pir11", label: "PIR-11", type: "pir", x: 0, y: 69.44, w: 11.21, h: 8.78 },
      { key: "in11", label: "IN-11", type: "in", x: 55.49, y: 69.34, w: 11.09, h: 8.88 },
      { key: "wr2", label: "WR-2", type: "wr", x: 44.4, y: 69.34, w: 11.21, h: 8.88 },
      { key: "in10", label: "IN-10", type: "in", x: 11.1, y: 69.34, w: 11.21, h: 8.88 },
      { key: "pir10", label: "PIR-10", type: "pir", x: 22.2, y: 69.34, w: 11.21, h: 8.88 },
      { key: "toiletakhwat", label: "TOILET AKHWAT", type: "toilet", x: 77.69, y: 69.34, w: 11.21, h: 8.88 },
      { key: "pir13", label: "PIR-13", type: "pir", x: 77.69, y: 78.01, w: 11.21, h: 13.32 },
      { key: "tanggaikhwan", label: "TANGGA (IKHWAN)", type: "tangga", x: 33.3, y: 78.01, w: 11.21, h: 13.32 },
      { key: "lappingpong", label: "LAP. PING PONG", type: "lapangan", x: 58.29, y: 78.22, w: 19.51, h: 13.11 },
      { key: "labipa", label: "LAB IPA", type: "lab", x: 44.51, y: 78.22, w: 13.79, h: 13.11 },
      { key: "rperpus", label: "R. PERPUS", type: "perpustakaan", x: 0, y: 78.01, w: 11.21, h: 21.99 },
      { key: "pir14", label: "PIR-14", type: "pir", x: 77.67, y: 91.12, w: 11.23, h: 8.88 },
      { key: "in13", label: "IN-13", type: "in", x: 55.49, y: 91.12, w: 11.21, h: 8.88 },
      { key: "pir7", label: "PIR-7", type: "pir", x: 66.59, y: 91.12, w: 11.08, h: 8.88 },
    ],
  },
  {
    id: "lt3",
    label: "Lantai 3",
    zone: "Khusus Ikhwan — SD, SMP & SMA",
    aspect: 1.888,
    rooms: [
      { key: "toilet", label: "TOILET", type: "toilet", x: 33.3, y: 0, w: 11.21, h: 8.92 },
      { key: "rkamar", label: "R. KAMAR", type: "asrama", x: 22.2, y: 8.71, w: 11.15, h: 8.92 },
      { key: "rmusyrif", label: "R. MUSYRIF", type: "asrama", x: 33.34, y: 8.71, w: 11.16, h: 8.92 },
      { key: "in16", label: "IN-16", type: "in", x: 0, y: 8.71, w: 11.21, h: 8.92 },
      { key: "pir16", label: "PIR-16", type: "pir", x: 11.1, y: 8.71, w: 11.21, h: 8.92 },
      { key: "in15", label: "IN-15", type: "in", x: 0, y: 17.43, w: 11.21, h: 8.92 },
      { key: "in14", label: "IN-14", type: "in", x: 0, y: 26.14, w: 11.21, h: 8.92 },
      { key: "rkamar2", label: "R. KAMAR", type: "asrama", x: 33.3, y: 26.14, w: 11.21, h: 8.92 },
      { key: "tangga", label: "TANGGA", type: "tangga", x: 0, y: 34.85, w: 11.21, h: 17.63 },
      { key: "lapbadminton", label: "LAP. BADMINTON", type: "lapangan", x: 11.21, y: 35.06, w: 22.2, h: 17.43 },
      { key: "lift", label: "LIFT", type: "lift", x: 11.21, y: 52.49, w: 88.79, h: 17.43 },
      { key: "in17", label: "IN-17", type: "in", x: 44.4, y: 69.71, w: 11.21, h: 8.92 },
      { key: "rkamar3", label: "R. KAMAR", type: "asrama", x: 11.1, y: 69.71, w: 22.31, h: 8.92 },
      { key: "rkamar4", label: "R. KAMAR", type: "asrama", x: 55.49, y: 69.71, w: 11.18, h: 8.92 },
      { key: "rkamar5", label: "R. KAMAR", type: "asrama", x: 66.68, y: 69.71, w: 11.13, h: 8.92 },
      { key: "toilet2", label: "TOILET", type: "toilet", x: 77.69, y: 69.71, w: 11.21, h: 8.92 },
      { key: "rkamar6", label: "R. KAMAR", type: "asrama", x: 0, y: 52.28, w: 11.21, h: 47.72 },
      { key: "pir15", label: "PIR-15", type: "pir", x: 44.4, y: 78.42, w: 11.21, h: 12.86 },
      { key: "rkamar7", label: "R. KAMAR", type: "asrama", x: 77.69, y: 78.42, w: 11.21, h: 12.86 },
      { key: "tangga2", label: "TANGGA", type: "tangga", x: 33.3, y: 78.42, w: 11.21, h: 12.86 },
      { key: "lappingpong", label: "LAP. PING PONG", type: "lapangan", x: 55.6, y: 78.63, w: 22.2, h: 12.66 },
      { key: "labipa", label: "LAB IPA", type: "lab", x: 33.41, y: 91.29, w: 22.2, h: 8.71 },
      { key: "rkamar8", label: "R. KAMAR", type: "asrama", x: 55.49, y: 91.08, w: 33.41, h: 8.92 },
    ],
  },
];
