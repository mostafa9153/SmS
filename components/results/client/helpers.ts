


export function sanitizeScoreInput(val: string, maxMarks: number): string {
  if (val === "" || val === undefined || val === null) return "";
  const num = parseFloat(val);
  if (isNaN(num)) return "";
  if (num < 0) return "0";
  if (maxMarks > 0 && num > maxMarks) return String(maxMarks);
  return val;
}
