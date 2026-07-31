"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/types/super-admin";
import { notifyError } from "@/lib/toast";

function handleQueryError(error: unknown) {
  if (error instanceof ApiError) {
    notifyError(error, error.message);
  } else {
    notifyError(error);
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
          mutations: {
            // React Query's default (`networkMode: "online"`) *pauses* a
            // mutation while `navigator.onLine` is false — the `mutationFn`
            // never runs and `mutateAsync` never settles. That silently
            // disables the whole offline story: the POS submit seam can't
            // queue an order it was never asked to run, and screens that
            // catch a network error to say "you're offline" never see one.
            // Offline is decided by the seam (and by the request actually
            // failing), so mutations always run.
            networkMode: "always",
            onError: handleQueryError,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
