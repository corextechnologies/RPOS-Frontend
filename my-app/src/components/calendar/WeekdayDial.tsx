"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The weekday dial (§4b) — `weekly_factor_weight`, "does the normal weekday
 * pattern still apply?". A small set of documented choices; where two events
 * overlap the lowest wins, but that's the backend's business, not this control's.
 */
const PRESETS = [
  { value: "1.00", label: "Applies fully", hint: "Event adds on top of a normal day (match, promo)" },
  { value: "0.50", label: "Half applies", hint: "Typical national holiday" },
  { value: "0.30", label: "Mostly replaced", hint: "Ramadan" },
  { value: "0.00", label: "Replaced entirely", hint: "Eid — the day is its own thing" },
] as const;

export function WeekdayDial({
  value,
  onChange,
  id = "weekday-dial",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const matched = PRESETS.find((p) => Number(p.value) === Number(value));
  const options = matched
    ? PRESETS
    : [{ value, label: `Custom (${value})`, hint: "" }, ...PRESETS];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Does the normal weekday pattern still apply?</Label>
      <Select value={matched?.value ?? value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              <span className="font-medium">{p.label}</span>
              {p.hint ? <span className="ml-2 text-muted">· {p.hint}</span> : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
