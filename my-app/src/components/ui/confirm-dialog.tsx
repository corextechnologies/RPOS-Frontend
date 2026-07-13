"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  typeToConfirm?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  typeToConfirm,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped("");
    onOpenChange(next);
  };

  const canConfirm = !typeToConfirm || typed === typeToConfirm;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {typeToConfirm && (
          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              Type <span className="font-semibold text-content">{typeToConfirm}</span> to confirm
            </Label>
            <Input
              id="confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={typeToConfirm}
              autoComplete="off"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!canConfirm || loading}
            onClick={async () => {
              await onConfirm();
              setTyped("");
            }}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
