import { Dialog } from "@base-ui/react/dialog";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { Icon } from "#/components/ui/icon";
import { cn } from "#/lib/utils";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Lebar penuh untuk penampil konten besar (denah) — default sempit untuk form. */
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg outline-none",
            wide ? "sm:max-w-5xl" : "sm:max-w-md",
          )}
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description
              className={cn("mt-1 text-sm text-muted-foreground")}
            >
              {description}
            </Dialog.Description>
          ) : null}
          <div className="mt-4">{children}</div>
          <Dialog.Close
            aria-label="Tutup"
            className="absolute right-4 top-4 rounded-sm text-muted-foreground after:absolute after:-inset-3 hover:text-foreground"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
