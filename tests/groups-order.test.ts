import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/services/data/store";
import { createSeedData } from "@/services/data/seed";
import { setRequestContext } from "@/services/request-context";
import { listGroups } from "@/services/groups";

beforeEach(() => {
  db.data = createSeedData();
  setRequestContext({
    id: "prof-admin",
    email: "admin@myacademy.edu",
    role: "ADMIN",
    full_name: "Academy Admin",
    academy_id: "academy-1",
  } as any);
});

describe("group ordering", () => {
  it("returns the academy groups in ascending name order", async () => {
    const groups = await listGroups("", "academy-1");
    const names = groups.map((group) => group.name);
    const expected = [...names].sort((a, b) => a.localeCompare(b, "ar", { sensitivity: "base" }));
    expect(names).toEqual(expected);
  });

  it("keeps the same ordering after a search filter", async () => {
    const groups = await listGroups("Grade", "academy-1");
    const names = groups.map((group) => group.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "ar", { sensitivity: "base" })));
  });
});
