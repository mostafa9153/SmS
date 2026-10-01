"use client";

import React, { useState } from "react";
import { RoutineRoom } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Check, X, Building2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoutineRoomsTabProps {
  rooms: RoutineRoom[];
  onSaveRoom: (room: { id?: string; name: string; isLab?: boolean }) => Promise<void>;
  onDeleteRoom: (id: string) => Promise<void>;
}

export function RoutineRoomsTab({ rooms, onSaveRoom, onDeleteRoom }: RoutineRoomsTabProps) {
  const [name, setName] = useState("");
  const [isLab, setIsLab] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveRoom({
        id: editId || undefined,
        name: name.trim(),
        isLab,
      });
      setName("");
      setIsLab(false);
      setEditId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (room: RoutineRoom) => {
    setEditId(room.id);
    setName(room.name);
    setIsLab(Boolean(room.isLab));
  };

  const handleCancel = () => {
    setEditId(null);
    setName("");
    setIsLab(false);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Form Card */}
      <form onSubmit={handleSubmit} autoComplete="off" className="bg-card border rounded-lg p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {editId ? "Edit Room / Facility" : "Add Room / Laboratory"}
            </h2>
          </div>
          {editId && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">
              Editing Mode
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-center">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-medium">Room Name / Facility Identifier *</Label>
            <Input
              type="text"
              placeholder="e.g. Physics Lab, Room 204, Computer Lab A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="pt-5 flex items-center">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none border p-2 rounded-md bg-background hover:bg-muted/40 transition-colors w-full">
              <input
                type="checkbox"
                checked={isLab}
                onChange={(e) => setIsLab(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
              <span>Dedicated Laboratory / Special Room</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t">
          {editId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-8 text-xs px-3"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !name.trim()}
            className="h-8 text-xs font-semibold px-4"
          >
            {editId ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Room
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Table Card */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Configured Rooms & Labs</span>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {rooms.length} Total
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-4">Room / Facility Name</th>
                <th className="py-2.5 px-4">Facility Type</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    <Building2 className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>No dedicated rooms added yet. Classes will default to standard classrooms.</span>
                  </td>
                </tr>
              ) : (
                rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-foreground">{r.name}</td>
                    <td className="py-2.5 px-4">
                      {r.isLab ? (
                        <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-1 font-medium">
                          <FlaskConical className="w-3 h-3 text-blue-600" />
                          Laboratory / Facility
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Standard Classroom</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(r)}
                        aria-label={`Edit ${r.name}`}
                        title={`Edit ${r.name}`}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteRoom(r.id)}
                        aria-label={`Delete ${r.name}`}
                        title={`Delete ${r.name}`}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

