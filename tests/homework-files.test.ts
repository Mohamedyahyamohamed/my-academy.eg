import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types";

const mocks = vi.hoisted(() => ({
  nodeSupabaseClient: vi.fn(),
  loadCurrentUser: vi.fn(),
  resolveTeacherForGroups: vi.fn(),
}));

vi.mock("@/lib/supabase/node-client", () => ({
  nodeSupabaseClient: mocks.nodeSupabaseClient,
}));
vi.mock("@/services/session", () => ({
  loadCurrentUser: mocks.loadCurrentUser,
}));
vi.mock("@/services/groups", () => ({
  resolveTeacherForGroups: mocks.resolveTeacherForGroups,
}));
vi.mock("@/lib/permissions", () => ({
  hasAcademyWideScope: () => false,
}));

import { GET } from "@/app/api/homework/files/[fileId]/route";
import { getAuthorizedHomeworkFile } from "@/services/homework-files";

const ACADEMY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACADEMY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HOMEWORK_A = "11111111-1111-4111-8111-111111111111";
const HOMEWORK_B = "22222222-2222-4222-8222-222222222222";
const STUDENT_A = "33333333-3333-4333-8333-333333333333";
const STUDENT_B = "44444444-4444-4444-8444-444444444444";
const STUDENT_A2 = "55555555-5555-4555-8555-555555555555";
const FILE_A = "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";
const FILE_B = "bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb";

const teacherA: SessionUser = {
  id: "teacher-a",
  email: "teacher-a@example.test",
  role: "TEACHER",
  full_name: "Teacher A",
  avatar_url: null,
  academy_id: ACADEMY_A,
};
const teacherB: SessionUser = {
  id: "teacher-b",
  email: "teacher-b@example.test",
  role: "TEACHER",
  full_name: "Teacher B",
  avatar_url: null,
  academy_id: ACADEMY_B,
};
const studentA: SessionUser = {
  id: "profile-student-a",
  email: "student-a@example.test",
  role: "STUDENT",
  full_name: "Student A",
  avatar_url: null,
  academy_id: ACADEMY_A,
};
const studentA2: SessionUser = {
  id: "profile-student-a2",
  email: "student-a2@example.test",
  role: "STUDENT",
  full_name: "Student A2",
  avatar_url: null,
  academy_id: ACADEMY_A,
};

const files = [
  {
    id: FILE_A,
    academy_id: ACADEMY_A,
    owner_id: STUDENT_A,
    name: "homework-a.pdf",
    url: `${ACADEMY_A}/${HOMEWORK_A}/${STUDENT_A}/${FILE_A}.pdf`,
    size: 3,
    mime_type: "application/pdf",
  },
  {
    id: FILE_B,
    academy_id: ACADEMY_B,
    owner_id: STUDENT_B,
    name: "homework-b.pdf",
    url: `${ACADEMY_B}/${HOMEWORK_B}/${STUDENT_B}/${FILE_B}.pdf`,
    size: 3,
    mime_type: "application/pdf",
  },
];
const submissions = [
  { file_id: FILE_A, homework_id: HOMEWORK_A, student_id: STUDENT_A },
  { file_id: FILE_B, homework_id: HOMEWORK_B, student_id: STUDENT_B },
];
const homework = [
  { id: HOMEWORK_A, academy_id: ACADEMY_A, group_id: "group-a" },
  { id: HOMEWORK_B, academy_id: ACADEMY_B, group_id: "group-b" },
];
const students = [
  { id: STUDENT_A, academy_id: ACADEMY_A, parent_id: null, email: "student-a@example.test" },
  { id: STUDENT_B, academy_id: ACADEMY_B, parent_id: null, email: "student-b@example.test" },
];
const groups = [
  { id: "group-a", academy_id: ACADEMY_A, teacher_id: "teacher-a" },
  { id: "group-b", academy_id: ACADEMY_B, teacher_id: "teacher-b" },
];

function makeClient() {
  const resolve = (table: string, filters: Record<string, string>) => {
    const rows = table === "files" ? files
      : table === "homework_submissions" ? submissions
        : table === "homework" ? homework
          : table === "students" ? students
            : table === "groups" ? groups
              : [];
    const row = rows.find((candidate: any) => Object.entries(filters).every(([key, value]) => candidate[key] === value));
    return { data: row ?? null, error: null };
  };

  return {
    from(table: string) {
      const filters: Record<string, string> = {};
      const query: any = {
        select: () => query,
        eq: (key: string, value: string) => {
          filters[key] = value;
          return query;
        },
        ilike: (key: string, value: string) => {
          filters[key] = value.replace(/^%|%$/g, "");
          return query;
        },
        limit: () => query,
        maybeSingle: async () => resolve(table, filters),
      };
      return query;
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "https://storage.example.test/homework.pdf" }, error: null }),
      }),
    },
  };
}

async function get(fileId: string) {
  return GET(new Request(`https://my-academy-eg.vercel.app/api/homework/files/${fileId}`), {
    params: Promise.resolve({ fileId }),
  });
}

describe("Private homework file authorization", () => {
  beforeEach(() => {
    mocks.nodeSupabaseClient.mockReset();
    mocks.loadCurrentUser.mockReset();
    mocks.resolveTeacherForGroups.mockReset();
    mocks.nodeSupabaseClient.mockReturnValue(makeClient());
    mocks.resolveTeacherForGroups.mockImplementation(async (_academyId: string, userId: string) => ({ id: userId }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([37, 80, 68]), {
      status: 200,
      headers: { "content-length": "3" },
    })));
  });

  it("allows Academy A to download its own homework file and returns binary", async () => {
    mocks.loadCurrentUser.mockResolvedValue(teacherA);
    const response = await get(FILE_A);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68]));
  });

  it("allows Academy B to download its own homework file", async () => {
    mocks.loadCurrentUser.mockResolvedValue(teacherB);
    expect((await get(FILE_B)).status).toBe(200);
  });

  it("denies B to A and A to B without signed URL or binary response", async () => {
    mocks.loadCurrentUser.mockResolvedValue(teacherB);
    const bToA = await get(FILE_A);
    expect(bToA.status).toBe(404);
    expect(await bToA.text()).toContain("File not found");

    mocks.loadCurrentUser.mockResolvedValue(teacherA);
    const aToB = await get(FILE_B);
    expect(aToB.status).toBe(404);
    expect(await aToB.text()).toContain("File not found");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("enforces student ownership rather than academy membership alone", async () => {
    expect(await getAuthorizedHomeworkFile(FILE_A, studentA)).not.toBeNull();
    expect(await getAuthorizedHomeworkFile(FILE_A, studentA2)).toBeNull();
  });

  it("rejects unauthenticated, malformed, nonexistent, and substituted IDs safely", async () => {
    mocks.loadCurrentUser.mockResolvedValue(null);
    expect((await get(FILE_A)).status).toBe(401);

    mocks.loadCurrentUser.mockResolvedValue(teacherA);
    for (const id of ["not-a-uuid", "00000000-0000-0000-0000-000000000000", HOMEWORK_A, "../secret"]) {
      const response = await get(id);
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("File not found");
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
