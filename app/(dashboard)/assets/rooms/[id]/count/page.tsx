"use client";

import { useParams } from "next/navigation";
import { CountScreen } from "@/components/assets/count/count-screen";

export default function AssetRoomCountPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-3xl mx-auto">
      <CountScreen roomId={decodeURIComponent(id)} />
    </div>
  );
}
