"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TAGS, type EventTag } from "@/lib/types/forecast";

/** "IFTAR_ITEM" → "Iftar item"; the GENERAL wildcard gets a hint. */
export function formatTag(tag: EventTag): string {
  const words = tag.toLowerCase().replace(/_/g, " ");
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  return tag === "GENERAL" ? "General (whole menu)" : label;
}

/**
 * The event's tag → multiplier list. Sending this replaces the whole set for the
 * event (§4 PATCH / §4 POST). GENERAL is offered here — it is the wildcard that
 * lifts every product — but never as a product tag.
 */
export function EventMultipliersField({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const entries = Object.entries(value);
  const available = EVENT_TAGS.filter((t) => !(t in value));

  const setOne = (tag: string, multiplier: string) =>
    onChange({ ...value, [tag]: multiplier });

  const remove = (tag: string) => {
    const next = { ...value };
    delete next[tag];
    onChange(next);
  };

  const add = (tag: string) => onChange({ ...value, [tag]: "2.00" });

  return (
    <div className="space-y-2">
      <Label>Category multipliers</Label>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">
          No category is lifted yet. Add one to say a group of products sells more.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([tag, multiplier]) => (
            <div key={tag} className="flex items-center gap-2">
              <span className="min-w-[10rem] text-sm text-content">
                {formatTag(tag as EventTag)}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-muted">×</span>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  inputMode="decimal"
                  className="h-8 w-24 tabular-nums"
                  value={multiplier}
                  onChange={(e) => setOne(tag, e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => remove(tag)}
                aria-label={`Remove ${formatTag(tag as EventTag)}`}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <Select value="" onValueChange={add}>
          <SelectTrigger className="w-64">
            <span className="flex items-center gap-1.5 text-muted">
              <Plus className="size-4" aria-hidden />
              Add a category
            </span>
          </SelectTrigger>
          <SelectContent>
            {available.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {formatTag(tag)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
