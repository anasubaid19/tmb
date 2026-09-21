import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "tmb_theme";

/** Normalisasi nilai mentah (localStorage) → Theme; tak dikenal = system. */
export function normalizeTheme(value: unknown): Theme {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

/** Preferensi → tema efektif. `system` mengikuti OS. */
export function resolveTheme(pref: Theme, systemDark: boolean): ResolvedTheme {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

/** Terang → gelap → sistem → terang. */
export function nextTheme(pref: Theme): Theme {
  if (pref === "light") return "dark";
  if (pref === "dark") return "system";
  return "light";
}

function readStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system"; /* localStorage penuh/diblokir — abaikan */
  }
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<Theme>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setPreferenceState(readStoredTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  function setPreference(next: Theme) {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* localStorage penuh/diblokir — abaikan */
    }
  }

  return { preference, resolved, setPreference };
}
