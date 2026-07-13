/**
 * Types mirror the RPOS FastAPI schemas (schemas/*.py).
 * Kept intentionally close to the backend so the mock adapter and the real
 * client are interchangeable.
 */

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  is_active: boolean;
  permissions: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BranchType = "hub" | "branch" | "franchise" | "dark_kitchen";

export interface BranchTiming {
  day: string;
  open: string;
  close: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  location: string;
  branch_type: BranchType;
  timings: BranchTiming[];
  tax_percentage: string | number | null;
  tax_percentage_online: string | number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  delivery_type: string | null;
  geofence_placeholder: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  branch_id: string | null;
  is_active: boolean;
}

export interface Role {
  id: number;
  name: string;
  permissions: string[];
}

// ---- Master data ----
export type CategoryType = "raw_material" | "product" | "expense";
export type LocationType = "central_store" | "finished_goods" | "branch";
export type ReasonType = "wastage" | "rejection" | "discrepancy" | "adjustment";
export type ConfigValueType = "number" | "string" | "boolean" | "percentage";

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  effective_date: string;
}
export interface Category {
  id: number;
  name: string;
  category_type: CategoryType;
  effective_date: string;
}
export interface Tax {
  id: number;
  name: string;
  tax_type: string;
  percentage: string | number;
  branch_id: string | null;
  effective_date: string;
}
export interface StorageLocation {
  id: number;
  name: string;
  location_type: LocationType;
  branch_id: string | null;
  effective_date: string;
}
export interface PackagingType {
  id: number;
  name: string;
  description: string | null;
  effective_date: string;
}
export interface Allergen {
  id: number;
  name: string;
  effective_date: string;
}
export interface ReasonCode {
  id: number;
  name: string;
  code: string;
  reason_type: ReasonType;
  effective_date: string;
}
export interface TemperatureRange {
  id: number;
  name: string;
  min_celsius: string | number;
  max_celsius: string | number | null;
  effective_date: string;
}
export interface ConfigurationValue {
  id: number;
  key: string;
  value: string;
  value_type: ConfigValueType;
  description: string | null;
  effective_date: string;
}

export const PERMISSION_CATALOG = [
  "master_data:read",
  "master_data:write",
  "organizations:read",
  "organizations:write",
  "branches:read",
  "branches:write",
  "users:read",
  "users:write",
  "roles:read",
  "roles:write",
  "permissions:assign",
  "inventory:read",
  "inventory:write",
  "finance:read",
  "finance:write",
  "production:read",
  "production:write",
  "production:approve",
  "orders:read",
  "orders:write",
  "reports:read",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
