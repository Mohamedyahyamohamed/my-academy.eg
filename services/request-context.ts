import { AsyncLocalStorage } from "node:async_hooks";
import type { SessionUser } from "@/types";

type RequestContext = {
  user: SessionUser | null;
  academyId: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function setRequestContext(user: SessionUser | null): void {
  storage.enterWith({ user, academyId: user?.academy_id ?? null });
}

export function getRequestUser(): SessionUser | null {
  return storage.getStore()?.user ?? null;
}

export function getRequestAcademyId(): string | null {
  return storage.getStore()?.academyId ?? null;
}
