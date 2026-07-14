"use client";

import { useState } from "react";
import { Check, Copy, Mail, AlertTriangle } from "lucide-react";
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
  temporaryPassword?: string;
  credentialEmailSent: boolean;
  onDone: () => void;
  title?: string;
  description?: string;
  contextLabel?: string;
}

export function CredentialsDialog({
  open,
  onOpenChange,
  restaurantName,
  email,
  temporaryPassword,
  credentialEmailSent,
  onDone,
  title = "Restaurant created",
  description,
  contextLabel = "Restaurant",
}: CredentialsDialogProps) {
  const [copied, setCopied] = useState(false);

  const resolvedDescription =
    description ??
    (temporaryPassword
      ? "Share these credentials with the restaurant admin. They will only be shown once."
      : "The admin account has been provisioned. Login credentials were sent by email.");

  const copyCredentials = async () => {
    const lines = [`${contextLabel}: ${restaurantName}`, `Email: ${email}`];
    if (temporaryPassword) lines.push(`Temporary password: ${temporaryPassword}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Credentials copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">
              {contextLabel}
            </p>
            <p className="mt-1 font-medium text-content">{restaurantName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Login email</p>
            <p className="mt-1 font-mono text-sm text-content">{email}</p>
          </div>
          {temporaryPassword && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-faint">
                Temporary password
              </p>
              <p className="mt-1 font-mono text-sm text-content">{temporaryPassword}</p>
            </div>
          )}
          {credentialEmailSent ? (
            <Badge variant="success" className="gap-1">
              <Mail className="h-3 w-3" />
              Credentials emailed
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Email could not be sent — share credentials manually
            </Badge>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={copyCredentials}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy details"}
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
