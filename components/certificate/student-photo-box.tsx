"use client";

import React from "react";

export function StudentPhotoBox({ url, className = "" }: { url?: string; className?: string }) {
  return (
    <div className={`shrink-0 w-[22mm] h-[29mm] border border-slate-700 bg-white flex items-center justify-center overflow-hidden ${className}`}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Student" className="w-full h-full object-cover" />
      )}
    </div>
  );
}
