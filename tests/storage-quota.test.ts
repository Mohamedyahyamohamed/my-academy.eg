import { describe, expect, it } from "vitest";
import { measureTenantStorageUsage } from "@/lib/storage-quota";

function mockClient(rowsByTable: Record<string, Array<{ size: number | string | null }>>, errors: Record<string, Error | null> = {}) {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(table);
      return {
        select() { return this; },
        eq() { return this; },
        limit() { return Promise.resolve({ data: rowsByTable[table] ?? [], error: errors[table] ?? null }); },
      };
    },
  };
  return { client: client as any, calls };
}

describe("tenant storage quota", () => {
  it("uses the indexed file registries for the default educational quota", async () => {
    const { client, calls } = mockClient({
      files: [{ size: 120 }, { size: "80" }],
      content_files: [{ size: 300 }],
    });

    await expect(measureTenantStorageUsage(client, "academy-1")).resolves.toEqual({ ok: true, bytes: 500, files: 3 });
    expect(calls.sort()).toEqual(["content_files", "files"]);
  });

  it("fails closed when a registry row has invalid metadata", async () => {
    const { client } = mockClient({ files: [{ size: null }], content_files: [] });
    await expect(measureTenantStorageUsage(client, "academy-1")).resolves.toEqual({ ok: false, error: "Storage metadata could not be verified." });
  });
});
