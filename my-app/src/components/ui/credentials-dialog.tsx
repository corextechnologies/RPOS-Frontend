"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantName: string;
  email: string;
  temporaryPassword: string;
  emailed: boolean;
  onDone: () => void;
}

export function CredentialsDialog({
  open,
  onOpenChange,
  restaurantName,
  email,
  temporaryPassword,
  emailed,
  onDone,
}: CredentialsDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyCredentials = async () => {
    const text = `Restaurant: ${restaurantName}\nEmail: ${email}\nTemporary password: ${temporaryPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin credentials created</DialogTitle>
          <DialogDescription>
            Share these credentials with the restaurant admin. They will only be shown once.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Login email</p>
            <p className="mt-1 font-mono text-sm text-content">{email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Temporary password</p>
            <p className="mt-1 font-mono text-sm text-content">{temporaryPassword}</p>
          </div>
          {emailed && (
            <Badge variant="success" className="gap-1">
              <Mail className="h-3 w-3" />
              Credentials emailed
            </Badge>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={copyCredentials}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy credentials"}
          </Button>
          <Button
            onClick={() => {
              onDone();
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
