/**
 * Beep scanner — file MP3 (bukan oscillator).
 *
 * Petugas mendengar hasilnya sebelum sempat melihat layar, jadi bunyi sukses
 * dan gagal harus jelas berbeda. File ada di `public/sounds/`.
 */

export type BeepKind = "success" | "error";

let _muted = false;
export function setMuted(v: boolean) {
  _muted = v;
}
export function isMuted() {
  return _muted;
}

const AUDIO: Record<BeepKind, HTMLAudioElement | null> = {
  success:
    typeof document !== "undefined" ? new Audio("/sounds/success.mp3") : null,
  error:
    typeof document !== "undefined" ? new Audio("/sounds/error.mp3") : null,
};

let primed = false;

/**
 * Harus dipanggil dari gesture pengguna (mis. saat menyalakan kamera).
 *
 * iOS memblokir `play()` programatik: elemen audio harus "dibuka" sekali di
 * dalam gesture. Kita resume context + prime kedua file supaya senyap tapi
 * tidak terkunci — tanpa ini, bunyi scan pertama di iPhone tidak keluar.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!primed) {
    primed = true;
    for (const a of Object.values(AUDIO)) {
      if (!a) continue;
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    }
  }
}

export function beep(kind: BeepKind) {
  // ponytail: haptik menyatu dengan bunyi di event kausal yang sama —
  // visual, audio, haptik satu frame. Tetap jalan saat suara di-mute (seperti
  // silent-switch iPhone); no-op di browser tanpa dukungan vibrate.
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(kind === "success" ? 15 : [40, 40, 40]);
  }
  if (_muted) return;
  unlockAudio();
  const audio = AUDIO[kind];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
