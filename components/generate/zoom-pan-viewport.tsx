"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const PADDING = 12;
const BUTTON_STEP = 1.25;
const TAP_MAX_MS = 350;
const TAP_MAX_MOVE = 8;
const DOUBLE_TAP_RADIUS = 28;

interface View {
  scale: number;
  x: number;
  y: number;
}

interface Sizes {
  cw: number;
  ch: number;
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function clampView(v: View, s: Sizes): View {
  const sw = s.w * v.scale;
  const sh = s.h * v.scale;
  const x = sw + PADDING * 2 <= s.cw ? (s.cw - sw) / 2 : clamp(v.x, s.cw - sw - PADDING, PADDING);
  const y = sh + PADDING * 2 <= s.ch ? (s.ch - sh) / 2 : clamp(v.y, s.ch - sh - PADDING, PADDING);
  return { scale: v.scale, x, y };
}

interface ZoomPanViewportProps {
  children: React.ReactNode;
  fitMode?: "contain" | "width";
  minScale?: number;
  maxScale?: number;
  resetKey?: string | number;
  className?: string;
}

export function ZoomPanViewport({
  children,
  fitMode = "contain",
  minScale = 0.1,
  maxScale = 5,
  resetKey,
  className,
}: ZoomPanViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  const viewRef = useRef(view);
  const sizeRef = useRef<Sizes>({ cw: 0, ch: 0, w: 0, h: 0 });
  const fittedRef = useRef(true);
  const fitScaleRef = useRef(1);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number; ax: number; ay: number } | null>(null);
  const tap = useRef({ downAt: 0, downX: 0, downY: 0, moved: false, wasPinch: false });
  const lastTap = useRef({ at: 0, x: 0, y: 0 });

  const commit = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const fit = useCallback(() => {
    const s = sizeRef.current;
    let scale = 1;
    if (s.w && s.h && s.cw && s.ch) {
      const sx = (s.cw - PADDING * 2) / s.w;
      const sy = (s.ch - PADDING * 2) / s.h;
      scale = clamp(fitMode === "width" ? sx : Math.min(sx, sy), minScale, maxScale);
    }
    fitScaleRef.current = scale;
    fittedRef.current = true;
    commit(clampView({ scale, x: PADDING, y: PADDING }, s));
  }, [fitMode, minScale, maxScale, commit]);

  const zoomAt = useCallback(
    (cx: number, cy: number, nextScale: number) => {
      const v = viewRef.current;
      const scale = clamp(nextScale, minScale, maxScale);
      const k = scale / v.scale;
      fittedRef.current = false;
      commit(
        clampView({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }, sizeRef.current)
      );
    },
    [minScale, maxScale, commit]
  );

  const zoomFromCenter = useCallback(
    (factor: number) => {
      const s = sizeRef.current;
      zoomAt(s.cw / 2, s.ch / 2, viewRef.current.scale * factor);
    },
    [zoomAt]
  );

  // Measure container + content, refit while the user has not zoomed manually.
  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      sizeRef.current = {
        cw: container.clientWidth,
        ch: container.clientHeight,
        w: content.offsetWidth,
        h: content.offsetHeight,
      };
      if (fittedRef.current) {
        fit();
      } else {
        commit(clampView(viewRef.current, sizeRef.current));
      }
      setReady(true);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [fit, commit]);

  useEffect(() => {
    fit();
  }, [resetKey, fit]);

  // Wheel: ctrl/cmd (and trackpad pinch) zooms at the cursor, plain wheel pans when content overflows.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = clamp(e.deltaY, -50, 50);
        zoomAt(
          e.clientX - rect.left,
          e.clientY - rect.top,
          viewRef.current.scale * Math.exp(-delta * 0.0075)
        );
        return;
      }

      const v = viewRef.current;
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      const next = clampView({ scale: v.scale, x: v.x - dx, y: v.y - dy }, sizeRef.current);
      if (next.x !== v.x || next.y !== v.y) {
        e.preventDefault();
        commit(next);
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoomAt, commit]);

  const doubleTap = useCallback(
    (cx: number, cy: number) => {
      const v = viewRef.current;
      if (v.scale > fitScaleRef.current * 1.15) {
        fit();
      } else {
        zoomAt(cx, cy, Math.max(fitScaleRef.current * 2, 1));
      }
    },
    [fit, zoomAt]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    container.setPointerCapture(e.pointerId);
    container.focus({ preventScroll: true });
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      tap.current = { downAt: e.timeStamp, downX: e.clientX, downY: e.clientY, moved: false, wasPinch: false };
      setDragging(true);
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const rect = container.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      const v = viewRef.current;
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: v.scale,
        ax: (mx - v.x) / v.scale,
        ay: (my - v.y) / v.scale,
      };
      tap.current.wasPinch = true;
      fittedRef.current = false;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const prevX = p.x;
    const prevY = p.y;
    p.x = e.clientX;
    p.y = e.clientY;

    if (pointers.current.size === 1) {
      if (Math.hypot(e.clientX - tap.current.downX, e.clientY - tap.current.downY) > TAP_MAX_MOVE) {
        tap.current.moved = true;
      }
      const v = viewRef.current;
      commit(
        clampView({ scale: v.scale, x: v.x + (e.clientX - prevX), y: v.y + (e.clientY - prevY) }, sizeRef.current)
      );
    } else if (pointers.current.size >= 2 && pinch.current) {
      const container = containerRef.current;
      if (!container) return;
      const [a, b] = Array.from(pointers.current.values());
      const rect = container.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const scale = clamp(pinch.current.scale * (dist / pinch.current.dist), minScale, maxScale);
      commit(
        clampView(
          { scale, x: mx - pinch.current.ax * scale, y: my - pinch.current.ay * scale },
          sizeRef.current
        )
      );
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    containerRef.current?.releasePointerCapture?.(e.pointerId);

    if (pointers.current.size < 2) pinch.current = null;

    if (pointers.current.size === 0) {
      setDragging(false);
      const t = tap.current;
      const isTap = !t.moved && !t.wasPinch && e.type === "pointerup" && e.timeStamp - t.downAt < TAP_MAX_MS;
      if (isTap) {
        const last = lastTap.current;
        const rect = containerRef.current?.getBoundingClientRect();
        if (
          e.timeStamp - last.at < TAP_MAX_MS &&
          Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_RADIUS &&
          rect
        ) {
          lastTap.current = { at: 0, x: 0, y: 0 };
          doubleTap(e.clientX - rect.left, e.clientY - rect.top);
        } else {
          lastTap.current = { at: e.timeStamp, x: e.clientX, y: e.clientY };
        }
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomFromCenter(BUTTON_STEP);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomFromCenter(1 / BUTTON_STEP);
    } else if (e.key === "0") {
      e.preventDefault();
      fit();
    }
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const btn =
    "inline-flex items-center justify-center rounded-full h-10 w-10 sm:h-9 sm:w-9 text-foreground hover:bg-accent active:scale-95 transition-all disabled:opacity-40 cursor-pointer";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={onKeyDown}
      className={cn(
        "relative touch-none select-none overscroll-contain rounded-2xl border bg-muted/30 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
    >
      {/* Inner canvas — overflow-hidden here so the toolbar is never clipped */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "max-content",
            transformOrigin: "0 0",
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            visibility: ready ? "visible" : "hidden",
          }}
        >
          {children}
        </div>
      </div>

      <div
        onPointerDown={stop}
        onPointerMove={stop}
        onPointerUp={stop}
        className="absolute top-3 right-3 flex items-center gap-0.5 rounded-full border bg-background/90 backdrop-blur-md p-1 shadow-lg cursor-default z-10"
      >
        <button
          type="button"
          aria-label="Zoom out"
          className={btn}
          disabled={view.scale <= minScale}
          onClick={() => zoomFromCenter(1 / BUTTON_STEP)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Fit to view"
          onClick={fit}
          className="min-w-12 h-10 sm:h-9 px-1.5 rounded-full text-[11px] font-mono font-bold hover:bg-accent active:scale-95 transition-all cursor-pointer"
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          className={btn}
          disabled={view.scale >= maxScale}
          onClick={() => zoomFromCenter(BUTTON_STEP)}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Fit to view" className={btn} onClick={fit}>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
