import type { PublicMenu } from "@/lib/types/public";
import { ApiError } from "@/lib/types/super-admin";
import { apiConfig } from "./config";
import { parseApiError, unwrapData } from "./envelope";

/**
 * Unauthenticated GET for the public QR menu. Deliberately does NOT attach the
 * Authorization header or credentials — a diner scanning the code has no
 * session, and the endpoint must serve them anyway.
 */
async function publicRequest<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiConfig.isNgrok) headers["ngrok-skip-browser-warning"] = "true";

  const res = await fetch(`${apiConfig.baseUrl}${path}`, { headers });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw parseApiError(json, res.status);
  }
  return unwrapData<T>(await res.json());
}

/** A representative published menu for the demo restaurant in mock mode. */
function mockPublicMenu(slug: string): PublicMenu {
  if (slug !== "demo-restaurant-group") {
    throw new ApiError("Menu not found", 404);
  }
  return {
    restaurant_name: "Demo Restaurant Group",
    logo_url: null,
    currency: "PKR",
    items: [
      {
        id: 1,
        name: "Margherita Pizza",
        category: "Pizza",
        price_minor: 89900,
        is_available: true,
        description:
          "A wonderful pizza for dinner, prepared with the finest ingredients — San Marzano tomatoes, fresh mozzarella, and hand-torn basil on a slow-proofed sourdough base.",
        calories: 780,
        prep_time_minutes: 20,
      },
      { id: 2, name: "Pepperoni Pizza", category: "Pizza", price_minor: 109900, is_available: true },
      { id: 3, name: "Truffle Mushroom Pizza", category: "Pizza", price_minor: 129900, is_available: false },
      { id: 4, name: "Classic Beef Burger", category: "Burgers", price_minor: 79900, is_available: true },
      { id: 5, name: "Crispy Chicken Burger", category: "Burgers", price_minor: 74900, is_available: true },
      { id: 6, name: "Caesar Salad", category: "Sides", price_minor: 49900, is_available: true },
      { id: 7, name: "Garlic Bread", category: "Sides", price_minor: 29900, is_available: true },
      { id: 8, name: "Fresh Lime Soda", category: "Drinks", price_minor: 19900, is_available: true },
      { id: 9, name: "Iced Latte", category: "Drinks", price_minor: 34900, is_available: true },
    ],
  };
}

export const publicApi = {
  getPublicMenu(slug: string): Promise<PublicMenu> {
    if (apiConfig.useMock) {
      return Promise.resolve(mockPublicMenu(slug));
    }
    return publicRequest<PublicMenu>(`/public/menu/${encodeURIComponent(slug)}`);
  },
};
