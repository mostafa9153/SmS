


export function getSubjectShort(name: string): string {
  if (!name) return "?";
  const cleaned = name.trim();
  const upper = cleaned.toUpperCase();
  if (upper.includes("BENGALI") || upper.includes("BANGLA")) return "BEN";
  if (upper.includes("ENGLISH")) return "ENG";
  if (upper.includes("MATH")) return "MATH";
  if (upper.includes("PHYSICAL SCIENCE") || upper.includes("PHYSICS")) return "PSC";
  if (upper.includes("LIFE SCIENCE") || upper.includes("BIOLOGY")) return "LSC";
  if (upper.includes("CHEMISTRY")) return "CHEM";
  if (upper.includes("HISTORY")) return "HIST";
  if (upper.includes("GEOGRAPHY")) return "GEO";
  if (upper.includes("PHILOSOPHY")) return "PHIL";
  if (upper.includes("ENVIRONMENT")) return "EVS";
  if (upper.includes("SANSKRIT")) return "SNS";
  if (upper.includes("COMPUTER")) return "COMP";
  if (upper.includes("HEALTH") || upper.includes("PHYSICAL EDUCATION")) return "P.ED";
  if (upper.includes("WORK EDUCATION")) return "W.ED";
  if (upper.includes("ARABIC")) return "ARB";
  if (cleaned.length <= 4) return cleaned.toUpperCase();
  const words = cleaned.split(/\s+/);
  if (words.length > 1) {
    return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return cleaned.slice(0, 4).toUpperCase();
}

export function getClassShort(className: string, section?: string): string {
  const shortCls = className.replace(/Class\s*/i, "").trim();
  if (!section || section === "ALL") return shortCls;
  return `${shortCls}-${section}`;
}
