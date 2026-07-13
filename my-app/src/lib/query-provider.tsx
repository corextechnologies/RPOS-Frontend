"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

function handleQueryError(error: unknown) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else if (error instanceof Error) {
    toast.error(error.message);
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
            onError: handleQueryError,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
