/**
 * Supabase never throws on a failed query; it returns `{ error }`. A write whose
 * error is never read reports success while the row was not written.
 */
type WriteResult = { error: { message: string } | null };

/** Await a write and throw when it failed, so the caller's try/catch reports it. */
export async function mustWrite<T extends WriteResult>(query: PromiseLike<T>, what: string): Promise<T> {
  const result = await query;
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result;
}

/** Await a best-effort write (audit or activity log, cleanup): log a failure, never throw. */
export async function softWrite<T extends WriteResult>(query: PromiseLike<T>, what: string): Promise<void> {
  const result = await query;
  if (result.error) console.error(`[write] ${what} failed:`, result.error.message);
}
