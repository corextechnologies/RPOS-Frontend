"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/api";
import { calendarApi } from "@/lib/api/calendar.api";
import { forecastErrorMessage } from "@/lib/forecast/errors";
import type {
  CreateEventInput,
  EventTag,
  EventsQuery,
  PutProductMultipliersInput,
  UpdateEventInput,
} from "@/lib/types/forecast";

// ---- Tags ----

/**
 * The fixed tag vocabulary from the server. Intentionally optional: the tag
 * list is fixed and only changes via a backend migration (§3a), so the UI
 * renders from the `EVENT_TAGS` / `PRODUCT_EVENT_TAGS` literals (which also
 * give the TS union type). This hook is the server-authoritative binding for
 * anyone who wants to verify the client list against the backend.
 */
export function useCalendarTags() {
  return useQuery({
    queryKey: queryKeys.calendarTags,
    queryFn: () => calendarApi.getTags(),
    staleTime: 60 * 60 * 1000,
  });
}

// ---- Events ----

export function useCalendarEvents(query?: EventsQuery) {
  return useQuery({
    queryKey: queryKeys.calendarEvents(query),
    queryFn: () => calendarApi.listEvents(query),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => calendarApi.createEvent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event created");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't create event")),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: number; input: UpdateEventInput }) =>
      calendarApi.updateEvent(eventId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event saved");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't save event")),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) => calendarApi.deleteEvent(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted");
    },
    // Built-ins can't be deleted — the helper gives the "set multipliers to 1" copy.
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't delete event")),
  });
}

export function useGenerateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => calendarApi.generate(year),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success(
        `${result.year}: ${result.created} created, ${result.updated} updated, ${result.kept} kept`,
      );
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't generate calendar")),
  });
}

// ---- Per-product multipliers ----

export function useEventProductMultipliers(eventId: number | null) {
  return useQuery({
    queryKey: queryKeys.eventProductMultipliers(eventId ?? 0),
    queryFn: () => calendarApi.getProductMultipliers(eventId as number),
    enabled: !!eventId,
  });
}

export function usePutProductMultipliers(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PutProductMultipliersInput) =>
      calendarApi.putProductMultipliers(eventId, input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.eventProductMultipliers(eventId) });
      toast.success(`${result.updated} product multiplier(s) saved`);
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't save multipliers")),
  });
}

export function useDeleteProductMultiplier(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) =>
      calendarApi.deleteProductMultiplier(eventId, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.eventProductMultipliers(eventId) });
      toast.success("Reverted to the tag rule");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't remove multiplier")),
  });
}

// ---- Product forecast setup (§3a, §3b) ----

export function useProductEventTags(productId: number | null) {
  return useQuery({
    queryKey: queryKeys.productEventTags(productId ?? 0),
    queryFn: () => calendarApi.getProductEventTags(productId as number),
    enabled: !!productId,
  });
}

export function usePutProductEventTags(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tags: EventTag[]) => calendarApi.putProductEventTags(productId, tags),
    onSuccess: (result) => {
      qc.setQueryData(queryKeys.productEventTags(productId), result);
      toast.success("Tags saved");
    },
    onError: (err) => toast.error(forecastErrorMessage(err, "Couldn't save tags")),
  });
}

export function useProductExpectedDailySales(productId: number | null) {
  return useQuery({
    queryKey: queryKeys.productExpectedDailySales(productId ?? 0),
    queryFn: () => calendarApi.getExpectedDailySales(productId as number),
    enabled: !!productId,
  });
}

export function usePutExpectedDailySales(productId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expectedDailyUnits: string | null) =>
      calendarApi.putExpectedDailySales(productId, expectedDailyUnits),
    onSuccess: (result) => {
      qc.setQueryData(queryKeys.productExpectedDailySales(productId), result);
      toast.success("Expected daily amount saved");
    },
    onError: (err) =>
      toast.error(forecastErrorMessage(err, "Couldn't save expected amount")),
  });
}
