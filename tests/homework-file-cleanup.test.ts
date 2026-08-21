import { describe, expect, it, vi } from "vitest";
import { cleanupOrphanHomeworkFiles } from "@/services/homework-file-cleanup";

const ACADEMY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HOMEWORK = "11111111-1111-4111-8111-111111111111";
const STUDENT = "33333333-3333-4333-8333-333333333333";
const FILE = "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";
const PATH = `${ACADEMY}/${HOMEWORK}/${STUDENT}/${FILE}.pdf`;

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult) {
  const q: any = {
    select: () => q,
    eq: () => q,
    lt: () => q,
    in: () => q,
    limit: () => q,
    delete: () => q,
    then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(resolve(result)),
  };
  return q;
}

function makeClient(options?: { links?: Array<{ file_id: string }>; storageError?: Error; deleteError?: Error }) {
  const remove = vi.fn(async () => ({ error: options?.storageError ?? null }));
  const deleteRows = vi.fn(() => query({ data: null, error: options?.deleteError ?? null }));
  const client: any = {
    from(table: string) {
      if (table === "files") {
        const fileQuery = query({ data: [{ id: FILE, url: PATH }], error: null });
        fileQuery.delete = deleteRows;
        return fileQuery;
      }
      if (table === "homework_submissions") {
        return query({ data: options?.links ?? [], error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    },
    storage: { from: () => ({ remove }) },
  };
  return { client, remove, deleteRows };
}

describe("homework orphan cleanup", () => {
  it("removes an old unlinked object before deleting its registry row", async () => {
    const { client, remove, deleteRows } = makeClient();
    const result = await cleanupOrphanHomeworkFiles(client, ACADEMY, 0);

    expect(result).toEqual({ scanned: 1, removed: 1, skippedLinked: 0, failed: 0 });
    expect(remove).toHaveBeenCalledWith([PATH]);
    expect(deleteRows).toHaveBeenCalled();
  });

  it("does not remove a file linked to a homework submission", async () => {
    const { client, remove, deleteRows } = makeClient({ links: [{ file_id: FILE }] });
    const result = await cleanupOrphanHomeworkFiles(client, ACADEMY, 0);

    expect(result).toEqual({ scanned: 1, removed: 0, skippedLinked: 1, failed: 0 });
    expect(remove).not.toHaveBeenCalled();
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("keeps the registry row when Storage deletion fails", async () => {
    const { client, remove, deleteRows } = makeClient({ storageError: new Error("storage unavailable") });
    const result = await cleanupOrphanHomeworkFiles(client, ACADEMY, 0);

    expect(result).toEqual({ scanned: 1, removed: 0, skippedLinked: 0, failed: 1 });
    expect(remove).toHaveBeenCalledWith([PATH]);
    expect(deleteRows).not.toHaveBeenCalled();
  });
});
