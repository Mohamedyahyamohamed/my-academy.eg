export type ValidatedUpload = { contentType: string; extension: string };
export type UploadValidationBucket = "content" | "homework";

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

/**
 * Validate both the declared metadata and the file's leading bytes.
 * This is intentionally pure so the same rules can be regression-tested
 * without invoking a server action or contacting Storage.
 */
export function detectUpload(
  bytes: Uint8Array,
  fileName: string,
  declaredType: string,
  bucket: UploadValidationBucket,
): ValidatedUpload | null {
  const lowerName = fileName.toLowerCase();
  const isPdf = startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
  const isPng = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpeg = startsWith(bytes, [0xff, 0xd8, 0xff]);
  const isWebp = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isPdf && lowerName.endsWith(".pdf") && declaredType === "application/pdf") {
    return { contentType: "application/pdf", extension: "pdf" };
  }
  if (isPng && lowerName.endsWith(".png") && declaredType === "image/png") {
    return { contentType: "image/png", extension: "png" };
  }
  if (isJpeg && /\.(jpe?g)$/.test(lowerName) && ["image/jpeg", "image/jpg"].includes(declaredType)) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (isWebp && lowerName.endsWith(".webp") && declaredType === "image/webp") {
    return { contentType: "image/webp", extension: "webp" };
  }

  if (bucket === "content") {
    const isZip = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
    const isMp4 = bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
    if (isZip && lowerName.endsWith(".docx") && declaredType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return { contentType: declaredType, extension: "docx" };
    }
    if (isMp4 && lowerName.endsWith(".mp4") && ["video/mp4", "application/mp4"].includes(declaredType)) {
      return { contentType: "video/mp4", extension: "mp4" };
    }
  }

  return null;
}
