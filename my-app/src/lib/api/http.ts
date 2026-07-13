import { ApiError } from "@/lib/types";
import type {
  Branch,
  MeResponse,
  Organization,
  Role,
  TokenResponse,
  User,
} from "@/lib/types";
import { tokens } from "./tokens";
import {
  ApiClient,
  MASTER_DATA_RESOURCES,
  MasterDataKey,
  MasterDataTypeMap,
} from "./contract";

const BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "") + "/v1";

interface RequestOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail =
      (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(
      typeof detail === "string" ? detail : JSON.stringify(detail),
      res.status,
    );
  }
  return data as T;
}

export const httpClient: ApiClient = {
  async login(email, password) {
    const t = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    tokens.set(t.access_token, t.refresh_token);
    return t;
  },
  me() {
    return request<MeResponse>("/auth/me");
  },
  async logout() {
    const refresh_token = tokens.refresh;
    try {
      if (refresh_token)
        await request("/auth/logout", { method: "POST", body: { refresh_token } });
    } finally {
      tokens.clear();
    }
  },

  listOrganizations: () => request<Organization[]>("/organizations"),
  createOrganization: (body) =>
    request<Organization>("/organizations", { method: "POST", body }),
  updateOrganization: (id, body) =>
    request<Organization>(`/organizations/${id}`, { method: "PATCH", body }),

  listBranches: () => request<Branch[]>("/branches"),
  createBranch: (body) => request<Branch>("/branches", { method: "POST", body }),
  updateBranch: (id, body) =>
    request<Branch>(`/branches/${id}`, { method: "PATCH", body }),

  listUsers: () => request<User[]>("/users"),
  createUser: (body) => request<User>("/users", { method: "POST", body }),
  updateUser: (id, body) => request<User>(`/users/${id}`, { method: "PATCH", body }),

  listRoles: () => request<Role[]>("/roles"),
  createRole: (name) => request<Role>("/roles", { method: "POST", body: { name } }),
  assignPermissions: (role_id, permission_codes) =>
    request<Role>("/permissions/assign", {
      method: "POST",
      body: { role_id, permission_codes },
    }),

  listMasterData: <K extends MasterDataKey>(key: K) =>
    request<MasterDataTypeMap[K][]>(`/${MASTER_DATA_RESOURCES[key]}`),
  createMasterData: <K extends MasterDataKey>(key: K, body: Record<string, unknown>) =>
    request<MasterDataTypeMap[K]>(`/${MASTER_DATA_RESOURCES[key]}`, {
      method: "POST",
      body,
    }),
  updateMasterData: <K extends MasterDataKey>(
    key: K,
    id: number,
    body: Record<string, unknown>,
  ) =>
    request<MasterDataTypeMap[K]>(`/${MASTER_DATA_RESOURCES[key]}/${id}`, {
      method: "PATCH",
      body,
    }),
  deleteMasterData: <K extends MasterDataKey>(key: K, id: number) =>
    request<void>(`/${MASTER_DATA_RESOURCES[key]}/${id}`, { method: "DELETE" }),
};
