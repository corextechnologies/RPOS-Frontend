import type { UserRole } from "@/lib/types/super-admin";

interface JwtPayload {
  role?: UserRole;
  sub?: string;
  exp?: number;
}

/** Decode JWT payload without verification — used for quick client-side role hints only. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function roleFromAccessToken(token: string | null | undefined): UserRole | null {
  if (!token) return null;
  return decodeJwtPayload(token)?.role ?? null;
}
