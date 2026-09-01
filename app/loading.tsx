import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-12 w-12 rounded-full border-4 border-primary/20 animate-ping" />
        <Loader2 className="h-7 w-7 animate-spin text-primary relative z-10" />
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase mt-2">
        Loading...
      </p>
    </div>
  );
}
