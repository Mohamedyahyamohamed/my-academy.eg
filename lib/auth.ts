/**
 * Client-safe auth constants & helpers (no server-only imports).
 * Shared by both client components and server modules.
 */
import type { Role } from "@/types";

export const SESSION_COOKIE = "ma_session";
export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: { email: string; role: Role; name: string }[] = [
  { email: "admin@myacademy.edu", role: "ADMIN", name: "Yasmin Hassan" },
  { email: "teacher@myacademy.edu", role: "TEACHER", name: "Omar Khaled" },
  { email: "parent@myacademy.edu", role: "PARENT", name: "Mariam Adel" },
  { email: "student@myacademy.edu", role: "STUDENT", name: "Adam Tarek" },
];

/** Role -> landing route after login. */
export function roleHome(role: Role): string {
  switch (role) {
    case "TEACHER":
      return "/teacher";
    case "PARENT":
      return "/parent";
    case "STUDENT":
      return "/student";
    default:
      return "/dashboard";
  }
}
