import {
  ComputerIcon,
  Moon01Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "#/components/ui/button";
import { Icon } from "#/components/ui/icon";
import { nextTheme, type Theme, useTheme } from "#/lib/theme";

const LABEL: Record<Theme, string> = {
  light: "Terang",
  dark: "Gelap",
  system: "Sistem",
};

const ICON = {
  light: Sun01Icon,
  dark: Moon01Icon,
  system: ComputerIcon,
} as const;

/**
 * Tombol siklus tema (terang → gelap → sistem). Satu instance global dari
 * __root; offset mobile agar tak bentrok bar bawah `fixed z-40` tiap portal.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const label = `Tema: ${LABEL[preference]}`;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setPreference(nextTheme(preference))}
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 rounded-full shadow-sm md:bottom-4"
    >
      <Icon icon={ICON[preference]} size={20} />
    </Button>
  );
}
