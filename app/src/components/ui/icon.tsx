import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon, type HugeiconsProps } from "@hugeicons/react";

export function Icon({
  icon,
  size = 20,
  ...props
}: { icon: IconSvgElement } & Omit<HugeiconsProps, "icon">) {
  return <HugeiconsIcon icon={icon} size={size} {...props} />;
}
