import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  MeResponse,
  ResetPasswordInput,
  TokenResponse,
} from "@/lib/types/super-admin";
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

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
