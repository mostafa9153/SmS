"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast-banner";
import {
  Camera,
  Upload,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  Database,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentAddEditForm } from "@/components/students/student-add-edit-form";

export function AiScanContent({
  hideBackLink,
  embedded = false,
}: {
  hideBackLink?: boolean;
  embedded?: boolean;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Scanner Visibility Toggle
  const [showScanner, setShowScanner] = useState(false);

  // Mode: "camera" | "upload"
  const [mode, setMode] = useState<"camera" | "upload">("camera");

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Image Captured / Uploaded
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Form Fields extracted by AI
  const [extractedData, setExtractedData] = useState<Record<string, any>>({});

  // Start Camera
  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      showToast("Camera access denied or unavailable. Please use file upload.", "error");
      setMode("upload");
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (showScanner && mode === "camera" && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showScanner, mode, facingMode, capturedImage]);

  // Capture frame from video
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI Scan
  const handleScanWithAi = async () => {
    if (!capturedImage) {
      showToast("Please capture or upload a form image first", "error");
      return;
    }

    setIsScanning(true);
    try {
      const res = await fetch("/api/admission/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: capturedImage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI Scan failed");
      }

      const ext = data.extracted || {};
      setExtractedData(ext);

      showToast("Form details extracted successfully! Please review below.", "success");
    } catch (err: any) {
      showToast(err.message || "Error running AI extraction", "error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className={cn("space-y-6", !embedded && "p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto")}>
      {/* Top Header */}
      {!embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            {!hideBackLink && (
              <Link
                href="/admission/new"
                className="p-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Back to New Admission Tracker"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Add New Student</span>
              </h1>
            </div>
          </div>

          {/* Highlighted AI Scan Trigger Button */}
          <button
            type="button"
            onClick={() => setShowScanner((prev) => !prev)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer border active:scale-98",
              showScanner
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 ring-2 ring-pink-500/20"
                : "bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-amber-500/10 hover:from-pink-500/20 hover:to-rose-500/20 text-foreground border-pink-500/30 hover:border-pink-500"
            )}
            title="Scan Physical Admission Form with AI Camera / Upload"
          >
            <div
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform",
                showScanner
                  ? "bg-white/20 text-white"
                  : "bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-xs"
              )}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-extrabold text-xs sm:text-sm">AI Form Scan</span>
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase",
                    showScanner
                      ? "bg-white/20 text-white"
                      : "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30"
                  )}
                >
                  {showScanner ? "Close" : "Open"}
                </span>
              </div>
              <p
                className={cn(
                  "text-[10px] mt-0.5",
                  showScanner ? "text-white/80" : "text-muted-foreground"
                )}
              >
                {showScanner ? "Click to close camera/upload" : "Camera & Image Auto-Fill"}
              </p>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-card border p-3.5 rounded-2xl shadow-2xs">
          <span className="text-xs font-semibold text-foreground">Add New Student Record</span>
          <button
            type="button"
            onClick={() => setShowScanner((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold text-xs flex items-center gap-1.5 border border-pink-500/30 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{showScanner ? "Close AI Scan" : "AI Form Scan"}</span>
          </button>
        </div>
      )}

      {/* Scanner Mode Selector: Live Camera vs Upload (Toggled by showScanner) */}
      {showScanner && (
        <div className="bg-card border-2 border-pink-500/30 rounded-3xl p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Capture Source:
              </span>
              <div className="flex items-center bg-muted p-1 rounded-xl border">
                <button
                  type="button"
                  onClick={() => {
                    setMode("camera");
                    setCapturedImage(null);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
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
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                    mode === "upload"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>File Upload</span>
                </button>
              </div>
            </div>

            {capturedImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCapturedImage(null);
                  if (mode === "camera") startCamera();
                }}
                className="h-8 text-xs font-semibold rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Retake / Clear</span>
              </Button>
            )}
          </div>

        {/* Viewport Area */}
        <div className="flex flex-col items-center justify-center">
          {capturedImage ? (
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border bg-black shadow-inner">
              <img
                src={capturedImage}
                alt="Captured Admission Form"
                className="w-full h-auto max-h-80 object-contain mx-auto"
              />
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                Ready for AI Scan
              </div>
            </div>
          ) : mode === "camera" ? (
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border bg-black shadow-inner flex flex-col items-center justify-center min-h-[260px]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-auto max-h-80 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Action Overlay */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-4">
                <Button
                  onClick={takeSnapshot}
                  className="h-12 w-12 rounded-full bg-white text-slate-900 hover:bg-slate-200 shadow-xl border-4 border-slate-300/40 p-0 flex items-center justify-center cursor-pointer active:scale-95"
                  title="Capture Photo"
                >
                  <Camera className="h-6 w-6 text-slate-900" />
                </Button>

                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
                  }
                  className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md cursor-pointer"
                  title="Switch Camera"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <label className="w-full max-w-md border-2 border-dashed border-border hover:border-primary/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40">
              <Upload className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <span className="text-xs font-bold text-foreground">
                Click to upload admission form photo
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">
                PNG, JPG or JPEG from mobile or desktop
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          {/* Trigger Scan Button */}
          {capturedImage && (
            <div className="mt-4">
              <Button
                onClick={handleScanWithAi}
                disabled={isScanning}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {isScanning ? "Analyzing Document with AI..." : "Scan & Extract Details"}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Standard Application Form (Always rendered for manual entry or AI auto-fill) */}
      <div className="mt-8 border-t border-border pt-6 space-y-6">
        {/* Collapsible Raw Extracted Data Box */}
        {Object.keys(extractedData).length > 0 && (
          <details className="bg-card border rounded-xl overflow-hidden shadow-sm group [&_summary::-webkit-details-marker]:hidden">
            <summary className="px-4 py-3 bg-muted/30 cursor-pointer flex items-center justify-between font-semibold text-sm text-foreground hover:bg-muted/50 transition-colors list-none">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-500" />
                <span>View Raw AI Extracted Data</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
            </summary>
            <div className="p-4 bg-black/5 dark:bg-black/20 overflow-auto max-h-96 border-t">
              <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
          </details>
        )}

        <StudentAddEditForm
          aiExtractedData={extractedData}
          isEmbedded={true}
        />
      </div>
    </div>
  );
}

export default function AiScanPage() {
  return <AiScanContent />;
}
