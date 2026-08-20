/**
 * Product upload contract.
 *
 * Lesson content supports files up to 500 MiB. Homework attachments remain
 * intentionally limited to 10 MiB because they are student submissions and
 * should not be used as a video/content delivery channel. Large content files
 * use the signed-upload path so they do not pass through a Vercel Server
 * Action request body. Server-side metadata validation remains mandatory
 * before a private storage object is committed to the database.
 */
export const MAX_CONTENT_UPLOAD_BYTES = 500 * 1024 * 1024;
export const MAX_CONTENT_UPLOAD_MB = 500;
export const MAX_HOMEWORK_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_HOMEWORK_UPLOAD_MB = 10;

/** @deprecated Use the bucket-specific content/homework constants above. */
export const MAX_UPLOAD_BYTES = MAX_CONTENT_UPLOAD_BYTES;
/** @deprecated Use the bucket-specific content/homework constants above. */
export const MAX_UPLOAD_MB = MAX_CONTENT_UPLOAD_MB;

export const CONTENT_UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.mp4";
export const CONTENT_UPLOAD_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "docx", "mp4"] as const;

export const HOMEWORK_UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
export const HOMEWORK_UPLOAD_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp"] as const;

export type UploadBucket = "content" | "homework";

export function hasAllowedExtension(fileName: string, bucket: UploadBucket): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return false;
  return (bucket === "content" ? CONTENT_UPLOAD_EXTENSIONS : HOMEWORK_UPLOAD_EXTENSIONS).includes(extension as never);
}
