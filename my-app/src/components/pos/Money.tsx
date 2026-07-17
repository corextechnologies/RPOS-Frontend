"use client";

import { formatMinor, type Minor } from "@/lib/money";
import { usePosCurrency } from "@/lib/pos/pos-session";
import { cn } from "@/lib/utils";

/**
 * Renders minor units using THIS branch's pack — currency and minor_units both
 * come from the server, never from a constant. That is why this is a component
 * and not a bare `formatMinor` call at every site: it makes the correct thing
 * the easy thing, and there is no way to accidentally render PKR maths with
 * AED's rules.
 */
export function Money({
  minor,
  className,
  emphasis = false,
}: {
  minor: Minor;
  className?: string;
  emphasis?: boolean;
}) {
  const { currency, minorUnits } = usePosCurrency();
  return (
    <span
      className={cn(
        "tabular-nums",
        emphasis && "font-display font-semibold tracking-tight",
        className,
      )}
    >
      {formatMinor(minor, currency, minorUnits)}
    </span>
  );
}
