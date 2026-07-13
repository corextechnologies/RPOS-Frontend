"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Logomark } from "@/components/icons";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen bg-bg">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <div className="grain absolute inset-0 bg-cyprus-600" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 10%, rgba(61,187,154,0.28), transparent 55%), radial-gradient(90% 80% at 90% 100%, rgba(240,237,228,0.14), transparent 50%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-sand">
          <div className="flex items-center gap-3">
            <Logomark size={34} className="text-sand" />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold tracking-tight">Restaurant OS</p>
              <p className="text-xs text-sand/60">Multi-tenant operating system</p>
            </div>
          </div>
          <div>
            <h1 className="font-display text-[42px] font-semibold leading-[1.05] tracking-tight">
              One login.
              <br />
              Every portal.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-sand/70">
              Super Admin, Admin, Warehouse, Kitchen, and Branch staff all sign in through the same
              secure entry point.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Logomark size={34} className="text-brand" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Restaurant OS</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-content">{title}</h2>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}

export function AuthBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="font-medium text-brand hover:underline">
      {label}
    </Link>
  );
}
