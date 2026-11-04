import { cn } from "@/lib/utils";

export function SchoolWatermark({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  const src = logoUrl?.trim() || "/school-logo.png";
  return (
    <div aria-hidden className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden print:fixed">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        className={cn("w-[120mm] h-[120mm] max-w-[70%] max-h-[70%] object-contain opacity-[0.08] grayscale select-none", className)}
      />
    </div>
  );
}
