"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api";
import { forecastPlansApi } from "@/lib/api/forecast-plans.api";
import { forecastErrorMessage } from "@/lib/forecast/errors";
import type {
  CreatePlanInput,
  ForecastPlan,
  OverridePlanLinesInput,
  PlanFilters,
} from "@/lib/types/forecast";

/** Confirm/cancel change what Kitchen and Branch see — refresh their reads too. */
function invalidateDownstream(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["kitchen-planning"] });
  qc.invalidateQueries({ queryKey: ["branch-planning"] });
}

export function useForecastPlans(filters?: PlanFilters) {
  return useQuery({
    queryKey: queryKeys.forecastPlans(filters),
    queryFn: () => forecastPlansApi.listPlans(filters),
  });
}

export function useForecastPlan(id: number | null) {
  return useQuery({
    queryKey: queryKeys.forecastPlan(id ?? 0),
    queryFn: () => forecastPlansApi.getPlan(id as number),
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => forecastPlansApi.createPlan(input),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["forecast-plans"] });
      qc.setQueryData(queryKeys.forecastPlan(plan.id), plan);
      toast.success("Draft plan created");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't create plan")),
  });
}

export function useOverridePlanLines(planId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OverridePlanLinesInput) =>
      forecastPlansApi.overrideLines(planId, input),
    onSuccess: (plan) => {
      qc.setQueryData(queryKeys.forecastPlan(plan.id), plan);
      qc.invalidateQueries({ queryKey: ["forecast-plans"] });
      toast.success("Plan updated");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't update plan")),
  });
}

export function useConfirmPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => forecastPlansApi.confirmPlan(planId),
    onSuccess: (plan: ForecastPlan) => {
      qc.setQueryData(queryKeys.forecastPlan(plan.id), plan);
      qc.invalidateQueries({ queryKey: ["forecast-plans"] });
      invalidateDownstream(qc);
      toast.success("Plan confirmed — branch and kitchen notified");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't confirm plan")),
  });
}

export function useCancelPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => forecastPlansApi.cancelPlan(planId),
    onSuccess: (plan: ForecastPlan) => {
      qc.setQueryData(queryKeys.forecastPlan(plan.id), plan);
      qc.invalidateQueries({ queryKey: ["forecast-plans"] });
      invalidateDownstream(qc);
      toast.success("Plan cancelled");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't cancel plan")),
  });
}
