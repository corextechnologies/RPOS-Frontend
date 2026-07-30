"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Clock, Flame, UtensilsCrossed } from "lucide-react";
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

/** Category label for an item, normalized; blanks bucket into "Other". */
function categoryOf(item: PublicMenuItem): string {
  return item.category?.trim() || "Other";
}

/** Distinct categories in first-seen order, for the filter bar. */
function categoryList(items: PublicMenuItem[]): string[] {
  const seen: string[] = [];
  for (const item of items) {
    const key = categoryOf(item);
    if (!seen.includes(key)) seen.push(key);
  }
  return seen;
}

/**
 * Item detail overlay — layout modelled on the reference design (full-bleed
 * image, "Details" bar, sheet curving over the image, Show more, info chips).
 * View-only: no ordering. Enter/exit animated with framer-motion.
 */
function ItemDetailModal({
  item,
  currency,
  onClose,
}: {
  item: PublicMenuItem;
  currency: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const img = resolveImageUrl(item.image_url);
  const isLongDescription = (item.description?.length ?? 0) > 90;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="relative flex h-[90dvh] w-full max-w-lg flex-col overflow-hidden roun  ded-3xl border border-line bg-surface-2 shadow-glow"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
      >
        {/* Hero image with a "Details" bar over it. */}
        <div className="relative h-96 w-full shrink-0 bg-surface-2 sm:h-96">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-surface-2">
              <UtensilsCrossed className="h-12 w-12 text-faint" />
            </div>
          )}
          {/* Bottom fade so the sheet reads as curving over the image. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/10 to-black/30" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              Details
            </span>
            {/* Spacer keeps the title centered. */}
            <span className="h-9 w-9" aria-hidden />
          </div>
        </div>

        {/* Content sheet, pulled up to overlap the image. */}
        <div className="relative -mt-10 rounded-t-3xl bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                className={
                  item.is_available
                    ? "font-display text-2xl font-bold text-content"
                    : "font-display text-2xl font-bold text-faint line-through"
                }
              >
                {item.name}
              </h2>
              <p className="mt-1 text-xs uppercase tracking-widest text-faint">
                {categoryOf(item)}
              </p>
            </div>
            <span
              className={
                item.is_available
                  ? "shrink-0 font-display text-2xl font-bold tabular-nums text-brand"
                  : "shrink-0 font-display text-2xl font-bold tabular-nums text-faint"
              }
            >
              {formatMinor(item.price_minor, currency)}
            </span>
          </div>

          {!item.is_available && (
            <p className="mt-2 text-sm text-faint">Currently unavailable</p>
          )}

          {item.description && (
            <div className="mt-5">
              <h3 className="mb-1 font-display text-sm font-semibold text-content">Description</h3>
              <p
                className={`text-sm leading-relaxed text-muted ${
                  expanded || !isLongDescription ? "" : "line-clamp-2"
                }`}
              >
                {item.description}
              </p>
              {isLongDescription && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-sm font-medium text-brand transition hover:opacity-80"
                >
                  {expanded ? "Show less" : "...Show more"}
                </button>
              )}
            </div>
          )}

          {(item.calories != null || item.prep_time_minutes != null) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {item.calories != null && (
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/60 px-4 py-2 text-sm font-medium text-content">
                  <Flame className="h-4 w-4 text-brand" />
                  {item.calories} Kcal
                </span>
              )}
              {item.prep_time_minutes != null && (
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/60 px-4 py-2 text-sm font-medium text-content">
                  <Clock className="h-4 w-4 text-brand" />
                  {item.prep_time_minutes} min
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PublicMenuPage() {
  // `useParams()` (client hook) rather than the `params` promise prop: it reads
  // identically at runtime but doesn't trip static export's page-level
  // generateStaticParams requirement (the layout shim covers the segment).
  const { slug } = useParams<{ slug: string }>();
  // null = "All Items"
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const menu = useQuery<PublicMenu>({
    queryKey: ["public-menu", slug],
    queryFn: () => publicApi.getPublicMenu(slug),
    retry: false,
  });

  const items = menu.data?.items ?? [];
  const categories = useMemo(() => categoryList(items), [items]);
  const filteredItems = useMemo(
    () =>
      selectedCategory === null
        ? items
        : items.filter((item) => categoryOf(item) === selectedCategory),
    [items, selectedCategory],
  );

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

  const { restaurant_name, logo_url, currency } = menu.data;
  const logo = resolveImageUrl(logo_url);

  const pillClass = (active: boolean) =>
    active
      ? "rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-contrast"
      : "rounded-full border border-line bg-surface-2/40 px-5 py-2 text-sm font-medium text-muted transition hover:border-brand hover:text-content";

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 pb-16">
      <header className="flex flex-col items-center gap-3 border-b border-line py-10 text-center">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-muted">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-full w-full object-contain" />
          ) : (
            <UtensilsCrossed className="h-7 w-7" />
          )}
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          {restaurant_name}
        </h1>
        <p className="text-xs uppercase tracking-widest text-faint">Menu</p>
      </header>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No items on the menu yet.</p>
      ) : (
        <>
          {/* Category filter bar — "All Items" plus one pill per category. */}
          <div className="flex flex-wrap justify-center gap-2 py-8">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={pillClass(selectedCategory === null)}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={pillClass(selectedCategory === category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Item cards. */}
          {filteredItems.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No items in this category.</p>
          ) : (
            <div className="grid grid-cols-1  gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
              {filteredItems.map((item) => {
                const img = resolveImageUrl(item.image_url);
                return (
                  <article
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface-2/40 transition hover:border-brand"
                  >
                    <div className="grid aspect-square w-full place-items-center overflow-hidden bg-surface-2">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <UtensilsCrossed className="h-10 w-10 text-faint" />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={
                            item.is_available
                              ? "font-display font-semibold text-content group-hover:text-brand"
                              : "font-display text-base font-semibold text-faint line-through"
                          }
                        >
                          {item.name}
                        </h3>
                        <span
                          className={
                            item.is_available
                              ? "shrink-0 font-display text-base font-bold tabular-nums text-brand"
                              : "shrink-0 font-display text-base font-bold tabular-nums text-faint"
                          }
                        >
                          {formatMinor(item.price_minor, currency)}
                        </span>
                      </div>
                      {!item.is_available && (
                        <p className="mt-1 text-xs text-faint">Currently unavailable</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <footer className="pt-8 text-center text-xs text-faint">Powered by Restaurant OS</footer>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            currency={currency}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
