import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "#/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        // ponytail: Base UI menaruh data-orientation="horizontal|vertical",
        // bukan atribut data-horizontal, samakan via prop, bukan selektor data.
        "shrink-0 bg-border",
        orientation === "vertical" ? "w-px self-stretch" : "h-px w-full",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
