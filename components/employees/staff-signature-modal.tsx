"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showToast } from "@/components/ui/toast-banner";
import {
  FileSignature,
  Upload,
  PenTool,
  RotateCcw,
  Trash2,
  Check,
  Loader2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  currentSignatureUrl?: string;
  onSignatureSaved: (newUrl: string) => void;
  onSignatureRemoved?: () => void;
}

export function StaffSignatureModal({
  isOpen,
  onClose,
  staffId,
  staffName,
  currentSignatureUrl,
  onSignatureSaved,
  onSignatureRemoved,
}: StaffSignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "draw">("upload");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawing Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState<string>("#1e3a8a"); // Official Blue ink
  const [penWidth, setPenWidth] = useState<number>(3);

  // Canvas drawing functions
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setHasDrawn(false);
      // clear canvas next tick if open
      setTimeout(clearCanvas, 50);
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast({
        type: "error",
        title: "File Too Large",
        description: "Signature image must be under 3MB.",
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
  };

  // Save handler
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (activeTab === "upload") {
        if (!selectedFile) {
          showToast({
            type: "error",
            title: "No File Selected",
            description: "Please choose a signature image file to upload.",
          });
          return;
        }

        const formData = new FormData();
        formData.append("signature", selectedFile);

        const res = await fetch(`/api/employees/${staffId}/signature`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to upload signature");
        }

        onSignatureSaved(data.signatureUrl);
        showToast({
          type: "success",
          title: "Signature Uploaded",
          description: `Digital signature saved successfully for ${staffName}.`,
        });
        onClose();
      } else {
        // Draw tab
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) {
          showToast({
            type: "error",
            title: "Empty Signature",
            description: "Please draw your signature before saving.",
          });
          return;
        }

        const dataUrl = canvas.toDataURL("image/png");

        const res = await fetch(`/api/employees/${staffId}/signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureUrl: dataUrl }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to save drawn signature");
        }

        onSignatureSaved(data.signatureUrl);
        showToast({
          type: "success",
          title: "Signature Saved",
          description: `Handdrawn signature saved successfully for ${staffName}.`,
        });
        onClose();
      }
    } catch (err: any) {
      console.error("Signature save error:", err);
      showToast({
        type: "error",
        title: "Save Failed",
        description: err.message || "Failed to save signature.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove handler
  const handleRemove = async () => {
    if (!window.confirm(`Are you sure you want to remove the signature for ${staffName}?`)) {
      return;
    }

    try {
      setIsRemoving(true);
      const res = await fetch(`/api/employees/${staffId}/signature`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove signature");
      }

      if (onSignatureRemoved) onSignatureRemoved();
      showToast({
        type: "success",
        title: "Signature Removed",
        description: `Official signature removed for ${staffName}.`,
      });
      onClose();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Remove Failed",
        description: err.message || "Failed to remove signature.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-0 overflow-hidden border border-border shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-2xs">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Official Digital Signature
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Sign-off credential for: <span className="font-semibold text-foreground">{staffName}</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Mode Tabs: Upload vs Draw */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "upload" | "draw")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 p-1 rounded-xl bg-muted/80 border border-border/80 h-9">
              <TabsTrigger
                value="upload"
                className="text-xs font-semibold rounded-lg flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Upload className="h-3.5 w-3.5 text-blue-600" />
                Upload Image
              </TabsTrigger>
              <TabsTrigger
                value="draw"
                className="text-xs font-semibold rounded-lg flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <PenTool className="h-3.5 w-3.5 text-indigo-600" />
                Draw on Screen
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Upload File */}
            <TabsContent value="upload" className="space-y-3 pt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {filePreviewUrl ? (
                <div className="space-y-2">
                  <div className="w-full h-36 rounded-xl border border-border bg-white dark:bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden shadow-inner">
                    <img
                      src={filePreviewUrl}
                      alt="Signature preview"
                      className="max-h-28 max-w-[90%] object-contain filter contrast-125 dark:invert"
                    />
                    <div className="absolute bottom-1 right-2 text-[10px] font-mono text-muted-foreground">
                      Preview
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[220px]">
                      {selectedFile?.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      Choose Different Image
                    </Button>
                  </div>
                </div>
              ) : currentSignatureUrl ? (
                <div className="space-y-2">
                  <div className="w-full h-32 rounded-xl border border-border bg-white dark:bg-zinc-950 flex items-center justify-center p-3 relative shadow-inner">
                    <img
                      src={currentSignatureUrl}
                      alt="Current Signature"
                      className="max-h-24 max-w-[90%] object-contain filter contrast-125 dark:invert"
                    />
                    <span className="absolute top-2 right-2 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Currently Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-semibold rounded-xl flex-1 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Replace with New File
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemove}
                      disabled={isRemoving}
                      className="h-8 text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full h-36 rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer transition-all duration-200",
                    "hover:border-primary/60 hover:bg-muted/50 active:scale-[0.99]"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">
                      Click to choose signature image
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PNG (transparent background) or JPG / WebP up to 3MB
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Draw on Screen */}
            <TabsContent value="draw" className="space-y-3 pt-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Ink:</span>
                  <button
                    type="button"
                    onClick={() => setInkColor("#1e3a8a")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-blue-900 border-2 transition-transform cursor-pointer",
                      inkColor === "#1e3a8a" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-80"
                    )}
                    title="Royal Blue Ink"
                  />
                  <button
                    type="button"
                    onClick={() => setInkColor("#111827")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-zinc-900 border-2 transition-transform cursor-pointer",
                      inkColor === "#111827" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-80"
                    )}
                    title="Black Ink"
                  />
                  <button
                    type="button"
                    onClick={() => setInkColor("#4c1d95")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-purple-900 border-2 transition-transform cursor-pointer",
                      inkColor === "#4c1d95" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-80"
                    )}
                    title="Dark Violet Ink"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Pen:</span>
                    {[2, 3, 4].map((width) => (
                      <button
                        key={width}
                        type="button"
                        onClick={() => setPenWidth(width)}
                        className={cn(
                          "w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center border transition-colors cursor-pointer",
                          penWidth === width
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        )}
                      >
                        {width}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCanvas}
                    className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Drawing Pad Canvas */}
              <div className="relative rounded-xl border border-border/90 bg-white dark:bg-zinc-950 overflow-hidden shadow-inner touch-none">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={150}
                  className="w-full h-36 cursor-crosshair block"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-1 select-none">
                    <PenTool className="h-5 w-5 opacity-50" />
                    <span className="text-xs font-medium">Sign above with mouse or stylus</span>
                  </div>
                )}
                {/* Guide line */}
                <div className="absolute left-6 right-6 bottom-7 border-b border-dashed border-zinc-300 dark:border-zinc-800 pointer-events-none" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl h-9 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (activeTab === "upload" ? !selectedFile : !hasDrawn)}
            className="rounded-xl h-9 px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Save Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
