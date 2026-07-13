"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui/state";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="max-w-md space-y-4 text-center">
        <ErrorState
          title="Something went wrong"
          description={error.message || "An unexpected error occurred."}
          onRetry={reset}
        />
        <Button variant="outline" onClick={() => router.push("/")}>
          Go home
        </Button>
      </div>
    </div>
  );
}
