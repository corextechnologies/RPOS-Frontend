"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const [busy, setBusy] = useState(false);

  const confirm = (opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setState({ ...opts, resolve }));

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
    setBusy(false);
  };

  const dialog = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title}
      description={state?.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            variant={state?.danger ? "danger" : "primary"}
            loading={busy}
            onClick={() => {
              setBusy(true);
              close(true);
            }}
          >
            {state?.confirmLabel ?? "Confirm"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">This action cannot be undone.</p>
    </Modal>
  );

  return { confirm, dialog };
}
