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
const STORAGE_LIST_TIMEOUT_MS = 15_000;

async function listStorageEntries(client: SupabaseClient, bucket: string, prefix: string, offset: number) {
  try {
    return await Promise.race([
      client.storage.from(bucket).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Storage list timed out for ${bucket}.`)), STORAGE_LIST_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return { data: null, error: new Error("Storage usage request timed out.") };
  }
}

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
      const { data, error } = await listStorageEntries(client, bucket, prefix, offset);
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

/**
 * Measure all tenant-owned educational storage.
 *
 * Upload intent requests use the database registry first: it is indexed by
 * academy_id and avoids recursively listing every Storage folder before each
 * upload. The recursive Storage scan remains the fail-closed fallback for a
 * deployment whose registry tables are unavailable.
 */
export async function measureTenantStorageUsage(
  client: SupabaseClient,
  academyId: string,
  buckets = ["homework", "content"],
): Promise<StorageUsageResult> {
  if (buckets.length === 2 && buckets[0] === "homework" && buckets[1] === "content") {
    const [homeworkFiles, contentFiles] = await Promise.all([
      client.from("files").select("size").eq("academy_id", academyId).limit(MAX_ENTRIES),
      client.from("content_files").select("size").eq("academy_id", academyId).limit(MAX_ENTRIES),
    ]);

    if (!homeworkFiles.error && !contentFiles.error) {
      const rows = [...(homeworkFiles.data ?? []), ...(contentFiles.data ?? [])] as Array<{ size?: number | string | null }>;
      let bytes = 0;
      for (const row of rows) {
        if (row.size === null || row.size === undefined || row.size === "") return { ok: false, error: "Storage metadata could not be verified." };
        const size = typeof row.size === "number" ? row.size : Number(row.size);
        if (!Number.isFinite(size) || size < 0) return { ok: false, error: "Storage metadata could not be verified." };
        bytes += size;
      }
      return { ok: true, bytes, files: rows.length };
    }
  }

  const results = await Promise.all(buckets.map((bucket) => measureStorageUsage(client, bucket, academyId)));
  let bytes = 0;
  let files = 0;
  for (const usage of results) {
    if (!usage.ok) return usage;
    bytes += usage.bytes;
    files += usage.files;
  }
  return { ok: true, bytes, files };
}
