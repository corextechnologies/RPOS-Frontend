import type { Minor } from "@/lib/money";

/** A single sellable line as shown on the public QR menu. */
export interface PublicMenuItem {
  id: number;
  name: string;
  category: string | null;
  price_minor: Minor;
  is_available: boolean;
  image_url?: string | null;
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
