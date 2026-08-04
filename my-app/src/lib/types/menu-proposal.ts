/** Branch → admin menu-item proposals.
 *
 * A branch manager proposes a dish; Admin reviews, prices, and approves it onto
 * the live menu (or rejects it). See src/lib/api/menu-proposals.api.ts.
 */
import type { StockUnit } from "@/lib/stock-unit";

export type MenuProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MenuProposal {
  id: number;
  restaurant_id: number;
  branch_id: number;
  status: MenuProposalStatus;
  name: string;
  category: string | null;
  proposed_price_minor: number;
  image_url: string | null;
  description: string | null;
  calories: number | null;
  prep_time_minutes: number | null;
  made_to_order: boolean;
  product_id: number | null;
  product_name: string | null;
  new_product_name: string | null;
  new_product_sku: string | null;
  new_product_stock_unit: StockUnit | null;
  note: string | null;
  reject_reason: string | null;
  proposed_by_id: number | null;
  decided_by_id: number | null;
  decided_at: string | null;
  published_at: string | null;
  created_at: string | null;
}

/** Provide EITHER product_id OR the new_product_* fields, not both. */
export interface CreateMenuProposalInput {
  name: string;
  /** Decimal string — authoring convenience; stored/returned as `_minor`. */
  price: string;
  category?: string | null;
  description?: string | null;
  calories?: number | null;
  prep_time_minutes?: number | null;
  made_to_order?: boolean;
  note?: string | null;
  product_id?: number | null;
  new_product_name?: string | null;
  new_product_sku?: string | null;
  new_product_stock_unit?: StockUnit;
}

export interface ApproveMenuProposalInput {
  /** Decimal string; omit to accept the branch's proposed price. */
  price?: string;
  category?: string | null;
}
