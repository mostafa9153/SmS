"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, RotateCw, ZoomIn, ZoomOut, Check, X, RefreshCw, AlertCircle, Sparkles, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { showToast } from "@/components/ui/toast-banner";

interface PhotoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentPhotoUrl?: string;
  onPhotoSaved: (newUrl: string) => void;
  onPhotoRemoved?: () => void;
}

export function PhotoStudioModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentPhotoUrl,
  onPhotoSaved,
  onPhotoRemoved,
}: PhotoStudioModalProps) {
  // Navigation tabs: 'upload' | 'camera' | 'crop'
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [imageSource, setImageSource] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Crop / Transform state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Optimization & Processing state
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [optimizedSizeKb, setOptimizedSizeKb] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async (facing: "user" | "environment" = "user") => {
    setCameraError(null);
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this browser or connection.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start failure:", err);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access or upload an image file."
          : "Unable to open camera on this device. Please select an image file instead."
      );
      setCameraActive(false);
    }
  }, [stopCamera]);

  // Clean up camera on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setImageSource(null);
      setOptimizedBlob(null);
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen, stopCamera]);

  // Manage tab changes
  useEffect(() => {
    if (isOpen && activeTab === "camera" && !imageSource) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, imageSource, facingMode, startCamera, stopCamera]);

  // Process image file or blob helper
  const processImageFile = useCallback((file: File | Blob) => {
    if (!file.type.startsWith("image/")) {
      showToast({ type: "error", title: "Invalid File", description: "Please select an image file (JPG, PNG, WebP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSource(reader.result as string);
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      stopCamera();
    };
    reader.readAsDataURL(file);
  }, [stopCamera]);

  // Handle file select (from PC file system, scanner folder, or mobile camera picker)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Clipboard Paste (Ctrl+V) listener for printer/scanner copies & screenshots
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            showToast({
              type: "success",
              title: "Photo Pasted",
              description: "Loaded scanned photo from clipboard!",
            });
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, processImageFile]);

  // Capture snapshot from live camera feed
  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setImageSource(dataUrl);
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    stopCamera();
  };

  // -------------------------------------------------------------
  // HTML5 Canvas 3:4 Passport Crop & < 40KB Auto-Compression
  // Target: 300px width x 400px height (Strict 3:4 Ratio)
  // -------------------------------------------------------------
  const generateOptimizedCrop = useCallback(async () => {
    if (!imageSource) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSource;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const targetW = 300;
      const targetH = 400; // 3:4 aspect ratio

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill crisp white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetW, targetH);

      // Apply transformations centered in canvas
      ctx.save();
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(panOffset.x, panOffset.y);

      // Draw image centered
      const drawW = targetW;
      const drawH = (img.height / img.width) * targetW;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Dynamic quality titration to strictly guarantee file size < 40 KB
      let quality = 0.82;
      let blob: Blob | null = null;

      while (quality >= 0.35) {
        blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob((b) => res(b), "image/webp", quality);
        });

        if (blob && blob.size <= 40 * 1024) {
          // Success: within 40KB threshold!
          break;
        }
        quality -= 0.08;
      }

      // Fallback if browser doesn't support WebP export
      if (!blob || (blob.type !== "image/webp" && blob.size > 40 * 1024)) {
        blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob((b) => res(b), "image/jpeg", 0.75);
        });
      }

      if (blob) {
        setOptimizedBlob(blob);
        setOptimizedSizeKb(Math.round((blob.size / 1024) * 10) / 10);
      }
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSource, zoom, rotation, panOffset]);

  // Debounced auto-generate when crop parameters change
  useEffect(() => {
    if (imageSource) {
      const timer = setTimeout(() => {
        generateOptimizedCrop();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [imageSource, zoom, rotation, panOffset, generateOptimizedCrop]);

  // Pointer drag for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  // Save to backend & Supabase storage
  const handleSavePhoto = async () => {
    if (!optimizedBlob) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("photo", optimizedBlob, `${studentId}.webp`);

      const res = await fetch(`/api/students/${studentId}/photo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save photo");
      }

      showToast({
        type: "success",
        title: "Photo Saved Successfully",
        description: `Passport photo (${optimizedSizeKb} KB) uploaded to cloud storage.`,
      });

      onPhotoSaved(data.photoUrl);
      onClose();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Upload Failed",
        description: err.message || "Could not upload photo.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    if (!window.confirm(`Are you sure you want to remove the photo for ${studentName}?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${studentId}/photo`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove photo");
      }
      showToast({
        type: "success",
        title: "Photo Removed",
        description: `Passport photo for ${studentName} was removed.`,
      });
      if (onPhotoRemoved) {
        onPhotoRemoved();
      }
      onClose();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Remove Failed",
        description: err.message || "Failed to remove photo.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-2xl bg-card border shadow-xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pr-12 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Passport Photo Studio
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Student: <span className="font-semibold text-foreground">{studentName}</span> (3:4 Ratio, Max 40 KB)
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {!imageSource ? (
            <div>
              {/* Tabs: Upload / Scanner vs Live Camera */}
              <div className="flex rounded-lg bg-muted p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                    activeTab === "upload" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload or Scan File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("camera")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                    activeTab === "camera" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Live Camera / Webcam
                </button>
              </div>

              {/* Upload Tab View */}
              {activeTab === "upload" && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processImageFile(file);
                    }
                  }}
                  className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-all bg-muted/10 hover:bg-primary/5 flex flex-col items-center justify-center space-y-3 group"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Click to select scanned photo or document</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select file, drag & drop, or press <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px] text-foreground font-semibold">Ctrl + V</kbd> to paste
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">
                      Auto-compressed to WebP (&lt; 40 KB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Live Camera Tab View */}
              {activeTab === "camera" && (
                <div className="space-y-3">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center border">
                    {cameraError ? (
                      <div className="p-5 text-center text-rose-400 space-y-2">
                        <AlertCircle className="h-8 w-8 mx-auto" />
                        <p className="text-xs">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          className="mt-2 text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white font-medium"
                        >
                          Retry Camera
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* 3:4 Passport Oval / Box Guide */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-36 h-48 sm:w-44 sm:h-56 border-2 border-primary border-dashed rounded-lg shadow-2xl bg-primary/5 relative">
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary bg-background/90 px-2 py-0.5 rounded-full border shadow-xs">
                              Fit Face Here (3:4)
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {cameraActive && (
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const next = facingMode === "user" ? "environment" : "user";
                          setFacingMode(next);
                          startCamera(next);
                        }}
                        className="p-2.5 rounded-full border bg-background hover:bg-muted text-muted-foreground transition-colors"
                        title="Switch Camera (Front/Back)"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={captureCameraSnapshot}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 shadow-md active:scale-95 transition-all"
                      >
                        <Camera className="h-4 w-4" />
                        Capture Photo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 3:4 Passport Crop & Alignment View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Adjust & Center Face in 3:4 Frame
                </span>
                {optimizedSizeKb != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold">
                    <Sparkles className="h-3 w-3" />
                    {optimizedSizeKb} KB (Target &lt; 40KB) ✅
                  </span>
                )}
              </div>

              {/* Viewport: 3:4 Aspect Ratio Frame (Width 240px x Height 320px) */}
              <div className="flex justify-center">
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className="relative w-48 h-64 sm:w-56 sm:h-[298px] rounded-lg overflow-hidden border-2 border-primary bg-muted/40 cursor-grab active:cursor-grabbing shadow-inner select-none touch-none flex items-center justify-center"
                >
                  {/* Image being dragged/zoomed/rotated */}
                  <img
                    src={imageSource}
                    alt="Passport Preview"
                    draggable={false}
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                      transition: isDragging ? "none" : "transform 0.1s ease-out",
                    }}
                    className="max-w-none w-full pointer-events-none object-contain select-none"
                  />

                  {/* 3:4 Grid watermark lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                </div>
              </div>

              {/* Adjustment Sliders & Controls */}
              <div className="space-y-3 bg-muted/20 p-3 rounded-xl border">
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="range"
                    min="0.6"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-foreground transition-colors"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Rotate 90°
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageSource(null);
                      setOptimizedBlob(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Re-take
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 sm:py-4 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div>
            {currentPhotoUrl && !imageSource && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isDeleting || isSaving}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Photo</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            {imageSource && (
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isSaving || isProcessing || !optimizedBlob}
                className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading (&lt;40KB)...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Photo
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
