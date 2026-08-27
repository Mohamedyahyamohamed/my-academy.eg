/**
 * Periodic backup tool for MY Academy.
 *
 * Backs up:
 *   1. The Postgres database (via `pg_dump` against DATABASE_URL /
 *      SUPABASE_DB_URL) into ./backups/db/<timestamp>.sql.gz
 *   2. Supabase Storage buckets (content, homework) — lists every object and
 *      downloads it into ./backups/storage/<bucket>/<path>
 *
 * Designed to run from a daily cron (Vercel Cron → /api/cron/backup, or a
 * host cron calling `tsx scripts/backup.ts`). Requires the Supabase service
 * role / DB connection string to be present in the environment.
 *
 * Nothing here deletes data — it only creates dated snapshots.
 */
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "../services/supabase/config";

const BACKUP_ROOT = path.resolve(process.cwd(), "backups");
const DB_BUCKETS = ["content", "homework"];

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { env, maxBuffer: 1024 * 1024 * 500 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(Buffer.from(stdout));
    });
  });
}

async function backupDatabase(): Promise<string | null> {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.warn("[backup] DATABASE_URL / SUPABASE_DB_URL not set — skipping DB dump.");
    return null;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(BACKUP_ROOT, "db");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${stamp}.sql.gz`);
  // Dump + gzip in one pipeline.
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const dump = spawn("pg_dump", ["--no-owner", "--no-privileges", dbUrl], { env: process.env });
    const gzip = spawn("gzip", [], { env: process.env });
    const out = require("node:fs").createWriteStream(outFile);
    dump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(out);
    dump.on("error", reject);
    gzip.on("error", reject);
    out.on("finish", resolve);
    out.on("error", reject);
  });
  console.log(`[backup] database → ${outFile}`);
  return outFile;
}

async function backupStorage(): Promise<void> {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    console.warn("[backup] Supabase not configured — skipping Storage backup.");
    return;
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  for (const bucket of DB_BUCKETS) {
    const outDir = path.join(BACKUP_ROOT, "storage", bucket);
    await fs.mkdir(outDir, { recursive: true });
    let cursor: string | undefined;
    let page = 0;
    do {
      const { data, error } = await client.storage.from(bucket).list(cursor, { limit: 500, offset: page * 500 });
      if (error) {
        console.warn(`[backup] storage list ${bucket} failed: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;
      for (const item of data) {
        if (item.id === null) {
          // prefix (folder) — recurse
          cursor = item.name;
          continue;
        }
        const { data: blob, error: dlErr } = await client.storage.from(bucket).download(item.name);
        if (dlErr || !blob) {
          console.warn(`[backup] download ${bucket}/${item.name} failed: ${dlErr?.message}`);
          continue;
        }
        const dest = path.join(outDir, item.name);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, Buffer.from(await blob.arrayBuffer()));
      }
      page++;
      cursor = undefined;
    } while (true);
    console.log(`[backup] storage bucket "${bucket}" → ${outDir}`);
  }
}

async function main() {
  console.log("[backup] starting…");
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  const db = await backupDatabase();
  await backupStorage();
  console.log(`[backup] done.${db ? "" : " (DB skipped)"}`);
}

main().catch((e) => {
  console.error("[backup] failed:", e);
  process.exit(1);
});
