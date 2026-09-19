"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RotateCcw, Check, Sparkles, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";

interface PhotoCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhotoUrl?: string;
  onPhotoSaved: (photoUrl: string) => void;
  studentName?: string;
}

export function PhotoCaptureDialog({
  open,
  onOpenChange,
  currentPhotoUrl,
  onPhotoSaved,
  studentName,
}: PhotoCaptureDialogProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start live webcam stream
  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      showToast("Webcam unavailable. Switching to file upload mode.", "info");
      setMode("upload");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (open && mode === "camera" && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, mode, facingMode, capturedImage]);

  // Reset image when opened with current photo
  useEffect(() => {
    if (open) {
      setCapturedImage(currentPhotoUrl || null);
    }
  }, [open, currentPhotoUrl]);

  // Capture square snapshot
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const startX = ((video.videoWidth || 480) - size) / 2;
    const startY = ((video.videoHeight || 480) - size) / 2;

    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle image upload from file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
          setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!capturedImage) {
      showToast("Please capture or upload a passport photo first.", "error");
      return;
    }
    setIsProcessing(true);
    onPhotoSaved(capturedImage);
    setIsProcessing(false);
    onOpenChange(false);
    showToast("Passport photo attached successfully!", "success");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] p-5 sm:p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
            <Camera className="h-5 w-5 text-purple-600" />
            <span>Passport Photo Capture</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {studentName ? `Photo for: ${studentName}` : "Capture or upload passport-sized square photo"}
          </p>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="flex items-center justify-center bg-muted p-1 rounded-xl my-2">
          <button
            type="button"
            onClick={() => {
              setMode("camera");
              setCapturedImage(null);
            }}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              mode === "camera"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Live Camera</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              stopCamera();
            }}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              mode === "upload"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>File Upload</span>
          </button>
        </div>

        {/* Viewport Box */}
        <div className="flex flex-col items-center justify-center my-2">
          {capturedImage ? (
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-purple-500 shadow-md bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Captured Student"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                Square Crop
              </div>
            </div>
          ) : mode === "camera" ? (
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-border shadow-inner bg-black flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Passport Guidelines Overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/25 rounded-2xl m-3 flex items-center justify-center">
                <div className="w-24 h-32 border border-dashed border-white/40 rounded-full" />
              </div>

              {/* Camera Switch button */}
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              {/* Take snapshot trigger */}
              <button
                type="button"
                onClick={takeSnapshot}
                className="absolute bottom-2 h-10 w-10 rounded-full bg-white text-slate-900 hover:bg-slate-200 shadow-xl border-2 border-purple-500 flex items-center justify-center cursor-pointer active:scale-95"
                title="Capture Photo"
              >
                <Camera className="h-5 w-5 text-purple-700" />
              </button>
            </div>
          ) : (
            <label className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-500 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors bg-purple-50/50 dark:bg-purple-950/20">
              <Upload className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
              <span className="text-xs font-bold text-foreground">
                Upload Image
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">
                Square passport size JPEG/PNG
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          {capturedImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCapturedImage(null);
                if (mode === "camera") startCamera();
              }}
              className="mt-3 h-8 text-xs font-semibold rounded-xl"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span>Retake / Change</span>
            </Button>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stopCamera();
              onOpenChange(false);
            }}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={!capturedImage || isProcessing}
            size="sm"
            className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Use This Photo</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
