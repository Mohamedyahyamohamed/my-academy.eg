/**
 * Product upload contract.
 * Server Actions read the whole File into memory, so the safe advertised
 * per-file limit is 10 MiB. The transport body limit may be slightly higher
 * to accommodate multipart overhead, but must not be presented as a product limit.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = 10;

export const CONTENT_UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.mp4";
export const CONTENT_UPLOAD_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "docx", "mp4"] as const;

export const HOMEWORK_UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
export const HOMEWORK_UPLOAD_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp"] as const;
