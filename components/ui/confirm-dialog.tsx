"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONFIRM_ATTR } from "@/components/ui/confirm-guard";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for deletes and other destructive actions. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based replacement for window.confirm:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete room?", destructive: true }))) return;
 */
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((input) => {
    resolver.current?.(false); // a newer prompt cancels an unanswered one
    setOptions(typeof input === "string" ? { title: input } : input);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* Raw Root (not the guarded `Dialog`): this popup must still close on Escape / outside press. */}
      <DialogPrimitive.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm" {...{ [CONFIRM_ATTR]: "" }}>
          <DialogHeader>
            <DialogTitle className="font-semibold">{options?.title}</DialogTitle>
            {options?.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            <Button variant="outline" onClick={() => settle(false)}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={options?.destructive ? "destructive" : "default"} onClick={() => settle(true)} autoFocus>
              {options?.confirmLabel ?? (options?.destructive ? "Delete" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}
