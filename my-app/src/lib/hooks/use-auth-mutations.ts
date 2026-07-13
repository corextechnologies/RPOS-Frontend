"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/lib/types/super-admin";
import { notify } from "@/lib/toast";

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => api.forgotPassword(input),
    onSuccess: () => {
      notify("success", "If an account exists, a reset link has been sent.");
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Request failed"),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => api.resetPassword(input),
    onSuccess: () => {
      notify("success", "Password updated. You can sign in now.");
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Reset failed"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.changePassword(input),
    onSuccess: () => {
      notify("success", "Password updated successfully.");
    },
    onError: (error) => notify("error", error instanceof Error ? error.message : "Update failed"),
  });
}
