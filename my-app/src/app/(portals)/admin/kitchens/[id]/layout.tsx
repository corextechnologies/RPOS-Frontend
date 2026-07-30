import type { ReactNode } from "react";

/**
 * Static-export shim for a client-rendered dynamic route.
 *
 * These portal detail pages fetch by id at runtime and are `"use client"`, so
 * they can't carry `generateStaticParams` themselves. This server layout adds it
 * so the Electron till's `output: export` build can compile. Returning no params
 * is correct: the till never visits these routes.
 *
 * It's a no-op for the default (Vercel) build — with `dynamicParams` at its
 * default (true), an empty list just means "nothing prerendered", and the pages
 * render on demand exactly as before.
 */
export function generateStaticParams() {
  return [];
}

export default function DynamicSegmentLayout({ children }: { children: ReactNode }) {
  return children;
}
