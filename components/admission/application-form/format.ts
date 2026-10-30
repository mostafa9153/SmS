


export function formatAadhaarNumber(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}
