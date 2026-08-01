"use client";

import { SubKitchenShell } from "@/components/layout/SubKitchenShell";

/**
 * The Sub-kitchen portal — the branch's final-prep station, where the work is
 * actually done. Admission (a chef, or a manager covering the station) is
 * `SubKitchenShell`'s job; this is the frame around it.
 *
 * No tab bar here: this is a portal, so its screens are the sidebar's, and a
 * second copy of the same five links under the heading is just noise. The
 * Branch portal's read-only tab does use tabs — over there the sidebar holds a
 * single Sub-kitchen entry, so there's nothing to duplicate.
 *
 * There is no sold-out screen either: availability is derived from stock
 * server-side, so an item at zero goes unsellable on the till by itself.
 */
export default function SubKitchenPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubKitchenShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Sub-kitchen
          </h1>
          <p className="mt-1 text-sm text-muted">
            Final prep at this branch — the board, stock, recipes and waste.
          </p>
        </div>

        {children}
      </div>
    </SubKitchenShell>
  );
}
