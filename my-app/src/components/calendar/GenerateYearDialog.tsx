"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateCalendar } from "@/lib/hooks/use-calendar";

/**
 * Generate the year's calendar (§3c) — six national holidays plus Ramadan, both
 * Eids and Ashura. Safe to re-run: events a human confirmed are kept untouched.
 */
export function GenerateYearDialog({ defaultYear }: { defaultYear: number }) {
  const generate = useGenerateCalendar();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(defaultYear));

  const years = [defaultYear - 1, defaultYear, defaultYear + 1, defaultYear + 2];

  const run = () =>
    generate.mutate(Number(year), { onSuccess: () => setOpen(false) });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus className="mr-1.5 size-4" aria-hidden />
          Generate year
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate the calendar</DialogTitle>
          <DialogDescription>
            Creates the national holidays plus Ramadan, both Eids and Ashura for the year.
            Re-running is safe — anything you&apos;ve confirmed is left alone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="gen-year">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger id="gen-year" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={generate.isPending}>
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
