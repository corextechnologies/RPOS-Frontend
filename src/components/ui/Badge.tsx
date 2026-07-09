import { cn } from "@/lib/utils";

type Tone = "brand" | "neutral" | "positive" | "warning" | "danger" | "outline";

const TONES: Record<Tone, string> = {
  brand: "bg-brand/12 text-brand border-brand/20",
  neutral: "bg-surface-2 text-muted border-line",
  positive: "bg-positive/12 text-positive border-positive/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  outline: "bg-transparent text-muted border-line",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
