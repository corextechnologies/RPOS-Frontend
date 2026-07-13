import type { MeResponse, TokenResponse } from "@/lib/types/super-admin";
import { request } from "./client";
import { tokens } from "./tokens";

export const authApi = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const data = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    tokens.set(data.access_token, data.refresh_token);
    return data;
  },

  async me(): Promise<MeResponse> {
    return request<MeResponse>("/auth/me");
  },

  async logout(): Promise<void> {
    const refresh = tokens.refresh;
    try {
      if (refresh) {
        await request("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refresh }),
        });
      }
    } finally {
      tokens.clear();
    }
  },
};
