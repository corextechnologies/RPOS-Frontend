/**
 * Shared client-side search for the inventory tables across every portal
 * (warehouse, admin, kitchen). Each portal's stock item is a different type but
 * they all carry a product name, an optional SKU, and a batch code — the three
 * fields a keeper searches by. Matching is case-insensitive; an empty query
 * matches everything.
 */
interface StockSearchShape {
  product: { name: string; sku?: string | null };
  batch_code: string;
}

export function matchesStockSearch(
  item: StockSearchShape,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.product.name.toLowerCase().includes(q) ||
    (item.product.sku ?? "").toLowerCase().includes(q) ||
    item.batch_code.toLowerCase().includes(q)
  );
}
