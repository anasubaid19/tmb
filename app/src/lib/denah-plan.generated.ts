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
    zone: "Khusus Akhwat — SD, SMP & SMA",
    aspect: 2.184,
    rooms: [
      { key: "rmd", label: "R. MD", type: "kantor", x: 0, y: 0, w: 14.97, h: 9.29 },
      { key: "rguru", label: "R. GURU", type: "kantor", x: 14.97, y: 0, w: 25.09, h: 9.29 },
      { key: "toilet", label: "TOILET", type: "toilet", x: 39.96, y: 0, w: 10.09, h: 9.29 },
      { key: "in1", label: "IN-1", type: "in", x: 9.99, y: 9.07, w: 10.09, h: 9.29 },
      { key: "in2", label: "IN-2", type: "in", x: 29.97, y: 9.07, w: 10.09, h: 9.29 },
      { key: "pir2", label: "PIR-2", type: "pir", x: 39.96, y: 9.07, w: 10.09, h: 9.29 },
      { key: "pir1", label: "PIR-1", type: "pir", x: 19.98, y: 9.07, w: 10.09, h: 9.29 },
      { key: "rwakasek", label: "R. WAKASEK", type: "kantor", x: 0, y: 9.07, w: 10.09, h: 18.15 },
      { key: "in3", label: "IN-3", type: "in", x: 39.96, y: 18.14, w: 10.09, h: 9.29 },
      { key: "rpresdir", label: "R. PRESDIR", type: "kantor", x: 9.99, y: 18.14, w: 10.09, h: 18.36 },
      { key: "pir3", label: "PIR-3", type: "pir", x: 39.96, y: 27.21, w: 10.09, h: 9.29 },
      { key: "rkepsek", label: "R. KEPSEK", type: "kantor", x: 0, y: 27.22, w: 10.09, h: 15.87 },
      { key: "pir5", label: "PIR-5", type: "pir", x: 9.99, y: 36.29, w: 10.09, h: 9.29 },
      { key: "in4", label: "IN-4", type: "in", x: 39.96, y: 36.29, w: 10.09, h: 9.29 },
      { key: "lapbadminton", label: "LAP. BADMINTON", type: "lapangan", x: 20.08, y: 36.5, w: 19.98, h: 9.07 },
      { key: "pir4", label: "PIR-4", type: "pir", x: 39.96, y: 45.36, w: 10.09, h: 9.29 },
      { key: "rdirpen", label: "R. DIRPEN", type: "kantor", x: 0, y: 43.09, w: 10.09, h: 11.34 },
      { key: "tanggaakhwat", label: "TANGGA AKHWAT", type: "tangga", x: 9.99, y: 45.36, w: 10.09, h: 9.29 },
      { key: "rfinance", label: "R. FINANCE", type: "kantor", x: 9.99, y: 54.43, w: 10.09, h: 9.29 },
      { key: "rwadir", label: "R. WADIR", type: "kantor", x: 0, y: 54.43, w: 10.09, h: 9.07 },
      { key: "rboarding", label: "R. BOARDING", type: "asrama", x: 49.95, y: 54.43, w: 10.09, h: 9.29 },
      { key: "rmarkaz", label: "R. MARKAZ", type: "kantor", x: 0, y: 63.5, w: 10.09, h: 9.07 },
      { key: "lift", label: "LIFT", type: "lift", x: 20.08, y: 63.71, w: 29.97, h: 9.07 },
      { key: "pir6", label: "PIR-6", type: "pir", x: 9.99, y: 63.5, w: 10.09, h: 9.29 },
      { key: "wr1", label: "WR-1", type: "wr", x: 9.99, y: 72.57, w: 10.09, h: 9.29 },
      { key: "rarabic", label: "R. ARABIC", type: "kantor", x: 0, y: 72.57, w: 10.09, h: 9.07 },
      { key: "rcctv", label: "R. CCTV", type: "cctv", x: 49.95, y: 72.57, w: 12.5, h: 9.29 },
      { key: "rgym", label: "R. GYM", type: "gym", x: 62.45, y: 72.57, w: 17.57, h: 9.29 },
      { key: "toilet2", label: "TOILET", type: "toilet", x: 79.92, y: 72.57, w: 10.09, h: 9.29 },
      { key: "radministrasit", label: "R. ADMINISTRASI TU", type: "kantor", x: 19.98, y: 72.57, w: 20.08, h: 9.29 },
      { key: "rguru2", label: "R. GURU", type: "kantor", x: 0, y: 81.65, w: 10.09, h: 9.07 },
      { key: "rmeeting", label: "R. MEETING", type: "meeting", x: 49.95, y: 81.64, w: 10.09, h: 9.29 },
      { key: "lappingpong", label: "LAP. PING PONG", type: "lapangan", x: 60.04, y: 81.86, w: 17.35, h: 9.07 },
      { key: "labkomputer", label: "LAB. KOMPUTER", type: "lab", x: 77.39, y: 81.86, w: 22.61, h: 9.07 },
      { key: "tanggaikhwan", label: "TANGGA (IKHWAN)", type: "tangga", x: 39.96, y: 81.64, w: 10.09, h: 9.29 },
      { key: "rppdb", label: "R. PPDB", type: "kantor", x: 9.99, y: 81.64, w: 10.09, h: 18.36 },
      { key: "ryayasan", label: "R. YAYASAN", type: "kantor", x: 49.95, y: 90.71, w: 30.07, h: 9.29 },
      { key: "pir7", label: "PIR-7", type: "pir", x: 79.92, y: 90.71, w: 10.09, h: 9.29 },
      { key: "ruks", label: "R. UKS", type: "kesehatan", x: 0, y: 90.72, w: 10.09, h: 9.28 },
    ],
  },
  {
    id: "lt2",
    label: "Lantai 2",
    zone: "Khusus Ikhwan — SD, SMP & SMA",
    aspect: 2.013,
    rooms: [
      { key: "toiletikhwan", label: "TOILET IKHWAN", type: "toilet", x: 33.3, y: 0, w: 11.21, h: 9.29 },
      { key: "in7", label: "IN-7", type: "in", x: 22.2, y: 9.07, w: 11.21, h: 9.29 },
      { key: "pir8", label: "PIR-8", type: "pir", x: 11.1, y: 9.07, w: 11.21, h: 9.29 },
      { key: "rmusyrif", label: "R. MUSYRIF", type: "asrama", x: 33.3, y: 9.07, w: 11.21, h: 9.29 },
      { key: "in6", label: "IN-6", type: "in", x: 0, y: 9.07, w: 11.21, h: 9.17 },
      { key: "in5", label: "IN-5", type: "in", x: 0, y: 18.24, w: 11.21, h: 9.19 },
      { key: "wr4", label: "WR-4", type: "wr", x: 33.3, y: 18.14, w: 11.21, h: 9.29 },
      { key: "wr3", label: "WR-3", type: "wr", x: 0, y: 27.21, w: 11.21, h: 9.29 },
      { key: "in8", label: "IN-8", type: "in", x: 33.3, y: 27.21, w: 11.21, h: 9.29 },
      { key: "pir9", label: "PIR-9", type: "pir", x: 33.3, y: 36.28, w: 11.21, h: 9.29 },
      { key: "lapbadminton", label: "LAP. BADMINTON", type: "lapangan", x: 11.21, y: 45.58, w: 22.2, h: 9.07 },
      { key: "tanggaakhwat", label: "TANGGA AKHWAT", type: "tangga", x: 0, y: 45.35, w: 11.21, h: 9.29 },
      { key: "in9", label: "IN-9", type: "in", x: 33.3, y: 45.35, w: 11.21, h: 9.29 },
      { key: "rgc", label: "R. G&C", type: "kantor", x: 0, y: 54.42, w: 11.21, h: 9.29 },
      { key: "pir12", label: "PIR-12", type: "pir", x: 0, y: 63.5, w: 11.21, h: 9.17 },
      { key: "lift", label: "LIFT", type: "lift", x: 11.21, y: 63.72, w: 88.79, h: 9.07 },
      { key: "pir11", label: "PIR-11", type: "pir", x: 0, y: 72.67, w: 11.21, h: 9.19 },
      { key: "in11", label: "IN-11", type: "in", x: 55.49, y: 72.57, w: 11.09, h: 9.29 },
      { key: "in12", label: "IN-12", type: "in", x: 66.58, y: 72.57, w: 11.22, h: 9.29 },
      { key: "wr2", label: "WR-2", type: "wr", x: 44.4, y: 72.57, w: 11.21, h: 9.29 },
      { key: "in10", label: "IN-10", type: "in", x: 11.1, y: 72.57, w: 11.21, h: 9.29 },
      { key: "pir10", label: "PIR-10", type: "pir", x: 22.2, y: 72.57, w: 11.21, h: 9.29 },
      { key: "toiletakhwat", label: "TOILET AKHWAT", type: "toilet", x: 77.69, y: 72.57, w: 11.21, h: 9.29 },
      { key: "lappingpong", label: "LAP. PING PONG", type: "lapangan", x: 44.51, y: 81.86, w: 33.3, h: 9.07 },
      { key: "pir13", label: "PIR-13", type: "pir", x: 77.69, y: 81.64, w: 11.21, h: 9.29 },
      { key: "tanggaikhwan", label: "TANGGA (IKHWAN)", type: "tangga", x: 33.3, y: 81.64, w: 11.21, h: 9.29 },
      { key: "labipa", label: "LAB IPA", type: "lab", x: 33.41, y: 90.93, w: 22.2, h: 9.07 },
      { key: "rperpus", label: "R. PERPUS", type: "perpustakaan", x: 0, y: 81.64, w: 11.21, h: 18.36 },
      { key: "pir15", label: "PIR-15", type: "pir", x: 66.59, y: 90.71, w: 11.06, h: 9.29 },
      { key: "pir14", label: "PIR-14", type: "pir", x: 77.66, y: 90.71, w: 11.24, h: 9.29 },
      { key: "in13", label: "IN-13", type: "in", x: 55.49, y: 90.71, w: 11.21, h: 9.29 },
    ],
  },
  {
    id: "lt3",
    label: "Lantai 3",
    zone: "Khusus Ikhwan — SD, SMP & SMA",
    aspect: 1.965,
    rooms: [
      { key: "toilet", label: "TOILET", type: "toilet", x: 33.3, y: 0, w: 11.21, h: 9.29 },
      { key: "rkamar", label: "R. KAMAR", type: "asrama", x: 22.2, y: 9.07, w: 11.14, h: 9.29 },
      { key: "in16", label: "IN-16", type: "in", x: 0, y: 9.07, w: 11.21, h: 9.29 },
      { key: "pir16", label: "PIR-16", type: "pir", x: 11.1, y: 9.07, w: 11.21, h: 9.29 },
      { key: "rmusyrif", label: "R. MUSYRIF", type: "asrama", x: 33.34, y: 9.07, w: 11.16, h: 9.29 },
      { key: "in15", label: "IN-15", type: "in", x: 0, y: 18.14, w: 11.21, h: 9.29 },
      { key: "in14", label: "IN-14", type: "in", x: 0, y: 27.21, w: 11.21, h: 9.29 },
      { key: "rkamar2", label: "R. KAMAR", type: "asrama", x: 33.3, y: 27.21, w: 11.21, h: 9.29 },
      { key: "tangga", label: "TANGGA", type: "tangga", x: 0, y: 36.29, w: 11.21, h: 18.36 },
      { key: "lapbadminton", label: "LAP. BADMINTON", type: "lapangan", x: 11.21, y: 36.5, w: 22.2, h: 18.14 },
      { key: "lift", label: "LIFT", type: "lift", x: 11.21, y: 54.64, w: 88.79, h: 18.14 },
      { key: "in17", label: "IN-17", type: "in", x: 44.4, y: 72.57, w: 11.21, h: 9.29 },
      { key: "rkamar3", label: "R. KAMAR", type: "asrama", x: 0, y: 54.43, w: 11.21, h: 45.57 },
      { key: "rkamar4", label: "R. KAMAR", type: "asrama", x: 11.1, y: 72.57, w: 22.31, h: 9.29 },
      { key: "rkamar5", label: "R. KAMAR", type: "asrama", x: 55.49, y: 72.57, w: 11.18, h: 9.29 },
      { key: "rkamar6", label: "R. KAMAR", type: "asrama", x: 66.67, y: 72.57, w: 11.13, h: 9.29 },
      { key: "toilet2", label: "TOILET", type: "toilet", x: 77.69, y: 72.57, w: 11.21, h: 9.29 },
      { key: "pir17", label: "PIR-17", type: "pir", x: 44.4, y: 81.64, w: 11.21, h: 9.29 },
      { key: "rkamar7", label: "R. KAMAR", type: "asrama", x: 77.69, y: 81.64, w: 11.21, h: 9.29 },
      { key: "tangga2", label: "TANGGA", type: "tangga", x: 33.3, y: 81.64, w: 11.21, h: 9.29 },
      { key: "lappingpong", label: "LAP. PING PONG", type: "lapangan", x: 55.6, y: 81.86, w: 22.2, h: 9.07 },
      { key: "labipa", label: "LAB IPA", type: "lab", x: 33.41, y: 90.93, w: 22.2, h: 9.07 },
      { key: "rkamar8", label: "R. KAMAR", type: "asrama", x: 55.49, y: 90.71, w: 33.41, h: 9.29 },
    ],
  },
  {
    id: "lt4",
    label: "Lantai 3 Masjid",
    zone: "Khusus Akhwat — SD, SMP & SMA",
    aspect: 3.43,
    rooms: [
      { key: "tangga", label: "TANGGA", type: "tangga", x: 11, y: 0, w: 11.22, h: 16.98 },
      { key: "tangga2", label: "TANGGA", type: "tangga", x: 66.56, y: 0, w: 11.22, h: 16.98 },
      { key: "wr5", label: "WR5", type: "wr", x: 33.22, y: 0, w: 22.33, h: 16.98 },
      { key: "pir19", label: "PIR-19", type: "pir", x: 55.45, y: 16.6, w: 11.22, h: 16.98 },
      { key: "pir18", label: "PIR-18", type: "pir", x: 22.11, y: 16.6, w: 11.22, h: 16.98 },
      { key: "in22", label: "IN-22", type: "in", x: 33.22, y: 33.21, w: 22.33, h: 16.98 },
      { key: "lorong", label: "LORONG", type: "lorong", x: 0, y: 50.19, w: 100, h: 16.6 },
      { key: "in21", label: "IN-21", type: "in", x: 55.44, y: 66.42, w: 11.22, h: 33.58 },
      { key: "in18", label: "IN-18", type: "in", x: 22.11, y: 66.42, w: 11.12, h: 33.58 },
      { key: "in20", label: "IN-20", type: "in", x: 44.34, y: 66.42, w: 11.11, h: 33.58 },
      { key: "in19", label: "IN-19", type: "in", x: 33.23, y: 66.42, w: 11.11, h: 33.58 },
    ],
  },
  {
    id: "lt5",
    label: "Lantai 4 Masjid",
    zone: "Khusus Akhwat — SD, SMP & SMA",
    aspect: 2.215,
    rooms: [
      { key: "tangga", label: "TANGGA", type: "tangga", x: 0, y: 0, w: 16.8, h: 14.6 },
      { key: "tangga2", label: "TANGGA", type: "tangga", x: 83.2, y: 0, w: 16.8, h: 14.6 },
      { key: "toiletakhwat", label: "TOILET AKHWAT", type: "toilet", x: 16.64, y: 0, w: 16.8, h: 14.6 },
      { key: "toiletakhwat2", label: "TOILET AKHWAT", type: "toilet", x: 66.56, y: 0, w: 16.8, h: 14.6 },
      { key: "wr6", label: "WR6", type: "wr", x: 33.28, y: 0, w: 33.44, h: 14.6 },
      { key: "rgudang", label: "R. GUDANG", type: "gudang", x: 0, y: 28.47, w: 16.8, h: 14.6 },
      { key: "toiletakhwat3", label: "TOILET AKHWAT", type: "toilet", x: 83.2, y: 28.47, w: 16.8, h: 14.6 },
      { key: "in26", label: "IN-26", type: "in", x: 66.56, y: 42.7, w: 16.8, h: 14.6 },
      { key: "in23", label: "IN-23", type: "in", x: 16.64, y: 42.7, w: 16.8, h: 14.6 },
      { key: "in24", label: "IN-24", type: "in", x: 16.64, y: 56.93, w: 16.8, h: 14.38 },
      { key: "in27", label: "IN-27", type: "in", x: 66.56, y: 56.93, w: 16.8, h: 14.41 },
      { key: "in25", label: "IN-25", type: "in", x: 16.64, y: 71.32, w: 16.8, h: 14.45 },
      { key: "in28", label: "IN-28", type: "in", x: 66.56, y: 71.35, w: 16.8, h: 14.42 },
      { key: "pir21", label: "PIR-21", type: "pir", x: 66.56, y: 85.4, w: 16.8, h: 14.6 },
      { key: "pir20", label: "PIR-20", type: "pir", x: 16.64, y: 85.4, w: 16.8, h: 14.6 },
    ],
  },
];
