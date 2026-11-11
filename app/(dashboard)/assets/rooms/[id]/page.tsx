"use client";

import { useParams } from "next/navigation";
import { RoomStockView } from "@/components/assets/room-stock-view";

export default function AssetRoomPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-4xl mx-auto pb-24 md:pb-16">
      <RoomStockView roomId={decodeURIComponent(id)} />
    </div>
  );
}
