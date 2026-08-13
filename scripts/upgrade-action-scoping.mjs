import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const actionsDir = "/home/ubuntu/my-academy-eg/app/actions";
const entries = await readdir(actionsDir);

for (const entry of entries.filter((name) => name.endsWith(".ts"))) {
  const filePath = join(actionsDir, entry);
  const source = await readFile(filePath, "utf8");
  if (!source.includes("requireRole(")) continue;

  let updated = source.replaceAll("requireRole", "requireScopedRole");
  updated = updated.replaceAll("= requireScopedRole(", "= await requireScopedRole(");
  updated = updated.replaceAll("  requireScopedRole(", "  await requireScopedRole(");

  if (updated !== source) await writeFile(filePath, updated);
}
