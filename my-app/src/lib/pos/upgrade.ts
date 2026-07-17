"use client";

import { posApi } from "@/lib/api/pos.api";
import { posSession } from "@/lib/pos/session";
import type { PosBootstrap } from "@/lib/types/pos";

/**
 * Generic `/login` uses the portal token only to discover who signed in.
 * Branch staff then need this second step: mint the device-bound POS token
 * that every `/v1/pos/*` call requires.
 */
export async function upgradeBranchStaffToPos(
  email: string,
  password: string,
): Promise<PosBootstrap> {
  const deviceUid = posSession.ensureDeviceUid();
  const res = await posApi.login({ email, password, device_uid: deviceUid });
  posSession.setDeviceUid(deviceUid);
  posSession.setSession(res.access_token, { device_id: res.device_id, branch_id: res.branch_id }, email);
  return posApi.bootstrap();
}
