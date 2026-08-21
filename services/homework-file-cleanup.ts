import { isHomeworkStoragePath } from "@/services/homework-files";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

type SupabaseAdminClient = NonNullable<ReturnType<typeof nodeSupabaseClient>>;
type StorageRemove = (path: string) => Promise<{ error?: unknown | null }>;

type FileCandidate = {
  id: string;
  url: string;
};

export type HomeworkFileCleanupResult = {
  scanned: number;
  removed: number;
  skippedLinked: number;
  failed: number;
};

type CleanupOptions = {
  candidateFileId?: string;
  storageRemove?: StorageRemove;
};

/**
 * Remove abandoned private homework objects after a grace period.
 *
 * A file is eligible only when it is old enough, belongs to the requested
 * academy, follows the exact private homework path layout, and has no
 * homework_submission.file_id link. Storage is deleted first; the registry
 * row is deleted only after Storage confirms success, so a transient Storage
 * failure cannot turn a recoverable record into an invisible object.
 *
 * `options` is intentionally optional and is used only by a tightly guarded
 * synthetic failure-injection route and unit tests. Normal production cleanup
 * always uses the real Storage remover.
 */
export async function cleanupOrphanHomeworkFiles(
  client: SupabaseAdminClient,
  academyId: string,
  gracePeriodMs = 24 * 60 * 60 * 1000,
  options: CleanupOptions = {},
): Promise<HomeworkFileCleanupResult> {
  const result: HomeworkFileCleanupResult = {
    scanned: 0,
    removed: 0,
    skippedLinked: 0,
    failed: 0,
  };
  if (!academyId) return result;

  const cutoff = new Date(Date.now() - gracePeriodMs).toISOString();
  const { data: rows, error: fileError } = await client
    .from("files")
    .select("id, url")
    .eq("academy_id", academyId)
    .lt("created_at", cutoff)
    .limit(500);
  if (fileError) throw new Error("Could not inspect homework file registry.");

  const candidates = ((rows ?? []) as Array<{ id: string; url: string | null }>)
    .filter((row): row is FileCandidate =>
      typeof row.id === "string" &&
      typeof row.url === "string" &&
      isHomeworkStoragePath(row.url, academyId) &&
      (!options.candidateFileId || row.id === options.candidateFileId),
    );
  result.scanned = candidates.length;
  if (!candidates.length) return result;

  const { data: links, error: linkError } = await client
    .from("homework_submissions")
    .select("file_id")
    .in("file_id", candidates.map((row) => row.id))
    .limit(5000);
  if (linkError) throw new Error("Could not inspect homework attachment links.");

  const linked = new Set(
    ((links ?? []) as Array<{ file_id: string | null }>)
      .map((row) => row.file_id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const candidate of candidates) {
    if (linked.has(candidate.id)) {
      result.skippedLinked += 1;
      continue;
    }

    let storageError: unknown = null;
    try {
      const remove = options.storageRemove ?? (async (path: string) =>
        client.storage.from("homework").remove([path]));
      const response = await remove(candidate.url);
      storageError = response?.error ?? null;
    } catch (error) {
      storageError = error;
    }
    if (storageError) {
      result.failed += 1;
      continue;
    }

    const { error: registryError } = await client
      .from("files")
      .delete()
      .eq("academy_id", academyId)
      .eq("id", candidate.id)
      .eq("url", candidate.url);
    if (registryError) {
      result.failed += 1;
      continue;
    }
    result.removed += 1;
  }

  return result;
}

export async function cleanupOrphanHomeworkFilesForAllAcademies(
  client: SupabaseAdminClient,
): Promise<HomeworkFileCleanupResult> {
  const result: HomeworkFileCleanupResult = {
    scanned: 0,
    removed: 0,
    skippedLinked: 0,
    failed: 0,
  };
  const { data: academies, error } = await client
    .from("academies")
    .select("id")
    .limit(1000);
  if (error) throw new Error("Could not inspect academies for cleanup.");

  for (const academy of (academies ?? []) as Array<{ id: string }>) {
    const current = await cleanupOrphanHomeworkFiles(client, academy.id);
    result.scanned += current.scanned;
    result.removed += current.removed;
    result.skippedLinked += current.skippedLinked;
    result.failed += current.failed;
  }
  return result;
}
