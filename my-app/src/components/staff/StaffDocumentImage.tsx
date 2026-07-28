"use client";

import { useState } from "react";
import { IdCard } from "lucide-react";

/**
 * Read-only CNIC scan, for detail views.
 *
 * The ID-card counterpart to `StaffAvatar`, and it exists for the same reason:
 * these URLs are signed and expire after ~15 minutes, so a dialog opened from a
 * list that has been sitting around can be handed a dead link. `onError`
 * degrades to a placeholder rather than a broken-image icon, and the flag
 * resets when the URL changes so a refetch recovers the scan.
 */
export function StaffDocumentImage({
  url,
  label,
}: {
  url?: string | null;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  const [prevUrl, setPrevUrl] = useState(url);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setFailed(false);
  }

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={label}
        onError={() => setFailed(true)}
        className="h-24 w-full rounded-lg border border-line object-cover"
      />
    );
  }

  return (
    <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface-2 text-faint">
      <IdCard className="size-5" aria-hidden />
      <span className="text-xs">{url ? "Reopen to view" : "Not uploaded"}</span>
    </div>
  );
}
