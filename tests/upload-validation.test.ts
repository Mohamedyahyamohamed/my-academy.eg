import { describe, expect, it } from "vitest";
import { detectUpload } from "@/lib/upload-validation";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("private upload validation", () => {
  it("accepts a PDF with matching extension, MIME, and signature", () => {
    expect(detectUpload(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "lesson.pdf", "application/pdf", "content"))
      .toEqual({ contentType: "application/pdf", extension: "pdf" });
  });

  it("accepts PNG and JPEG images", () => {
    expect(detectUpload(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "diagram.png", "image/png", "content"))
      .toEqual({ contentType: "image/png", extension: "png" });
    expect(detectUpload(bytes(0xff, 0xd8, 0xff, 0xe0), "photo.jpg", "image/jpeg", "content"))
      .toEqual({ contentType: "image/jpeg", extension: "jpg" });
  });

  it("rejects a spoofed PDF whose signature is not a PDF", () => {
    expect(detectUpload(bytes(0x89, 0x50, 0x4e, 0x47), "lesson.pdf", "application/pdf", "content")).toBeNull();
  });

  it("rejects an allowed extension with the wrong MIME type", () => {
    expect(detectUpload(bytes(0x25, 0x50, 0x44, 0x46), "lesson.pdf", "text/plain", "content")).toBeNull();
  });

  it("rejects content-only formats in homework uploads", () => {
    expect(detectUpload(bytes(0x50, 0x4b, 0x03, 0x04), "worksheet.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "homework")).toBeNull();
  });

  it("rejects an unsupported binary format even when the extension is allowed", () => {
    expect(detectUpload(bytes(0x00, 0x01, 0x02, 0x03), "submission.png", "image/png", "homework")).toBeNull();
  });
});
