"use client";

import { cn } from "@/lib/utils";

/**
 * A count variance, coloured by sign.
 *
 * Negative is missing stock and positive is a surplus; zero is the normal case
 * and is deliberately quiet rather than green — most lines match, and colouring
 * them all would drown out the ones that did not.
 */
export function CountVariance({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        value === 0 && "text-muted",
        value < 0 && "text-danger",
        value > 0 && "text-warning",
      )}
    >
      {value > 0 ? `+${value}` : value}
    </span>
  );
}
