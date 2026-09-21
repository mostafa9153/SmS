"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move, Maximize2, Minimize2, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinchZoomViewerProps {
  children: React.ReactNode;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  className?: string;
  canvasClassName?: string;
  showControls?: boolean;
  onScaleChange?: (scale: number) => void;
  scale?: number; // Optional external controlled scale
  title?: string;
}

export function PinchZoomViewer({
  children,
  initialScale = 1.0,
  minScale = 0.5,
  maxScale = 3.5,
  scaleStep = 0.2,
  className,
  canvasClassName,
  showControls = true,
  onScaleChange,
  scale: controlledScale,
  title = "Document Preview",
}: PinchZoomViewerProps) {
  const [internalScale, setInternalScale] = useState(initialScale);
  const currentScale = controlledScale ?? internalScale;
  const currentScaleRef = useRef(currentScale);

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef(pan);

  const [isInteracting, setIsInteracting] = useState(false);
  const isInteractingRef = useRef(isInteracting);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    currentScaleRef.current = currentScale;
    panRef.current = pan;
    isInteractingRef.current = isInteracting;
  }, [currentScale, pan, isInteracting]);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const touchState = useRef<{
    initialDistance: number;
    startScale: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    lastTap: number;
    isPinching: boolean;
    isPanning: boolean;
  }>({
    initialDistance: 0,
    startScale: 1.0,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    lastTap: 0,
    isPinching: false,
    isPanning: false,
  });

  const updateScale = useCallback(
    (newScale: number | ((prev: number) => number)) => {
      const next = typeof newScale === "function" ? newScale(currentScaleRef.current) : newScale;
      const clamped = Math.max(minScale, Math.min(maxScale, Number(next.toFixed(2))));
      if (clamped <= 1.02) {
        setPan({ x: 0, y: 0 });
      }
      if (controlledScale === undefined) {
        setInternalScale(clamped);
      }
      onScaleChange?.(clamped);
    },
    [minScale, maxScale, controlledScale, onScaleChange]
  );

  const handleZoomIn = useCallback(() => {
    updateScale((s) => s + scaleStep);
  }, [updateScale, scaleStep]);

  const handleZoomOut = useCallback(() => {
    updateScale((s) => s - scaleStep);
  }, [updateScale, scaleStep]);

  const handleReset = useCallback(() => {
    setPan({ x: 0, y: 0 });
    updateScale(initialScale);
  }, [updateScale, initialScale]);

  // Desktop Mouse Drag / Panning Handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only trigger on primary left click
      if (e.button !== 0) return;
      const el = containerRef.current;
      if (!el) return;

      // Allow dragging when zoomed in or in fullscreen
      if (!isFullscreen && currentScaleRef.current <= 1.05) return;

      e.preventDefault();
      setIsInteracting(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPanX = panRef.current.x;
      const startPanY = panRef.current.y;

      const handleMouseMove = (moveEv: MouseEvent) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;

        const contentEl = contentRef.current;
        const contentW = contentEl ? contentEl.offsetWidth * currentScaleRef.current : el.clientWidth;
        const contentH = contentEl ? contentEl.offsetHeight * currentScaleRef.current : el.clientHeight;

        const maxPanX = Math.max(150, (contentW - el.clientWidth) / 2 + 180);
        const maxPanY = Math.max(150, (contentH - el.clientHeight) / 2 + 250);

        const nextX = Math.max(-maxPanX, Math.min(maxPanX, startPanX + dx));
        const nextY = Math.max(-maxPanY, Math.min(maxPanY, startPanY + dy));
        setPan({ x: nextX, y: nextY });
      };

      const handleMouseUp = () => {
        setIsInteracting(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [isFullscreen]
  );

  // Native non-passive touch listeners & wheel listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Multi-touch 2 fingers: pinch start
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchState.current.initialDistance = dist;
        touchState.current.startScale = currentScaleRef.current;
        touchState.current.isPinching = true;
        touchState.current.isPanning = false;
        setIsInteracting(true);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        const t = e.touches[0];

        // Double-tap to zoom toggle (1.0x <-> 2.0x)
        if (now - touchState.current.lastTap < 300) {
          if (e.cancelable) e.preventDefault();
          if (currentScaleRef.current > 1.1) {
            handleReset();
          } else {
            updateScale(2.0);
          }
          touchState.current.lastTap = 0;
          return;
        }
        touchState.current.lastTap = now;

        touchState.current.startX = t.clientX;
        touchState.current.startY = t.clientY;
        touchState.current.startPanX = panRef.current.x;
        touchState.current.startPanY = panRef.current.y;
        touchState.current.isPinching = false;

        if (isFullscreen || currentScaleRef.current > 1.25) {
          touchState.current.isPanning = true;
          setIsInteracting(true);
        } else {
          touchState.current.isPanning = false;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.current.isPinching && touchState.current.initialDistance > 0) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = dist / touchState.current.initialDistance;
        const targetScale = touchState.current.startScale * ratio;
        updateScale(targetScale);
      } else if (e.touches.length === 1 && (isFullscreen || currentScaleRef.current > 1.25) && touchState.current.isPanning) {
        const t = e.touches[0];
        const dx = t.clientX - touchState.current.startX;
        const dy = t.clientY - touchState.current.startY;

        if (!isFullscreen && Math.abs(dy) > Math.abs(dx) * 1.5) {
          return;
        }

        if (e.cancelable) e.preventDefault();
        const contentEl = contentRef.current;
        const contentW = contentEl ? contentEl.offsetWidth * currentScaleRef.current : el.clientWidth;
        const contentH = contentEl ? contentEl.offsetHeight * currentScaleRef.current : el.clientHeight;

        const maxPanX = Math.max(150, (contentW - el.clientWidth) / 2 + 180);
        const maxPanY = Math.max(150, (contentH - el.clientHeight) / 2 + 250);

        const nextX = Math.max(-maxPanX, Math.min(maxPanX, touchState.current.startPanX + dx));
        const nextY = Math.max(-maxPanY, Math.min(maxPanY, touchState.current.startPanY + dy));
        setPan({ x: nextX, y: nextY });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchState.current.initialDistance = 0;
        touchState.current.isPinching = false;
      }
      if (e.touches.length === 0) {
        touchState.current.isPanning = false;
        setIsInteracting(false);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || isFullscreen) {
        if (e.cancelable) e.preventDefault();
        const delta = -e.deltaY * 0.005;
        updateScale((s) => s + delta);
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("wheel", handleWheel);
    };
  }, [updateScale, handleReset, isFullscreen]);

  // Keyboard shortcut listener for escape and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, handleReset]);

  // Viewport Content Element
  const renderCanvas = () => (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        touchAction: isFullscreen ? "none" : currentScale > 1.25 ? "none" : "pan-y",
      }}
      className={cn(
        "w-full rounded-2xl border border-border/70 dark:border-white/10 bg-slate-100/80 dark:bg-slate-950/60 p-2 sm:p-6 flex justify-center items-start shadow-xs relative cursor-grab active:cursor-grabbing",
        currentScale > 1.05 ? "overflow-hidden" : "overflow-visible",
        "print:p-0 print:border-none print:bg-transparent print:w-full print:block print:overflow-visible",
        isFullscreen ? "h-full border-none bg-transparent shadow-none" : canvasClassName
      )}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${currentScale})`,
          transformOrigin: isFullscreen ? "center center" : "top center",
          transition: isInteracting ? "none" : "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "shrink-0 m-auto print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block will-change-transform",
          isFullscreen && "shadow-2xl"
        )}
      >
        {children}
      </div>
    </div>
  );

  // Fullscreen Modal Mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col justify-between p-3 select-none touch-none animate-in fade-in duration-200">
        {/* Top Bar with Title and Close */}
        <div className="flex items-center justify-between px-3 py-2 z-20">
          <div className="flex items-center gap-2 text-white">
            <Eye className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold truncate">{title}</span>
            <span className="text-[10px] text-zinc-400 bg-white/10 px-2 py-0.5 rounded-full font-mono">
              {Math.round(currentScale * 100)}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsFullscreen(false);
              handleReset();
            }}
            aria-label="Close Full Screen"
            className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Center Viewport */}
        <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
          {renderCanvas()}
        </div>

        {/* Bottom Floating Control Pill (Thumb-Friendly on Phones) */}
        <div className="flex justify-center pb-safe pt-2 z-20">
          <div className="glass-pill bg-slate-900/90 text-white rounded-full px-4 py-2 flex items-center gap-3 border border-white/20 shadow-2xl">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={currentScale <= minScale}
              aria-label="Zoom Out"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="font-mono text-xs font-bold px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 cursor-pointer"
            >
              {Math.round(currentScale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={currentScale >= maxScale}
              aria-label="Zoom In"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-white/20" />

            <button
              type="button"
              onClick={() => {
                setIsFullscreen(false);
                handleReset();
              }}
              className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 px-2 py-1 active:scale-95 cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inline Mode
  return (
    <div className={cn("relative flex flex-col w-full group select-none", className)}>
      {/* Floating Toolbar Controls */}
      {showControls && (
        <div className="flex items-center justify-between pb-2 px-1 flex-wrap gap-2 print:hidden z-10">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="hidden sm:inline-flex items-center gap-1">
              <Move className="h-3 w-3 text-primary" />
              Pinch with 2 fingers or drag to move:
            </span>
            <span className="sm:hidden text-[11px] flex items-center gap-1 font-semibold text-foreground">
              <Move className="h-3 w-3 text-amber-600 dark:text-[#FACC15]" />
              Pinch &amp; Drag to inspect
            </span>
          </div>

          <div className="flex items-center gap-1 bg-card/95 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-1 rounded-2xl border border-border/80 dark:border-white/10 shadow-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={currentScale <= minScale}
              title="Zoom Out (-)"
              className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              title="Reset Zoom (Click for 100%)"
              className="px-2 py-0.5 min-w-[48px] text-center font-mono text-[11px] font-bold text-foreground hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-muted/60"
            >
              {Math.round(currentScale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={currentScale >= maxScale}
              title="Zoom In (+)"
              className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            {currentScale !== initialScale && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset View"
                className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer border-l border-border/60 dark:border-white/10"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}

            {/* Fullscreen Photo Lightbox Mode Button */}
            <button
              type="button"
              onClick={() => {
                setIsFullscreen(true);
                if (currentScale < 1.0) updateScale(1.1);
              }}
              title="Full-Screen Photo Viewer Mode (ছবি দেখার মতো বড় করে দেখুন)"
              className="h-7 px-2 rounded-xl flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-[#FACC15] bg-amber-500/15 dark:bg-[#FACC15]/15 hover:bg-amber-500/25 transition-all active:scale-95 cursor-pointer ml-1 border border-amber-500/30"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden xs:inline">Full Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Canvas Viewport */}
      {renderCanvas()}
    </div>
  );
}
