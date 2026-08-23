"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

let toastListeners: ((toast: ToastMessage) => void)[] = [];

export function showToast(toast: Omit<ToastMessage, "id">) {
  const newToast: ToastMessage = { ...toast, id: Math.random().toString() };
  toastListeners.forEach((listener) => listener(newToast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur bg-background/95 transition-all animate-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "border-emerald-500/40 text-emerald-950 dark:text-emerald-200"
              : toast.type === "error"
              ? "border-rose-500/40 text-rose-950 dark:text-rose-200"
              : "border-primary/40 text-foreground"
          }`}
        >
          {toast.type === "success" && (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          {toast.type === "error" && (
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          {toast.type === "info" && (
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-semibold">{toast.title}</p>
            {toast.description && (
              <p className="text-muted-foreground mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
