"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateFilterValue, DateRangePreset } from "@/lib/date-range";

/**
 * The branch list date filter: Today, the two rolling windows, and a single
 * chosen day. "Last week"/"Last month" are the previous 7 / 30 days up to today
 * (see `resolveDateRange`), not calendar weeks/months. Controlled — the page
 * owns the value and turns it into a range with `resolveDateRange`.
 */
const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "single", label: "Particular date" },
];

export function BranchDateFilter({
  value,
  onChange,
}: {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={value.preset}
        onValueChange={(v) => onChange({ ...value, preset: v as DateRangePreset })}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "single" && (
        <Input
          type="date"
          className="sm:w-44"
          aria-label="Particular date"
          value={value.single}
          onChange={(e) => onChange({ ...value, single: e.target.value })}
        />
      )}
    </div>
  );
}
