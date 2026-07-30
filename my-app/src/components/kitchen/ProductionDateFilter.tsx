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

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "custom", label: "Custom range" },
  { value: "single", label: "Specific date" },
];

/**
 * Date filter for the Production lists. A preset dropdown, plus inline date
 * inputs when the operator picks a custom range or a single day. Controlled: the
 * page owns the value and turns it into a range with `resolveDateRange`.
 */
export function ProductionDateFilter({
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
          aria-label="Date"
          value={value.single}
          onChange={(e) => onChange({ ...value, single: e.target.value })}
        />
      )}

      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="sm:w-40"
            aria-label="From date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <span className="text-sm text-muted">to</span>
          <Input
            type="date"
            className="sm:w-40"
            aria-label="To date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
