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
    expect(sound).toMatch(/success: "\/sounds\/qr-success\.wav\?v=/);
    expect(sound).toMatch(/error: "\/sounds\/qr-error\.wav\?v=/);
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

  it("plays result feedback in the camera scanner and shows the server-resolved student name", () => {
    const scanner = readProjectFile("components/attendance/scan-workshop.tsx");
    const action = readProjectFile("app/actions/attendance.ts");
    expect(scanner).toContain("primeQrSound();");
    expect(scanner).toContain('playQrResultSound("success")');
    expect(scanner).toContain('playQrResultSound("error")');
    expect(scanner).toContain("serverStudentName");
    expect(scanner).not.toContain('en ? "Student QR" : "QR الطالب"');
    expect(action).toContain("const scannedStudent = await StudentsService.getStudent(studentId);");
    expect(action).toContain("const snapshotStudent = collections().students.find(");
    expect(action).toContain("candidate.academy_id === user.academy_id");
    expect(action).toContain("let directStudent: { id: string; first_name: string; last_name: string } | null = null;");
    expect(action).toContain("const resolvedStudent = directStudent ?? scannedStudent ?? snapshotStudent;");
    expect(action).toContain("student = resolvedStudent ? { id: resolvedStudent.id, name: fullName(resolvedStudent) } : null;");
    expect(action).toContain("student,");
  });

  it("plays result feedback in quick check-in links", () => {
    const checkin = readProjectFile("app/checkin/page.tsx");
    expect(checkin).toContain('playQrResultSound("success")');
    expect(checkin).toContain('playQrResultSound("error")');
    expect(checkin).toContain("primeQrSound();");
  });
});
