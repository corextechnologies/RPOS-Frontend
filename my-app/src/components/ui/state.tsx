import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-faint">
        <Inbox className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-content">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-content">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
