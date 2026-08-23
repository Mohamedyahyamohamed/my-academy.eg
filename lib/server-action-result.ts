import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { actionFailure, type ActionResult } from "./action-result";

/**
 * Server Action wrapper: Next.js implements redirect() by throwing a special
 * internal error. It must cross the action boundary untouched so the App Router
 * can complete navigation instead of exposing NEXT_REDIRECT to the user.
 */
export async function safeAction<T>(
  operation: () => Promise<T>,
  fallback: string,
  code?: string,
): Promise<ActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("server action failed", error);
    return actionFailure(error, fallback, code);
  }
}
