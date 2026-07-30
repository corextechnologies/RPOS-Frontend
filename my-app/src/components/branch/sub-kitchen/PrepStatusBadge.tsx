import { Badge, type BadgeProps } from "@/components/ui/badge";
import { prepStatusLabel } from "@/lib/sub-kitchen/prep-transitions";
import type { PrepStatus } from "@/lib/types/sub-kitchen";

const VARIANT: Record<PrepStatus, NonNullable<BadgeProps["variant"]>> = {
  QUEUED: "secondary",
  IN_PROGRESS: "default",
  READY: "success",
  COMPLETED: "success",
  CANCELLED: "secondary",
};

export function PrepStatusBadge({ status }: { status: PrepStatus }) {
  return <Badge variant={VARIANT[status]}>{prepStatusLabel(status)}</Badge>;
}
