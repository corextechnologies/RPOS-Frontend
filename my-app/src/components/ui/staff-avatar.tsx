"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { cn, initials } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-9", text: "text-xs", icon: "size-4" },
  lg: { box: "size-12", text: "text-sm", icon: "size-5" },
} as const;

/**
 * Round avatar for a person — photo when present, initials (or a generic icon)
 * otherwise. Employee and kitchen-staff photos are served from signed R2 URLs
 * that expire after ~15 minutes, so a page left open can end up with a dead
 * link; `onError` degrades that to the initials placeholder instead of a
 * broken-image icon. The `failed` flag resets whenever the URL changes, so a
 * refetch that hands back a fresh signed URL recovers the photo.
 */
export function StaffAvatar({
  imageUrl,
  name,
  size = "sm",
  className,
}: {
  imageUrl?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Reset the failed flag when the URL changes (e.g. a refetch hands back a
  // fresh signed URL) — the React-recommended "adjust state during render"
  // pattern, no effect needed.
  const [prevUrl, setPrevUrl] = useState(imageUrl);
  if (imageUrl !== prevUrl) {
    setPrevUrl(imageUrl);
    setFailed(false);
  }

  const s = SIZES[size];

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setFailed(true)}
        className={cn(
          s.box,
          "shrink-0 rounded-full border border-line object-cover",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        s.box,
        s.text,
        "flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 font-medium text-faint",
        className,
      )}
    >
      {name ? initials(name) : <UserRound className={s.icon} aria-hidden />}
    </span>
  );
}
