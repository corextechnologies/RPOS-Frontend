import type { ProductKind } from "@/lib/types/admin";

/**
 * Friendly, human-readable labels for a product's kind — the same wording the
 * warehouse create form uses ("Raw material" / "For resale"), so a product
 * reads the same way everywhere it appears: create dialog, warehouse inventory,
 * admin inventory. Keep these in sync with `AddProductDialog`'s `KINDS`.
 */
export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  RAW_MATERIAL: "Raw material",
  RESALE: "For resale",
  FINISHED_GOOD: "Made in-house",
};

/**
 * Badge styling for a kind. Raw materials are the plain baseline (outline);
 * anything sellable is emphasised (secondary), mirroring the pricing table.
 */
export function productKindBadgeVariant(
  kind: ProductKind,
): "outline" | "secondary" {
  return kind === "RAW_MATERIAL" ? "outline" : "secondary";
}
