"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui/state";
import { Button } from "@/components/ui/button";
import { postAuthPath } from "@/lib/auth/actions";
import { useAuth } from "@/lib/auth";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <ErrorState
          title="Portal error"
          description={error.message || "This section failed to load."}
          onRetry={reset}
        />
        <Button variant="outline" onClick={() => router.push(user ? postAuthPath(user) : "/login")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
