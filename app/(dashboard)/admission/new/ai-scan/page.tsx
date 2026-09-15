"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdmissionSettings, saveAdmissionSettings } from "@/lib/data/admission";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast-banner";
import {
  Camera,
  Upload,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Key,
  RotateCcw,
  Eye,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertCircle,
  IdCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplyPageContent } from "../apply/page";

export function AiScanContent({
  hideBackLink,
  embedded = false,
}: {
  hideBackLink?: boolean;
  embedded?: boolean;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  // Settings & API Key
  const { data: settings } = useQuery({
    queryKey: ["admission-settings"],
    queryFn: getAdmissionSettings,
  });

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    if (settings?.aiApiKey) {
      setApiKeyInput(settings.aiApiKey);
    }
  }, [settings]);

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
    if (mode === "camera" && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, facingMode, capturedImage]);

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

  // Save API Key
  const saveKeyMutation = useMutation({
    mutationFn: saveAdmissionSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-settings"] });
      showToast("AI API Key saved successfully!", "success");
      setShowKeyInput(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save API Key", "error");
    },
  });

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
        if (data.missingKey) {
          setShowKeyInput(true);
        }
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
                <Camera className="h-5 w-5 text-pink-500" />
                <span>AI Form Scanner &amp; Camera</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Snap a physical admission form with your camera or upload an image. AI extracts the fields automatically.
              </p>
            </div>
          </div>

          {/* API Key Configure Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs font-semibold rounded-xl border-border flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="h-3.5 w-3.5 text-amber-500" />
              <span>{settings?.aiApiKey ? "Change API Key" : "Set API Key"}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border p-3.5 rounded-2xl shadow-2xs">
          <p className="text-xs text-muted-foreground">
            Snap physical admission forms with your device camera or upload image files to auto-fill applicant info using Gemini AI.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="text-xs font-semibold rounded-xl border-border flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Key className="h-3.5 w-3.5 text-amber-500" />
            <span>{settings?.aiApiKey ? "Change API Key" : "Set API Key"}</span>
          </Button>
        </div>
      )}

      {/* Inline API Key Setting Banner */}
      {showKeyInput && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            <Key className="h-4 w-4 text-amber-500" />
            <span>Google Gemini / OpenAI OCR API Key</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Paste your Google Gemini API Key (e.g. Gemini 1.5 Flash - Free Tier supported).
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="password"
              placeholder="AIzaSy... (Paste Google Gemini or OpenAI Key)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="h-9 text-xs rounded-xl bg-background"
            />
            <Button
              onClick={() =>
                saveKeyMutation.mutate({
                  schoolId: "default",
                  aiApiKey: apiKeyInput,
                  aiProvider: apiKeyInput.startsWith("sk-") ? "openai" : "gemini",
                  aiModel: apiKeyInput.startsWith("sk-") ? "gpt-4o-mini" : "gemini-1.5-flash",
                  currentAcademicYear: "2026",
                  newAdmissionActive: true,
                  readmissionActive: true,
                })
              }
              disabled={saveKeyMutation.isPending}
              className="h-9 text-xs font-bold px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              Save Key
            </Button>
          </div>
        </div>
      )}

      {/* Scanner Mode Selector: Live Camera vs Upload */}
      <div className="bg-card border rounded-3xl p-5 shadow-xs space-y-4">
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

      {/* Extracted Data rendered inside the Standard Application Form */}
      {Object.keys(extractedData).length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <ApplyPageContent
            aiExtractedData={extractedData}
            scannedImageUrl={capturedImage || undefined}
          />
        </div>
      )}
    </div>
  );
}

export default function AiScanPage() {
  return <AiScanContent />;
}
