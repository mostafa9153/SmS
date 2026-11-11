"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { useRefreshAssets } from "@/lib/assets/use-assets";
import { CATEGORIES, type AssetItem, type Category, type Tracking } from "@/lib/assets/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORY_LABEL: Record<Category, string> = {
  furniture: "Furniture",
  electrical: "Electrical",
  it: "IT",
  lab: "Lab",
  sports: "Sports",
  other: "Other",
};
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));

export function AddItemDialog({
  open,
  onOpenChange,
  initialName = "",
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onAdded?: (item: AssetItem) => void;
}) {
  const refresh = useRefreshAssets();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<Category>("other");
  const [tracking, setTracking] = useState<Tracking>("count");
  const [saving, setSaving] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(initialName);
      setCategory("other");
      setTracking("count");
    }
  }

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ data: AssetItem; undoId?: string }>("/api/assets/items", {
        method: "POST",
        json: { name, category, tracking },
        raw: true,
      });
      toastWithUndo(`Added item ${res.data.name}`, res.undoId, refresh);
      refresh();
      onAdded?.(res.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Water filter" autoFocus className="h-11 text-base" />
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <CustomSelect value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
          </div>
          <div className="grid gap-1.5">
            <Label>Tracking</Label>
            <SegmentedControl
              value={tracking}
              onChange={setTracking}
              options={[
                { value: "count", label: "Count only" },
                { value: "serial", label: "Each has own code" },
              ]}
            />
          </div>
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Adding..." : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
