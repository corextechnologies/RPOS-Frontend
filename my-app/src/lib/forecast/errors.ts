/**
 * Phase 7 error codes (§10) and human copy. Branch on `code`, never `message`.
 */
import { isApiCode } from "@/lib/api/errors";

export const FORECAST_ERROR = {
  BUILTIN_EVENT_NOT_DELETABLE: "builtin_event_not_deletable",
  INVALID_EVENT_WINDOW: "invalid_event_window",
  NOTHING_TO_FORECAST: "nothing_to_forecast",
  PLAN_NOT_DRAFT: "plan_not_draft",
  PLAN_ALREADY_CONFIRMED: "plan_already_confirmed",
  PLAN_CANCELLED: "plan_cancelled",
  INVALID_PLANNED_UNITS: "invalid_planned_units",
} as const;

export function forecastErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (isApiCode(err, FORECAST_ERROR.BUILTIN_EVENT_NOT_DELETABLE))
    return "This is a built-in event and can't be deleted. Set its multipliers to 1 to neutralise it.";
  if (isApiCode(err, FORECAST_ERROR.INVALID_EVENT_WINDOW))
    return "The end date can't be before the start date.";
  if (isApiCode(err, FORECAST_ERROR.NOTHING_TO_FORECAST))
    return "Nothing to forecast for this branch yet — no product has sales history or an expected daily amount.";
  if (isApiCode(err, FORECAST_ERROR.PLAN_NOT_DRAFT))
    return "This plan is already confirmed or cancelled, so its lines can't be edited.";
  if (isApiCode(err, FORECAST_ERROR.PLAN_ALREADY_CONFIRMED))
    return "This plan is already confirmed.";
  if (isApiCode(err, FORECAST_ERROR.PLAN_CANCELLED))
    return "This plan was cancelled — create a new plan instead.";
  if (isApiCode(err, FORECAST_ERROR.INVALID_PLANNED_UNITS))
    return "Planned units can't be negative.";
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
