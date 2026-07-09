"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-strong text-brand-contrast hover:brightness-125 shadow-soft",
  secondary:
    "bg-surface-2 text-content hover:bg-line/60 border border-line",
  outline:
    "border border-line bg-transparent text-content hover:bg-surface-2",
  ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-content",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4",
  lg: "h-11 px-5 text-[15px]",
  icon: "h-9 w-9",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("btn focus-ring", VARIANTS[variant], SIZES[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size={16} />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
