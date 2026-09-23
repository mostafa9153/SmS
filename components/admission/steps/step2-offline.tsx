"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdmissionApplicationForm, AdmissionFormData } from "@/components/admission/admission-application-form";
import {
  ArrowLeft,
  Scan,
  Keyboard,
  Camera,
  Upload,
  Video,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  CameraOff,
  Sparkle,
} from "lucide-react";
import { toast } from "sonner";

interface Step2OfflineProps {
  onNext: (appData: any) => void;
  onBack: () => void;
}

export function Step2Offline({ onNext, onBack }: Step2OfflineProps) {
  const [entryMethod, setEntryMethod] = useState<"manual" | "ai">("manual");
  const [isScanning, setIsScanning] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState<Record<string, any> | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    stopCamera();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraPermissionDenied(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        await videoRef.current.play().catch((err) => console.warn("Video play interrupted:", err));
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      const isDenied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      if (isDenied) {
        setCameraPermissionDenied(true);
        toast.error("Camera permission denied. Please allow camera access in your browser.");
      } else {
        toast.error("Camera error: " + (err.message || "Please check camera connection"));
        setUseCamera(false);
      }
    }
  };

  useEffect(() => {
    if (useCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [useCamera, facingMode]);

  const processImageBase64 = async (base64: string, mimeType: string) => {
    setIsScanning(true);
    toast.info("Uploading & processing document with Gemini AI...");

    try {
      const res = await fetch("/api/admission/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mimeType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI scanning failed");
      }

      const json = await res.json();
      const extracted = json.extracted || {};

      toast.success("Document scanned & data extracted successfully!");
      setAiExtractedData(extracted);
      setEntryMethod("manual"); // Switch to manual form populated with extracted data
    } catch (err: any) {
      toast.error(err.message || "Failed to parse document with AI");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const MAX_SIZE = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > height && width > MAX_SIZE) {
        height = Math.round(height * (MAX_SIZE / width));
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = Math.round(width * (MAX_SIZE / height));
        height = MAX_SIZE;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        stopCamera();
        setUseCamera(false);
        processImageBase64(base64, "image/jpeg");
      }
    }
  };

  const handleFileUploadAndScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        await processImageBase64(base64, file.type || "image/jpeg");
      } catch (err: any) {
        toast.error(err.message || "Could not read file");
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (data: AdmissionFormData) => {
    onNext({
      ...data,
      studentName: data.studentName,
      targetClass: data.presentClass,
      formMethod: aiExtractedData ? "ai_scan" : "offline",
      // Address standard flattened format
      address: `${data.presentVillage}, ${data.presentPostOffice}, ${data.presentPoliceStation}, ${data.presentDistrict} - ${data.presentPincode}`,
      village: data.presentVillage,
      postOffice: data.presentPostOffice,
      policeStation: data.presentPoliceStation,
      district: data.presentDistrict,
      pincode: data.presentPincode,
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Offline Data Entry</h2>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        <Tabs value={entryMethod} onValueChange={(v: any) => setEntryMethod(v)} className="w-full">
          {/* Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <button
              type="button"
              onClick={() => setEntryMethod("manual")}
              className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                entryMethod === "manual"
                  ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20"
                  : "border-border hover:border-blue-300 bg-card hover:bg-muted/40 shadow-none"
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  entryMethod === "manual"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Keyboard className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Manual Entry Form
                  </span>
                  {entryMethod === "manual" ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Bilingual Form
                    </span>
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setEntryMethod("ai")}
              className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                entryMethod === "ai"
                  ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 shadow-md ring-2 ring-purple-500/20"
                  : "border-border hover:border-purple-300 bg-card hover:bg-muted/40 shadow-none"
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  entryMethod === "ai"
                    ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    AI Scanner
                  </span>
                  {entryMethod === "ai" ? (
                    <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      Live Camera / File
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* AI Banner when data is extracted */}
          {aiExtractedData && entryMethod === "manual" && (
            <div className="mb-4 p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-800 dark:text-purple-300">
                <Sparkle className="w-4 h-4 text-purple-600" />
                Data auto-filled from AI document scan. Check the fields below and click proceed.
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-purple-700 hover:text-purple-900"
                onClick={() => setEntryMethod("ai")}
              >
                Rescan Document
              </Button>
            </div>
          )}

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="mt-0">
            <AdmissionApplicationForm
              aiExtractedData={aiExtractedData}
              onSubmit={handleFormSubmit}
              submitButtonText="Proceed to Verification (Step 3)"
              mode="offline"
            />
          </TabsContent>

          {/* AI Scan Tab */}
          <TabsContent value="ai" className="mt-0 space-y-4">
            <Card className="shadow-sm border-2 border-dashed border-purple-200 dark:border-purple-800/60">
              <CardContent className="p-6 sm:p-8 text-center bg-gradient-to-b from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 rounded-2xl">
                {useCamera ? (
                  cameraPermissionDenied ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-sm mx-auto bg-card rounded-2xl border border-amber-300 dark:border-amber-800 shadow-sm text-center">
                      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center shadow-inner">
                        <CameraOff className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-foreground">Camera Access Required</h4>
                        <p className="text-xs text-muted-foreground">
                          Please allow camera access in your browser settings and click try again.
                        </p>
                      </div>
                      <div className="flex gap-2 w-full pt-1">
                        <Button onClick={() => startCamera()} className="flex-1 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
                          <RefreshCw className="w-3.5 h-3.5" /> Allow & Retry
                        </Button>
                        <Button variant="outline" onClick={() => { setUseCamera(false); setCameraPermissionDenied(false); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-xl overflow-hidden shadow-xl ring-4 ring-purple-500/20">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-4 border border-white/40 rounded-lg pointer-events-none" />

                        <button
                          type="button"
                          onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md cursor-pointer shadow-md z-10"
                          title="Switch Camera"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={handleCapturePhoto} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow" disabled={isScanning}>
                          <Camera className="w-4 h-4" /> Capture & Scan
                        </Button>
                        <Button variant="outline" onClick={() => setUseCamera(false)}>
                          Cancel
                        </Button>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-inner">
                      <Scan className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-foreground">AI Document Scanner</h3>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Take a photo of the admission form with your camera or upload a clear photo to automatically extract student details into the form.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center pt-2">
                      <Button onClick={() => setUseCamera(true)} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow" disabled={isScanning}>
                        <Video className="w-4 h-4" /> Open Live Camera
                      </Button>
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 cursor-pointer shadow-sm border border-border">
                        <Upload className="w-4 h-4" />
                        <span>{isScanning ? "Processing..." : "Upload Document"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUploadAndScan}
                          disabled={isScanning}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
