import type { SupabaseClient } from "@supabase/supabase-js";

type StorageEntry = {
  id?: string | null;
  name?: string | null;
  metadata?: { size?: number | string | null } | null;
};

type StorageUsageResult =
  | { ok: true; bytes: number; files: number }
  | { ok: false; error: string };

const PAGE_SIZE = 100;
const MAX_ENTRIES = 20_000;

/**
 * Recursively measures objects below an academy prefix in a private bucket.
 * Storage metadata is the source of truth; failure is deliberately fail-closed.
 */
export async function measureStorageUsage(
  client: SupabaseClient,
  bucket: string,
  academyId: string,
): Promise<StorageUsageResult> {
  let bytes = 0;
  let files = 0;
  let visitedEntries = 0;
  const directories = [academyId];

  while (directories.length) {
    const prefix = directories.pop()!;
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) return { ok: false, error: "Storage usage could not be verified." };

      const entries = (data ?? []) as StorageEntry[];
      visitedEntries += entries.length;
      if (visitedEntries > MAX_ENTRIES) {
        return { ok: false, error: "Storage usage is too large to verify safely." };
      }

      for (const entry of entries) {
        const name = typeof entry.name === "string" ? entry.name : "";
        if (!name) continue;

        // Supabase represents folders with a null id. Files expose metadata.
        if (entry.id === null || entry.id === undefined) {
          directories.push(`${prefix}/${name}`);
          continue;
        }

        const rawSize = entry.metadata?.size;
        const size = typeof rawSize === "number" ? rawSize : Number(rawSize);
        if (!Number.isFinite(size) || size < 0) {
          return { ok: false, error: "Storage metadata could not be verified." };
        }
        bytes += size;
        files += 1;
      }

      if (entries.length < PAGE_SIZE) break;
    }
  }

  return { ok: true, bytes, files };
}

/** Measure all tenant-owned educational storage buckets as one quota. */
export async function measureTenantStorageUsage(
  client: SupabaseClient,
  academyId: string,
  buckets = ["homework", "content"],
): Promise<StorageUsageResult> {
  let bytes = 0;
  let files = 0;
  for (const bucket of buckets) {
    const usage = await measureStorageUsage(client, bucket, academyId);
    if (!usage.ok) return usage;
    bytes += usage.bytes;
    files += usage.files;
  }
  return { ok: true, bytes, files };
}
