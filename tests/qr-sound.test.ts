import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("QR attendance sound feedback", () => {
  it("provides distinct success and error tones without external audio assets", () => {
    const sound = readProjectFile("lib/qr-sound.ts");
    expect(sound).toContain('QrSoundKind = "success" | "error"');
    expect(sound).toContain('kind === "success" ? [880, 1320] : [260, 180]');
    expect(sound).toContain("primeQrSound");
    expect(sound).toContain("AudioContext");
  });

  it("plays result feedback in the camera scanner", () => {
    const scanner = readProjectFile("components/attendance/scan-workshop.tsx");
    expect(scanner).toContain('primeQrSound();');
    expect(scanner).toContain('playQrResultSound("success")');
    expect(scanner).toContain('playQrResultSound("error")');
  });

  it("plays result feedback in quick check-in links", () => {
    const checkin = readProjectFile("app/checkin/page.tsx");
    expect(checkin).toContain('playQrResultSound("success")');
    expect(checkin).toContain('playQrResultSound("error")');
  });
});
