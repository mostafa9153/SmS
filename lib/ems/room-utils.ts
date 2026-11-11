import type { EmsRoom } from "./types";

// Clean column label helper to strip (Window Side), (Middle Side), etc.
export function cleanColumnLabel(label?: string, columnIndex?: number): string {
  if (!label) return columnIndex ? `Column ${columnIndex}` : "Column";
  const cleaned = label.replace(/\s*\([^)]*(?:Side|Window|Middle|Door|Aisle|Wall|Left|Right)[^)]*\)/gi, "").trim();
  return cleaned || (columnIndex ? `Column ${columnIndex}` : label);
}

// Total seats from columns
export function calculateRoomCapacity(columns: EmsRoom["columns"]): number {
  if (!Array.isArray(columns)) return 0;
  return columns.reduce((total, col) => total + (col.benchCount || 0) * (col.seatsPerBench || 3), 0);
}
