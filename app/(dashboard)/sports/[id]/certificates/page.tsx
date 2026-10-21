"use client";

import { useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";

function SportsCertificatesRedirect() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  useEffect(() => {
    if (eventId) {
      router.replace(`/sports/print?eventId=${eventId}&tab=certificates`);
    }
  }, [eventId, router]);

  return (
    <div className="p-12 text-center text-xs text-muted-foreground">
      Opening Merit Certificates in Sports Print Studio...
    </div>
  );
}

export default function SportsCertificatesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
      <SportsCertificatesRedirect />
    </Suspense>
  );
}
