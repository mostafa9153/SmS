/**
 * Asset rule failures. The database raises `AST:<code>[:detail]`
 * (supabase/migrations/20261112_assets_module.sql); routes turn them into
 * `{ success: false, error, code }` with these statuses and messages.
 */
export const ASSET_ERRORS = {
  actor_required: [400, "Could not tell who is doing this. Please sign in again."],
  request_id_required: [400, "Missing request id. Reload the page and try again."],
  request_mismatch: [409, "This request was already used for another action. Reload the page."],
  item_not_found: [404, "Item not found."],
  room_not_found: [404, "Room not found."],
  fund_not_found: [404, "Fund not found."],
  unit_not_found: [404, "This item was not found."],
  event_not_found: [404, "Nothing to undo."],
  bad_kind: [400, "Unknown action."],
  bad_qty: [400, "Enter a valid quantity."],
  bad_price: [400, "Enter a valid price."],
  bad_condition: [400, "Unknown condition."],
  bad_target: [400, "Choose a different room or condition."],
  bad_reason: [400, "Choose condemned or lost."],
  bad_lines: [400, "Nothing to save."],
  not_enough_stock: [409, "Not enough items in this room."],
  stale_count: [409, "Someone changed this room's stock while you were counting. Your numbers are kept; check and save again."],
  serial_not_counted: [409, "Items with their own code are added one by one, not counted."],
  state_changed: [409, "This changed after the action (moved, repaired or counted again). Undo the later change first."],
  already_undone: [409, "This was already undone."],
  not_undoable: [409, "This action cannot be undone on its own."],
  append_only: [409, "History cannot be changed or deleted."],
  name_taken: [409, "That name is already used."],
  in_use: [409, "This is in use and cannot be removed."],
} as const satisfies Record<string, readonly [number, string]>;

export type AssetErrorCode = keyof typeof ASSET_ERRORS;

export class AssetError extends Error {
  constructor(
    readonly code: AssetErrorCode,
    readonly detail?: string,
  ) {
    const base: string = ASSET_ERRORS[code][1];
    super(code === "stale_count" && detail ? `${detail}: ${base}` : base);
  }
  get status(): number {
    return ASSET_ERRORS[this.code][0];
  }
}

const isCode = (c: string): c is AssetErrorCode => Object.prototype.hasOwnProperty.call(ASSET_ERRORS, c);

/** An `AST:<code>[:detail]` database message as a known asset error, or null. */
export function assetError(message: string | null | undefined): AssetError | null {
  const m = /AST:([a-z_]+)(?::([^\n]+))?/.exec(message ?? "");
  return m && isCode(m[1]) ? new AssetError(m[1], m[2]?.trim()) : null;
}
