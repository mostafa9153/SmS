import { z } from "zod";

export const CONDITIONS = ["working", "repair", "damaged"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CATEGORIES = ["furniture", "electrical", "it", "lab", "sports", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Tracking = "count" | "serial";

export interface AssetItem {
  id: string;
  name: string;
  category: Category;
  tracking: Tracking;
  ems_role: "bench" | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetFund {
  id: string;
  name: string;
  financial_year: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Counted stock line in a room. */
export interface StockLine {
  item_id: string;
  condition: Condition;
  qty: number;
}

/** A serial unit (own code). */
export interface AssetUnit {
  id: string;
  code: string;
  item_id: string;
  room_id: string;
  condition: Condition;
  status: "active" | "written_off";
  serial_no: string | null;
  unit_price: number | null;
  fund_id: string | null;
  acquired_on: string | null;
}

export interface RoomSummary {
  room_id: string;
  total: number;
  needs_repair: number;
  damaged: number;
}

export interface AssetEvent {
  id: string;
  seq: number;
  at: string;
  occurred_on: string;
  kind: "opening" | "purchase" | "move" | "condition" | "write_off" | "count" | "batch" | "undo";
  parent_id: string | null;
  undo_of: string | null;
  item_id: string | null;
  item_name: string | null;
  from_room_name: string | null;
  from_condition: Condition | null;
  to_room_name: string | null;
  to_condition: Condition | null;
  qty: number | null;
  unit_cost: number | null;
  value: number | null;
  fund_name: string | null;
  reason: "condemned" | "lost" | null;
  note: string | null;
}

// ---------- request bodies ----------

const uuid = z.string().uuid();
const roomId = z.string().trim().min(1).max(100);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();
const note = z.string().trim().max(500).optional().nullable();
const condition = z.enum(CONDITIONS);

export const addSchema = z.object({
  requestId: uuid,
  kind: z.enum(["opening", "purchase"]),
  roomId,
  itemId: uuid,
  qty: z.number().int().min(1).max(10000),
  condition: condition.default("working"),
  unitPrice: z.number().min(0).max(100_000_000).optional().nullable(),
  fundId: uuid.optional().nullable(),
  occurredOn: day,
  serials: z.array(z.string().trim().max(100)).max(200).optional().nullable(),
  note,
});
export type AddInput = z.infer<typeof addSchema>;

export const changeSchema = z
  .object({
    requestId: uuid,
    kind: z.enum(["move", "condition", "write_off"]),
    itemId: uuid,
    roomId,
    condition,
    qty: z.number().int().min(1).max(100000).optional().nullable(),
    unitId: uuid.optional().nullable(),
    toRoomId: roomId.optional().nullable(),
    toCondition: condition.optional().nullable(),
    reason: z.enum(["condemned", "lost"]).optional().nullable(),
    occurredOn: day,
    note,
  })
  .refine((b) => b.qty || b.unitId, { message: "Enter a quantity." });
export type ChangeInput = z.infer<typeof changeSchema>;

export const countSchema = z.object({
  requestId: uuid,
  roomId,
  occurredOn: day,
  lines: z
    .array(
      z.object({
        itemId: uuid,
        condition,
        counted: z.number().int().min(0).max(100000),
        expected: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(500)
    // Two lines for the same item and condition would both pass the stale check and apply twice.
    .refine((ls) => new Set(ls.map((l) => `${l.itemId}:${l.condition}`)).size === ls.length, { message: "Each item and condition can appear only once." }),
});
export type CountInput = z.infer<typeof countSchema>;

// No .default() here: zod applies defaults even under .partial(), so an edit of
// the name alone would silently reset category and tracking. Defaults live in the table.
export const itemSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80),
  category: z.enum(CATEGORIES).optional(),
  tracking: z.enum(["count", "serial"]).optional(),
});
export const fundSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  financial_year: z.string().trim().max(20).optional().nullable(),
});
