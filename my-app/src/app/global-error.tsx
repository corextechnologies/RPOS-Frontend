"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-[#F0EDE4] px-4 font-sans text-[#0B1F1B]">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Application error</h1>
          <p className="text-sm opacity-70">{error.message || "A critical error occurred."}</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
