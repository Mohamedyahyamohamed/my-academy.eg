import { describe, expect, it } from "vitest";
import {
  MAX_CONTENT_UPLOAD_BYTES,
  MAX_HOMEWORK_UPLOAD_BYTES,
  isWithinUploadLimit,
} from "@/lib/upload-policy";

describe("upload size boundaries", () => {
  it("accepts homework at exactly 10 MiB and rejects one byte over", () => {
    expect(isWithinUploadLimit(MAX_HOMEWORK_UPLOAD_BYTES, "homework")).toBe(true);
    expect(isWithinUploadLimit(MAX_HOMEWORK_UPLOAD_BYTES + 1, "homework")).toBe(false);
  });

  it("accepts lesson content at exactly 500 MiB and rejects one byte over", () => {
    expect(isWithinUploadLimit(MAX_CONTENT_UPLOAD_BYTES, "content")).toBe(true);
    expect(isWithinUploadLimit(MAX_CONTENT_UPLOAD_BYTES + 1, "content")).toBe(false);
  });

  it("rejects empty, negative, fractional, and unsafe sizes", () => {
    expect(isWithinUploadLimit(0, "homework")).toBe(false);
    expect(isWithinUploadLimit(-1, "homework")).toBe(false);
    expect(isWithinUploadLimit(1.5, "homework")).toBe(false);
    expect(isWithinUploadLimit(Number.MAX_SAFE_INTEGER + 1, "homework")).toBe(false);
  });
});
