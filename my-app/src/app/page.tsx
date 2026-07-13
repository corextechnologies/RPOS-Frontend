"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES, postAuthPath } from "@/lib/auth/actions";
import { Logomark } from "@/components/icons";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? postAuthPath(user) : AUTH_ROUTES.login);
  }, [user, loading, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg text-brand">
      <Logomark size={40} className="animate-pulse" />
    </div>
  );
}
