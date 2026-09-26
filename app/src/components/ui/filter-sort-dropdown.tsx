"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "#/lib/utils";

/**
 * Dropdown gaya native-select (adaptasi FilterSortDropdown dari
 * Opensource UI, MIT) — trigger menampilkan label + nilai terpilih, menu
 * menempel tepat di bawah trigger dengan lebar sama, opsi aktif bertanda
 * border kiri. Dipakai untuk memilih cabang pengumuman (16+ opsi).
 */
export type FilterSortOption = Readonly<{
  id: string;
  label: string;
}>;

export type FilterSortDropdownProps = Readonly<
  {
    label?: string;
    triggerAriaLabel?: string;
    menuAriaLabel?: string;
    value?: string;
    options?: readonly FilterSortOption[];
    onValueChange?: (option: FilterSortOption) => void;
  } & ComponentPropsWithoutRef<"div">
>;

function OptionRow({
  option,
  selected,
  onSelect,
}: {
  option: FilterSortOption;
  selected: boolean;
  onSelect: (option: FilterSortOption) => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      aria-label={option.label}
      onClick={() => onSelect(option)}
      className={cn(
        "flex w-full cursor-pointer items-center border-l-2 px-3 py-2 text-left text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-accent text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-accent",
      )}
    >
      {option.label}
    </button>
  );
}

export const FilterSortDropdown = forwardRef<
  HTMLDivElement,
  FilterSortDropdownProps
>(
  (
    {
      label = "Pilih",
      triggerAriaLabel = "Pilih opsi",
      menuAriaLabel = "Daftar opsi",
      value = "",
      options = [],
      onValueChange,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const selected = options.find((o) => o.id === value) ?? options[0];

    useEffect(() => {
      const closeOnOutside = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
      };
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", closeOnOutside);
      document.addEventListener("keydown", closeOnEscape);
      return () => {
        document.removeEventListener("mousedown", closeOnOutside);
        document.removeEventListener("keydown", closeOnEscape);
      };
    }, []);

    const select = (option: FilterSortOption) => {
      setOpen(false);
      onValueChange?.(option);
    };

    return (
      <div
        ref={ref}
        data-slot="filter-sort-dropdown"
        className={cn("relative inline-block w-52 font-sans", className)}
        {...props}
      >
        <div ref={rootRef} className="relative">
          <button
            type="button"
            aria-label={`${triggerAriaLabel}: ${selected?.label ?? value}`}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={open ? menuId : undefined}
            onClick={() => setOpen((p) => !p)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen((p) => !p);
              }
            }}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              open ? "border-ring" : "border-input hover:border-ring",
            )}
          >
            <span className="min-w-0">
              <span className="block text-[10px] text-muted-foreground">
                {label}
              </span>
              <span className="mt-0.5 block truncate text-xs font-medium text-foreground">
                {selected?.label}
              </span>
            </span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              className={cn(
                "shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label={menuAriaLabel}
              className="absolute inset-x-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border bg-popover py-1 shadow-md"
            >
              {options.map((option) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  selected={option.id === selected?.id}
                  onSelect={select}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

FilterSortDropdown.displayName = "FilterSortDropdown";
