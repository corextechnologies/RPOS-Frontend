"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posApi } from "@/lib/api/pos.api";
import { posErrorMessage } from "@/lib/api/errors";
import type { CashMovementInput, CloseShiftInput, OpenShiftInput } from "@/lib/types/pos";

export const shiftKeys = {
  current: ["pos-shift-current"] as const,
  report: (id: number) => ["pos-shift-report", id] as const,
};

export function useCurrentShift() {
  return useQuery({
    queryKey: shiftKeys.current,
    queryFn: () => posApi.currentShift(),
    retry: false,
  });
}

export function useOpenShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpenShiftInput) => posApi.openShift(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftKeys.current });
      toast.success("Shift opened");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

/**
 * The X/Z report.
 *
 * While the shift is OPEN this is an X report and the server OMITS
 * `expected_cash_minor`. That is the blind close and it is a fraud control, not
 * an oversight — if the cashier can see the target, the count is not a count,
 * it is a copy.
 *
 * So: do not compute an expected figure client-side from float + sales +
 * movements. Everything needed to do so is on this very object, which is
 * exactly why the temptation exists and exactly why this comment is here.
 */
export function useShiftReport(shiftId: number | null) {
  return useQuery({
    queryKey: shiftKeys.report(shiftId ?? 0),
    queryFn: () => posApi.shiftReport(shiftId as number),
    enabled: shiftId != null,
    retry: false,
  });
}

export function useCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CashMovementInput) => posApi.cashMovement(input),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["pos-shift-report"] });
      qc.invalidateQueries({ queryKey: shiftKeys.current });
      toast.success(vars.type === "NO_SALE" ? "Drawer opened" : "Cash movement logged");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

/**
 * No toast on error: a variance beyond the threshold comes back 403
 * `variance_needs_approval`, which is a manager prompt, not a failure. The
 * caller inspects the code.
 */
export function useCloseShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, input }: { shiftId: number; input: CloseShiftInput }) =>
      posApi.closeShift(shiftId, input),
    retry: false,
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: shiftKeys.current });
      qc.setQueryData(shiftKeys.report(report.shift_id), report);
    },
  });
}
