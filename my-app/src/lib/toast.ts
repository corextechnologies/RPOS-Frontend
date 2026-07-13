import { toast } from "sonner";

type ToastSeverity = "info" | "success" | "warning" | "error";

const handlers: Record<ToastSeverity, (message: string) => void> = {
  info: (message) => toast(message),
  success: (message) => toast.success(message),
  warning: (message) => toast.warning(message),
  error: (message) => toast.error(message),
};

export function notify(severity: ToastSeverity, message: string) {
  handlers[severity](message);
}

export function notifyError(error: unknown, fallback = "Something went wrong") {
  const message = error instanceof Error ? error.message : fallback;
  notify("error", message);
}
