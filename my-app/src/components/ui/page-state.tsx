import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";

interface PageStateProps<T> {
  isLoading?: boolean;
  isError?: boolean;
  data?: T | null;
  isEmpty?: (data: T) => boolean;
  loadingFallback?: React.ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
}

export function PageState<T>({
  isLoading,
  isError,
  data,
  isEmpty,
  loadingFallback,
  errorTitle,
  errorDescription,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  onRetry,
  children,
}: PageStateProps<T>) {
  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )
    );
  }

  if (isError) {
    return <ErrorState title={errorTitle} description={errorDescription} onRetry={onRetry} />;
  }

  if (data == null || (isEmpty && isEmpty(data))) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return <>{children(data)}</>;
}
