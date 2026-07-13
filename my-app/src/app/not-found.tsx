import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">404</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-content">Page not found</h1>
        <p className="text-sm text-muted">The page you requested does not exist or has been moved.</p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
