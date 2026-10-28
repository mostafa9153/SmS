"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const BACK_CLASS =
  "rounded-xl p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer shrink-0";

export function BackButton({ back }: { back: string | true | (() => void) }) {
  const router = useRouter();
  if (typeof back === "string") {
    return (
      <Link href={back} title="Back" aria-label="Back" className={BACK_CLASS}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={back === true ? () => router.back() : back} title="Back" aria-label="Back" className={BACK_CLASS}>
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
