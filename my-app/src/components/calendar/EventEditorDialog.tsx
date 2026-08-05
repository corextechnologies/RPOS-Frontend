"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventMultipliersField } from "@/components/calendar/EventMultipliersField";
import { WeekdayDial } from "@/components/calendar/WeekdayDial";
import { useCreateEvent, useUpdateEvent } from "@/lib/hooks/use-calendar";
import type { Branch } from "@/lib/types/admin";
import type { CalendarEvent } from "@/lib/types/forecast";

const WHOLE_RESTAURANT = "all";

/**
 * Create (MANUAL) or edit any event (§4). `multipliers` replaces the whole set
 * on save. Editing the dates of a LUNAR event clears `is_estimated` on the
 * backend; a later generate won't overwrite a confirmed date.
 */
export function EventEditorDialog({
  open,
  onOpenChange,
  event,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new manual event. */
  event: CalendarEvent | null;
  branches: Branch[];
}) {
  const isEdit = !!event;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const pending = createEvent.isPending || updateEvent.isPending;

  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [weekday, setWeekday] = useState("1.00");
  const [branchId, setBranchId] = useState(WHOLE_RESTAURANT);
  const [note, setNote] = useState("");
  const [multipliers, setMultipliers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (event) {
      setName(event.name);
      setStartsOn(event.starts_on);
      setEndsOn(event.ends_on);
      setWeekday(event.weekly_factor_weight);
      setBranchId(event.branch_id == null ? WHOLE_RESTAURANT : String(event.branch_id));
      setNote(event.note ?? "");
      setMultipliers(Object.fromEntries(event.multipliers.map((m) => [m.tag, m.multiplier])));
    } else {
      setName("");
      setStartsOn("");
      setEndsOn("");
      setWeekday("1.00");
      setBranchId(WHOLE_RESTAURANT);
      setNote("");
      setMultipliers({});
    }
  }, [open, event]);

  const datesValid = !!startsOn && !!endsOn && startsOn <= endsOn;
  const canSubmit = !!name.trim() && datesValid && !pending;

  const submit = () => {
    if (!canSubmit) return;
    const branch_id = branchId === WHOLE_RESTAURANT ? null : Number(branchId);
    const body = {
      name: name.trim(),
      starts_on: startsOn,
      ends_on: endsOn,
      weekly_factor_weight: weekday,
      branch_id,
      note: note.trim() || null,
      multipliers,
    };
    const onSuccess = () => onOpenChange(false);
    if (event) updateEvent.mutate({ eventId: event.id, input: body }, { onSuccess });
    else createEvent.mutate(body, { onSuccess });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${event?.name}` : "Add an event"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes replace this event's whole multiplier set."
              : "A one-off event — a match, a promo, anything the calendar doesn't already know."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-name">Name</Label>
            <Input
              id="ev-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PAK vs IND Final"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Starts</Label>
              <Input
                id="ev-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">Ends</Label>
              <Input
                id="ev-end"
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>
          {!datesValid && startsOn && endsOn && (
            <p className="text-sm text-danger">The end date can&apos;t be before the start.</p>
          )}

          <WeekdayDial value={weekday} onChange={setWeekday} id="ev-weekday" />

          <div className="space-y-1.5">
            <Label htmlFor="ev-branch">Applies to</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger id="ev-branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WHOLE_RESTAURANT}>Whole restaurant</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <EventMultipliersField value={multipliers} onChange={setMultipliers} />

          <div className="space-y-1.5">
            <Label htmlFor="ev-note">Note (optional)</Label>
            <Textarea id="ev-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {pending ? "Saving…" : isEdit ? "Save event" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
