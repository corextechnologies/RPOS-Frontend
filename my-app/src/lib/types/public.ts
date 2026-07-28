import type { Minor } from "@/lib/money";

/** A single sellable line as shown on the public QR menu. */
export interface PublicMenuItem {
  id: number;
  name: string;
  category: string | null;
  price_minor: Minor;
  is_available: boolean;
  image_url?: string | null;
  /** Longer marketing copy shown on the item detail view. */
  description?: string | null;
  /** Energy in kilocalories, shown as a detail chip when present. */
  calories?: number | null;
  /** Typical preparation time in minutes, shown as a detail chip when present. */
  prep_time_minutes?: number | null;
}

/**
 * The published menu as an anonymous diner sees it after scanning the QR code.
 * A trimmed, unauthenticated projection — no cost prices, modifiers, or combo
 * internals — plus the restaurant's public identity for the page header.
 */
export interface PublicMenu {
  restaurant_name: string;
  logo_url: string | null;
  currency: string;
  items: PublicMenuItem[];
}
