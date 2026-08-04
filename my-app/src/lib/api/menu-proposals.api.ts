/**
 * Menu-item proposals — the branch → admin hand-off for adding a dish, plus the
 * admin's finished-good create for a kitchen-off restaurant.
 *
 * These sit next to menu authoring (`pos-admin.api.ts`) and use the PORTAL token
 * via `request` directly — they are back-office actions, not till actions, and
 * (like menu authoring) are not part of the mock ApiClient contract. In mock mode
 * the branch/admin proposal screens call the live backend, exactly as publishing
 * a menu already does.
 */
import type { SellableProduct } from "@/lib/types/pos";
import type {
  ApproveMenuProposalInput,
  CreateMenuProposalInput,
  MenuProposal,
  MenuProposalStatus,
} from "@/lib/types/menu-proposal";
import type { StockUnit } from "@/lib/stock-unit";
import { request } from "./client";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

const statusQ = (status?: MenuProposalStatus) =>
  status ? `?status=${status}` : "";

export const menuProposalApi = {
  // ---- Sub-kitchen chef: propose / list own / withdraw ----

  createProposal(input: CreateMenuProposalInput): Promise<MenuProposal> {
    return request<MenuProposal>("/sub-kitchen/menu-proposals", {
      method: "POST",
      ...json(input),
    });
  },

  /** This station's own proposals (never another branch's). */
  listChefProposals(status?: MenuProposalStatus): Promise<MenuProposal[]> {
    return request<MenuProposal[]>(`/sub-kitchen/menu-proposals${statusQ(status)}`);
  },

  withdrawProposal(id: number): Promise<void> {
    return request(`/sub-kitchen/menu-proposals/${id}`, { method: "DELETE" });
  },

  // ---- Admin: review queue / decide ----

  listAdminProposals(status?: MenuProposalStatus): Promise<MenuProposal[]> {
    return request<MenuProposal[]>(`/admin/menu/proposals${statusQ(status)}`);
  },

  approveProposal(id: number, input: ApproveMenuProposalInput = {}): Promise<MenuProposal> {
    return request<MenuProposal>(`/admin/menu/proposals/${id}/approve`, {
      method: "POST",
      ...json(input),
    });
  },

  rejectProposal(id: number, reason: string): Promise<MenuProposal> {
    return request<MenuProposal>(`/admin/menu/proposals/${id}/reject`, {
      method: "POST",
      ...json({ reason }),
    });
  },

  /** Stamp approved proposals as live, right after publishing them to the menu. */
  markProposalsPublished(ids: number[]): Promise<{ published: number }> {
    return request<{ published: number }>("/admin/menu/proposals/mark-published", {
      method: "POST",
      ...json({ ids }),
    });
  },

  // ---- Admin: introduce a FINISHED_GOOD (kitchen-off tenant) ----

  createFinishedGood(input: {
    name: string;
    sku?: string | null;
    stock_unit?: StockUnit;
  }): Promise<SellableProduct> {
    return request<SellableProduct>("/admin/products", { method: "POST", ...json(input) });
  },
};
