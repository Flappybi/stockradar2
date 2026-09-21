import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { getDatabase } from "@/lib/db/client";
import { responseCache } from "@/lib/db/schema";

const memory = new Map<string, { value: unknown; expires: number }>();
const MAX_ENTRIES = 600;
function remember(key: string, value: unknown, expires: number) {
  memory.delete(key);
  memory.set(key, { value, expires });
  while (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value!);
}
export async function getCache<T>(
  key: string,
  options: { authoritative?: boolean } = {},
): Promise<T | null> {
  const existing = memory.get(key);
  if (!options.authoritative && existing && existing.expires > Date.now())
    return structuredClone(existing.value) as T;
  memory.delete(key);
  try {
    const db = getDatabase();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(responseCache)
      .where(
        and(
          eq(responseCache.key, key),
          gt(responseCache.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return null;
    remember(key, row.value, row.expiresAt.getTime());
    return structuredClone(row.value) as T;
  } catch {
    console.warn(
      "Persistent cache read unavailable; using bounded process cache.",
    );
    return null;
  }
}
export async function setCache(
  key: string,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0)
    throw new Error("Cache TTL must be positive.");
  const expiresAt = new Date(Date.now() + ttlMs);
  remember(key, structuredClone(value), expiresAt.getTime());
  try {
    const db = getDatabase();
    if (!db) return;
    await db
      .insert(responseCache)
      .values({ key, value, expiresAt })
      .onConflictDoUpdate({
        target: responseCache.key,
        set: { value, expiresAt },
      });
  } catch {
    console.warn(
      "Persistent cache write unavailable; using bounded process cache.",
    );
  }
}
