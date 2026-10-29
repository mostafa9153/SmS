"use client";




export function renderBilingualText(text: string) {
  if (!text) return null;
  const match = text.match(/^(.*?)\s*(\([^)]+\))(.*)$/);
  if (match) {
    const [, main, paren, suffix] = match;
    return (
      <span className="inline-flex items-baseline gap-1 flex-wrap">
        <span>{main}</span>
        <span className="text-[12px] sm:text-[12.5px] font-semibold text-foreground/80">{paren}</span>
        {suffix && <span className="text-destructive font-bold">{suffix}</span>}
      </span>
    );
  }
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  if (hasBengali) {
    return <span className="text-[13px] sm:text-[13.5px] font-semibold">{text}</span>;
  }
  return <span>{text}</span>;
}

