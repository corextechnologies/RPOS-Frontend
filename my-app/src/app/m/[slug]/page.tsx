"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { publicApi } from "@/lib/api/public.api";
import { apiConfig } from "@/lib/api/config";
import { formatMinor } from "@/lib/money";
import type { PublicMenu, PublicMenuItem } from "@/lib/types/public";

/** Server-relative asset paths resolve against the API origin (see menu page). */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${apiConfig.baseUrl.replace(/\/v1$/, "")}${url}`;
  return url;
}

/** Group items by category, preserving first-seen order; nulls go last. */
function groupByCategory(items: PublicMenuItem[]): Array<[string, PublicMenuItem[]]> {
  const groups = new Map<string, PublicMenuItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || "Other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()];
}

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const menu = useQuery<PublicMenu>({
    queryKey: ["public-menu", slug],
    queryFn: () => publicApi.getPublicMenu(slug),
    retry: false,
  });

  if (menu.isLoading) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand" />
      </main>
    );
  }

  if (menu.isError || !menu.data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-3 px-5 text-center">
        <UtensilsCrossed className="h-10 w-10 text-faint" />
        <h1 className="font-display text-xl font-semibold text-content">Menu unavailable</h1>
        <p className="text-sm text-muted">
          This menu isn&apos;t published yet, or the link is incorrect. Please check with the
          restaurant.
        </p>
      </main>
    );
  }

  const { restaurant_name, logo_url, currency, items } = menu.data;
  const logo = resolveImageUrl(logo_url);
  const groups = groupByCategory(items);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 pb-16">
      <header className="flex flex-col items-center gap-3 border-b border-line py-10 text-center">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-muted">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <UtensilsCrossed className="h-7 w-7" />
          )}
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          {restaurant_name}
        </h1>
        <p className="text-xs uppercase tracking-widest text-faint">Menu</p>
      </header>

      {groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No items on the menu yet.</p>
      ) : (
        <div className="divide-y divide-line">
          {groups.map(([category, groupItems]) => (
            <section key={category} className="py-6">
              <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-brand">
                {category}
              </h2>
              <ul className="space-y-3">
                {groupItems.map((item) => {
                  const img = resolveImageUrl(item.image_url);
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            item.is_available
                              ? "text-sm font-medium text-content"
                              : "text-sm font-medium text-faint line-through"
                          }
                        >
                          {item.name}
                        </p>
                        {!item.is_available && (
                          <p className="text-xs text-faint">Currently unavailable</p>
                        )}
                      </div>
                      <span
                        className={
                          item.is_available
                            ? "shrink-0 text-sm font-semibold tabular-nums text-content"
                            : "shrink-0 text-sm font-semibold tabular-nums text-faint"
                        }
                      >
                        {formatMinor(item.price_minor, currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="pt-8 text-center text-xs text-faint">Powered by Restaurant OS</footer>
    </main>
  );
}
