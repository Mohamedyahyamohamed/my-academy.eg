import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("QR attendance sound feedback", () => {
  it("ships distinct local WAV tones and uses HTML Audio first", () => {
    const sound = readProjectFile("lib/qr-sound.ts");
    expect(sound).toContain('QrSoundKind = "success" | "error"');
    expect(sound).toContain('success: "/sounds/qr-success.wav"');
    expect(sound).toContain('error: "/sounds/qr-error.wav"');
    expect(sound).toContain("new Audio(SOUND_URLS[kind])");
    expect(sound).toContain("audio.preload = \"auto\"");
    expect(sound).toContain("primeHtmlAudio(\"success\")");
    expect(sound).toContain("primeHtmlAudio(\"error\")");
    expect(sound).toContain("playWebAudioFallback(kind)");

    for (const file of ["public/sounds/qr-success.wav", "public/sounds/qr-error.wav"]) {
      const path = resolve(root, file);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(1000);
    }
  });

  it("plays result feedback in the camera scanner", () => {
    const scanner = readProjectFile("components/attendance/scan-workshop.tsx");
    expect(scanner).toContain("primeQrSound();");
    expect(scanner).toContain('playQrResultSound("success")');
    expect(scanner).toContain('playQrResultSound("error")');
  });

  it("plays result feedback in quick check-in links", () => {
    const checkin = readProjectFile("app/checkin/page.tsx");
    expect(checkin).toContain('playQrResultSound("success")');
    expect(checkin).toContain('playQrResultSound("error")');
    expect(checkin).toContain("primeQrSound();");
  });
});
