"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STOCK_UNITS, STOCK_UNIT_LABEL } from "@/lib/stock-unit";

interface StockUnitSelectProps {
  /** The selected unit, or "" before one is chosen. */
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * The product "Unit" picker: a normal `Select`, plus a search box pinned at the
 * top of the dropdown to filter the 16 units by name (typing "spoon" narrows to
 * tea/tablespoon, "kg" to kg). Shared by Add and Edit so the two stay in step.
 *
 * `ref` and the aria props threaded through by `FormControl` land on the trigger
 * — the focusable control — exactly as they did on the bare `SelectTrigger`.
 */
export const StockUnitSelect = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  StockUnitSelectProps & React.ComponentPropsWithoutRef<typeof SelectTrigger>
>(({ value, onValueChange, ...triggerProps }, ref) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STOCK_UNITS;
    return STOCK_UNITS.filter(
      (unit) =>
        STOCK_UNIT_LABEL[unit].toLowerCase().includes(q) ||
        unit.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Start each visit from the full list, never a stale filter.
        if (!next) setQuery("");
      }}
    >
      <SelectTrigger ref={ref} {...triggerProps}>
        <SelectValue placeholder="Select a unit" />
      </SelectTrigger>
      <SelectContent>
        <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-1 border-b border-line bg-surface p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search units…"
              className="h-9 pl-8"
              // Radix Select owns typeahead and arrow navigation; without this it
              // would swallow the keystrokes instead of letting us type/filter.
              // Escape still bubbles so the dropdown closes as usual.
              onKeyDown={(e) => {
                if (e.key !== "Escape") e.stopPropagation();
              }}
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted">
            No units match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          filtered.map((unit) => (
            <SelectItem key={unit} value={unit}>
              {STOCK_UNIT_LABEL[unit]}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
});
StockUnitSelect.displayName = "StockUnitSelect";
