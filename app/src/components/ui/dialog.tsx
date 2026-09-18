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
  sheet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Lebar penuh untuk penampil konten besar (denah) — default sempit untuk form. */
  wide?: boolean;
  /** Bottom-sheet di HP (gaya aplikasi mobile) — tengah di desktop. */
  sheet?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 z-50 w-full max-w-[calc(100vw-2rem)] border bg-card p-6 shadow-lg outline-none",
            sheet
              ? // ponytail: cabang utuh, bukan override — menimpa
                // -translate-y-1/2 dgn translate-y-0 tak dapat diandalkan
                // (urutan CSS yg menang, bukan urutan class).
                "bottom-0 top-auto max-h-[92dvh] -translate-x-1/2 overflow-y-auto rounded-b-none rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-6"
              : "top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl",
            wide ? "sm:max-w-5xl" : "sm:max-w-md",
          )}
        >
          {sheet ? (
            <div
              aria-hidden
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden"
            />
          ) : null}
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
