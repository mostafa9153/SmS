"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  QrCode,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  FileImage,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import jsQR from "jsqr";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (certificateNo: string) => void;
}

export function extractCertificateNumber(rawCode: string): string {
  const trimmed = rawCode.trim();
  try {
    const url = new URL(trimmed);
    const fromParam =
      url.searchParams.get("search") ||
      url.searchParams.get("number") ||
      url.searchParams.get("q") ||
      url.searchParams.get("cert");
    if (fromParam) return fromParam.trim().toUpperCase();

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (last.includes("-") || last.includes("/")) return last.trim().toUpperCase();
    }
  } catch {
    // not a valid URL, treat as raw serial text
  }
  return trimmed.toUpperCase();
}

export function QRScannerModal({
  open,
  onOpenChange,
  onScanSuccess,
}: QRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Stop camera stream & scan loop
  const stopCamera = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  // Handle successful detection
  const handleDetected = useCallback(
    (rawData: string) => {
      stopCamera();
      const certNo = extractCertificateNumber(rawData);
      setScannedResult(certNo);

      // Play soft sound or haptic feedback if available
      try {
        if ("vibrate" in navigator) navigator.vibrate(80);
      } catch {}

      // Auto notify parent after small animation delay
      setTimeout(() => {
        onScanSuccess(certNo);
        onOpenChange(false);
      }, 700);
    },
    [stopCamera, onScanSuccess, onOpenChange]
  );

  const scanVideoFrameRef = useRef<() => void>(() => {});

  // Continuous frame scanner
  const scanVideoFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        // Run jsQR
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && code.data.trim()) {
          handleDetected(code.data);
          return;
        }
      }
    }

    animFrameId.current = requestAnimationFrame(() => {
      scanVideoFrameRef.current();
    });
  }, [handleDetected]);

  useEffect(() => {
    scanVideoFrameRef.current = scanVideoFrame;
  }, [scanVideoFrame]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsScanning(true);
    setScannedResult(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        animFrameId.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setIsScanning(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device found on this system. You can upload a QR image instead.");
      } else {
        setCameraError(err.message || "Failed to start camera. Please try image upload.");
      }
    }
  }, [facingMode, scanVideoFrame, stopCamera]);

  // Handle image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            handleDetected(code.data);
          } else {
            alert("No QR code was detected in this image. Please upload a clear photo of the certificate QR.");
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Watch modal open/close state
  useEffect(() => {
    if (open) {
      setScannedResult(null);
      if (activeTab === "camera") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, activeTab, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-5 rounded-2xl bg-card border shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Certificate QR Scanner
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Point camera at certificate QR code or upload photo to verify authenticity
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher: Camera vs Image File */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("camera");
              startCamera();
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "camera"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              stopCamera();
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "upload"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Photo
          </button>
        </div>

        {/* Camera View */}
        {activeTab === "camera" && (
          <div className="space-y-3">
            <div className="relative aspect-video sm:aspect-square w-full max-h-[300px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-border/70">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target Crosshair & Laser */}
              {isScanning && !scannedResult && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border-2 border-primary/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    {/* Animated Laser Line */}
                    <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce" />

                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                  </div>
                </div>
              )}

              {/* Success Result Overlay */}
              {scannedResult && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 text-center animate-in fade-in zoom-in-95">
                  <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-white">QR Code Detected!</p>
                  <Badge variant="emerald" className="font-mono text-xs px-2.5 py-1">
                    {scannedResult}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">Verifying in database...</p>
                </div>
              )}

              {/* Camera Error Fallback */}
              {cameraError && (
                <div className="p-4 text-center space-y-2 max-w-xs text-white">
                  <AlertCircle className="h-7 w-7 text-rose-400 mx-auto" />
                  <p className="text-xs font-semibold text-rose-300">{cameraError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startCamera}
                    className="h-8 text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry Camera
                  </Button>
                </div>
              )}
            </div>

            {/* Camera Controls Bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="text-[11px]">Hold QR code steady within frame</span>
              <button
                type="button"
                onClick={() => {
                  setFacingMode((f) => (f === "environment" ? "user" : "environment"));
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <FlipHorizontal className="h-3.5 w-3.5" /> Flip Camera
              </button>
            </div>
          </div>
        )}

        {/* Photo Upload View */}
        {activeTab === "upload" && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-border rounded-2xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors p-4 text-center group">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-2">
                <FileImage className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-foreground">
                Click to browse or drop certificate image
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Supports JPG, PNG, WEBP or scanned copies
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
