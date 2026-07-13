"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring inline-flex items-center gap-2.5 disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-brand bg-brand" : "border-line bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full shadow-sm transition-all duration-300",
            "h-[18px] w-[18px]",
            checked
              ? "left-[22px] bg-brand-contrast"
              : "left-0.5 bg-faint",
          )}
        />
      </span>
      {label && <span className="text-sm text-content">{label}</span>}
    </button>
  );
}
