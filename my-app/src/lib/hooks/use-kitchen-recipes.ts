"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { posErrorMessage } from "@/lib/api/errors";
import type {
  CreateKitchenProductInput,
  CreateKitchenRecipeInput,
  KitchenProduceInput,
} from "@/lib/types/kitchen";

export const kitchenRecipeKeys = {
  catalogue: ["kitchen-catalogue"] as const,
  recipes: ["kitchen-recipes"] as const,
  recipe: (id: string) => ["kitchen-recipe", id] as const,
  production: ["kitchen-production"] as const,
};

export function useKitchenCatalogue() {
  return useQuery({
    queryKey: kitchenRecipeKeys.catalogue,
    queryFn: () => api.listKitchenCatalogue(),
  });
}

export function useCreateKitchenProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateKitchenProductInput) => api.createKitchenProduct(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kitchenRecipeKeys.catalogue });
      toast.success("Added. Give it a recipe so it can be made.");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useKitchenRecipes() {
  return useQuery({
    queryKey: kitchenRecipeKeys.recipes,
    queryFn: () => api.listKitchenRecipes(),
  });
}

/**
 * Recipes are versioned, not edited — posting the same product again supersedes
 * the previous one (v1 → v2). So this invalidates the catalogue too: a product
 * that had no recipe now has one, and `has_recipe` just changed.
 */
export function useCreateKitchenRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateKitchenRecipeInput) => api.createKitchenRecipe(body),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: kitchenRecipeKeys.recipes });
      qc.invalidateQueries({ queryKey: kitchenRecipeKeys.catalogue });
      toast.success(
        recipe.version > 1
          ? `Saved as v${recipe.version} — the previous recipe is retired.`
          : "Recipe saved",
      );
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useKitchenProduction() {
  return useQuery({
    queryKey: kitchenRecipeKeys.production,
    queryFn: () => api.listKitchenProduction(),
  });
}

/**
 * `idempotencyKey` (optional) rides the produce request so a retried "Mark made"
 * replays the original run instead of double-producing. Callers mint one key per
 * produce intent and reuse it across retries.
 */
export function useProduceKitchenProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: KitchenProduceInput;
      idempotencyKey?: string;
    }) => api.produceKitchenProduct(body, idempotencyKey),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: kitchenRecipeKeys.production });
      // A run both consumes and creates kitchen stock, so inventory moved.
      qc.invalidateQueries({ queryKey: ["kitchen-inventory"] });
      const made = run.lines.find((l) => l.role === "OUTPUT");
      toast.success(`Made ${made?.quantity ?? ""} ${made?.product_name ?? "item(s)"}`);
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}
