import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function key() {
  const secret = process.env.QR_SESSION_SECRET || process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("A credential encryption secret is not configured.");
  return createHash("sha256").update(secret).digest();
}

export function encryptPortalPassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPortalPassword(payload: string | null | undefined) {
  if (!payload) return null;
  try {
    const [version, ivValue, tagValue, ciphertextValue] = payload.split(".");
    if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) return null;
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
