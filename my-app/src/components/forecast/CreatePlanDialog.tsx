"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { useCreatePlan } from "@/lib/hooks/use-forecast-plans";
import type { Branch } from "@/lib/types/admin";

/**
 * Create a draft plan (§7). Runs the forecast for the branch + range and stores
 * it as an editable draft, then jumps to the draft so the Admin can accept,
 * override, and confirm.
 */
export function CreatePlanDialog({
  defaultBranchId,
  defaultStart,
  defaultEnd,
  branches,
}: {
  defaultBranchId: string;
  defaultStart: string;
  defaultEnd: string;
  branches: Branch[];
}) {
  const router = useRouter();
  const createPlan = useCreatePlan();
  const [open, setOpen] = useState(false);

  const [branchId, setBranchId] = useState(defaultBranchId);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [note, setNote] = useState("");

  // Re-seed from the page's current pickers each time the dialog opens.
  useEffect(() => {
    if (open) {
      setBranchId(defaultBranchId);
      setStart(defaultStart);
      setEnd(defaultEnd);
      setNote("");
    }
  }, [open, defaultBranchId, defaultStart, defaultEnd]);

  const canSubmit = !!branchId && !!start && !createPlan.isPending;

  const submit = () => {
    if (!canSubmit) return;
    createPlan.mutate(
      { branch_id: branchId, start, end: end || start, note: note.trim() || undefined },
      {
        onSuccess: (plan) => {
          setOpen(false);
          router.push(`/admin/forecast/plans/${plan.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Create plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a plan</DialogTitle>
          <DialogDescription>
            Runs the forecast for this branch and range, then opens it as a draft you can
            edit before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan-branch">Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger id="plan-branch">
                <SelectValue placeholder="Choose a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-start">From</Label>
              <Input
                id="plan-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-end">To</Label>
              <Input
                id="plan-end"
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-note">Note (optional)</Label>
            <Textarea
              id="plan-note"
              placeholder="e.g. Ramadan week"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {createPlan.isPending ? "Creating…" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
