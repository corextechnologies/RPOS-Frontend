"use client";

import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WASTE_REASON_LABELS, type WasteReason } from "@/lib/stock/waste-reason";

interface WasteReasonSelectProps {
  value: WasteReason;
  onChange: (value: WasteReason) => void;
  label?: string;
}

/**
 * The one waste-reason picker, shared by both portals.
 *
 * Deliberately not portal-specific: waste-rate analytics aggregates on this
 * field across the Warehouse and Kitchen, so the two lists must never drift.
 */
export function WasteReasonSelect({
  value,
  onChange,
  label = "Reason",
}: WasteReasonSelectProps) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select value={value} onValueChange={(v) => onChange(v as WasteReason)}>
        <FormControl>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {Object.entries(WASTE_REASON_LABELS).map(([reason, text]) => (
            <SelectItem key={reason} value={reason}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}
