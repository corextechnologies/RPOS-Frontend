"use client";

import { useRef, useState } from "react";
import { UserRound, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT_DEFAULT = "image/jpeg,image/png,image/webp";
const ACCEPT_WITH_SVG = "image/jpeg,image/png,image/webp,image/svg+xml";

/**
 * Avatar picker for the employee/staff create/edit forms. Uploads via the
 * supplied `upload` fn (defaults to `api.uploadEmployeeImage`) and hands the
 * returned URL back via `onChange` — the form only ever stores the URL string,
 * never the File, so a form can treat `image_url` like any other field. Mirrors
 * the menu-image uploader's 2 MB guardrail. Pass `allowSvg` for surfaces whose
 * upload endpoint accepts SVG (e.g. the kitchen staff-image route).
 */
export function EmployeeImageField({
  value,
  onChange,
  upload = api.uploadEmployeeImage,
  allowSvg = false,
}: {
  value: string;
  onChange: (url: string) => void;
  upload?: (file: File) => Promise<string>;
  allowSvg?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 2 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await upload(file);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload the image");
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
            alt="Employee avatar"
            className="size-16 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full border border-line bg-surface-2 text-faint">
            <UserRound className="size-6" aria-hidden />
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-white shadow-soft"
            aria-label="Remove image"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept={allowSvg ? ACCEPT_WITH_SVG : ACCEPT_DEFAULT}
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
          {uploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
        </Button>
        <p className="text-xs text-faint">
          {allowSvg ? "JPEG, PNG, WebP, or SVG" : "JPEG, PNG, or WebP"} · up to 2 MB.
        </p>
      </div>
    </div>
  );
}
