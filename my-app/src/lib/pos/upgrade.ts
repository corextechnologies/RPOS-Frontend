"use client";

import { posApi } from "@/lib/api/pos.api";
import { posSession } from "@/lib/pos/session";
import { isApiCode, POS_ERROR } from "@/lib/api/errors";
import type { PosBootstrap, PosLoginResult } from "@/lib/types/pos";

/**
 * Log the cashier into the POS, cookie-first.
 *
 * The device identity normally rides the httpOnly cookie set at activation, so
 * we send `{ email, password }` with no uid. Only if the server answers
 * `device_uid_missing` (cookie cleared, localStorage survived) do we retry with
 * the stored uid in the body. If *that* has no uid either, the device is
 * unpaired — the error propagates and the caller routes to activation.
 */
async function posLoginCookieFirst(email: string, password: string): Promise<PosLoginResult> {
  try {
    return await posApi.login({ email, password });
  } catch (err) {
    if (!isApiCode(err, POS_ERROR.DEVICE_UID_MISSING)) throw err;
    const deviceUid = posSession.deviceUid;
    if (!deviceUid) throw err;
    return posApi.login({ email, password, device_uid: deviceUid });
  }
}

/**
 * Generic `/login` uses the portal token only to discover who signed in.
 * Branch staff then need this second step: mint the device-bound POS token
 * that every `/v1/pos/*` call requires.
 */
export async function upgradeBranchStaffToPos(
  email: string,
  password: string,
): Promise<PosBootstrap> {
  const res = await posLoginCookieFirst(email, password);
  posSession.setPaired(true);
  posSession.setSession(res.access_token, { device_id: res.device_id, branch_id: res.branch_id }, email);
  return posApi.bootstrap();
}
