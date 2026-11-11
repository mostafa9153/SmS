"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { ROOM_KIND_LABEL, useRefreshAssets } from "@/lib/assets/use-assets";
import type { RoomRow } from "@/lib/rooms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Exam rooms (with a bench layout) are added from EMS; here go offices, stores, labs...
const KINDS = ["office", "store", "lab", "staff", "classroom", "hall", "other"].map((k) => ({ value: k, label: ROOM_KIND_LABEL[k] }));

export function AddRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const refresh = useRefreshAssets();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("office");
  const [floor, setFloor] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    onOpenChange(false);
    setName("");
    setFloor("");
    setKind("office");
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: RoomRow; undoId?: string }>("/api/rooms", {
        method: "POST",
        json: { name, kind, floor, is_exam_room: false },
        raw: true,
      });
      toastWithUndo(`Added ${res.data.name}`, res.undoId, refresh);
      refresh();
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the room");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add room</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="room-name">Name</Label>
            <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office, Store room" autoFocus className="h-11 text-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <CustomSelect value={kind} onChange={setKind} options={KINDS} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="room-floor">Floor</Label>
              <Input id="room-floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Optional" className="h-11 text-base" />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Adding..." : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
