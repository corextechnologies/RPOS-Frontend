"use client";

import { useRef, useState } from "react";
import { IdCard, X } from "lucide-react";
import { api } from "@/lib/api";
import { imageUploadErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * CNIC scan picker — the ID-card sibling of `EmployeeImageField`.
 *
 * Kept separate rather than parameterising the avatar field because the two
 * differ in more than a label: an ID card is uploaded with `kind: "cnic"` (the
 * server keeps it at 1600px so the number stays readable), and it previews as a
 * wide card rather than a round avatar. The form only ever stores the returned
 * URL string, never the File.
 *
 * That URL is signed and expires (~15 min). It is fine to render here — it was
 * just minted — but never persist it; re-fetch the record instead.
 */
export function StaffDocumentField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await api.uploadStaffDocument(file, "cnic");
      onChange(url);
    } catch (err) {
      toast.error(imageUploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-16 w-28 rounded-lg border border-line bg-surface-2 object-contain"
          />
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-line bg-surface-2 text-faint">
            <IdCard className="size-6" aria-hidden />
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-white shadow-soft"
            aria-label={`Remove ${label}`}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : value ? "Change scan" : "Upload scan"}
        </Button>
        <p className="text-xs text-faint">JPEG, PNG, or WebP · up to 10 MB.</p>
      </div>
    </div>
  );
}
