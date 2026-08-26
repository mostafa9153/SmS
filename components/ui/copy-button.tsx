"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconClassName?: string;
}

export function CopyButton({
  text,
  label,
  className,
  iconClassName = "h-3 w-3",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / iframe restrictions
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : label ? `Copy ${label}` : "Copy to clipboard"}
      className={cn(
        "inline-flex items-center justify-center rounded p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-hidden",
        copied && "text-emerald-600 dark:text-emerald-400 hover:text-emerald-600",
        className
      )}
    >
      {copied ? (
        <Check className={cn(iconClassName, "text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50 duration-150")} />
      ) : (
        <Copy className={iconClassName} />
      )}
    </button>
  );
}
