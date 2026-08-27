import { AsyncLocalStorage } from "node:async_hooks";
import type { SessionUser } from "@/types";
import { newRequestId } from "@/lib/error-trace";

type RequestContext = {
  requestId: string;
  startedAt: number;
  user: SessionUser | null;
  academyId: string | null;
  /** Best-effort request path (set by route helpers when available). */
  path?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Initialize (or refresh) the per-request context. Call at the start of a
 * server request (route handler, server action, page) before any service call,
 * and again whenever the authenticated user is (re)hydrated.
 *
 * If a request context is already active, its existing request_id is preserved
 * so the same id threads through the whole request even when loadCurrentUser /
 * requireScopedRole re-bind the user after an async boundary. Pass opts.requestId
 * explicitly only to correlate a known id (e.g. echoed from a client header).
 * Returns the active requestId so callers can echo it in responses.
 */
export function setRequestContext(user: SessionUser | null, opts?: { requestId?: string; path?: string }): string {
  const existing = storage.getStore();
  const requestId = opts?.requestId ?? existing?.requestId ?? newRequestId();
  storage.enterWith({
    requestId,
    startedAt: existing?.startedAt ?? Date.now(),
    user,
    academyId: user?.academy_id ?? null,
    path: opts?.path ?? existing?.path,
  });
  return requestId;
}

export function getRequestUser(): SessionUser | null {
  return storage.getStore()?.user ?? null;
}

export function getRequestAcademyId(): string | null {
  return storage.getStore()?.academyId ?? null;
}

export function getRequestId(): string | null {
  return storage.getStore()?.requestId ?? null;
}

export function getRequestPath(): string | null {
  return storage.getStore()?.path ?? null;
}

export function setRequestPath(path: string): void {
  const store = storage.getStore();
  if (store) store.path = path;
}

export function getRequestStartedAt(): number | null {
  return storage.getStore()?.startedAt ?? null;
}

/**
 * Wrap an async request handler with a fresh request context. The context is
 * available to all downstream service calls via getRequestId()/getRequestUser(),
 * enabling centralized error tracing without prop-drilling.
 */
export async function withRequestContext<T>(
  fn: () => Promise<T>,
  opts?: { user?: SessionUser | null; requestId?: string; path?: string },
): Promise<T> {
  const requestId = opts?.requestId ?? newRequestId();
  return storage.run(
    {
      requestId,
      startedAt: Date.now(),
      user: opts?.user ?? null,
      academyId: opts?.user?.academy_id ?? null,
      path: opts?.path,
    },
    fn,
  );
}
