"use client";

import { useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

function SportsPrintRedirect() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = params.id as string;
  const tab = searchParams.get("tab") || "call";

  useEffect(() => {
    if (eventId) {
      router.replace(`/sports/print?eventId=${eventId}&tab=${tab}`);
    }
  }, [eventId, tab, router]);

  return (
    <div className="p-12 text-center text-xs text-muted-foreground">
      Opening Sports Print Studio...
    </div>
  );
}

export default function SportsPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <SportsPrintRedirect />
    </Suspense>
  );
}
