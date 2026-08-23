export type ActionFailure = {
  ok: false;
  error: string;
  code?: string;
  field?: string;
  fieldErrors?: Record<string, string>;
};

export type ActionSuccess<T> = T;

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function isActionFailure(value: unknown): value is ActionFailure {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { ok?: unknown }).ok === false &&
      typeof (value as { error?: unknown }).error === "string",
  );
}

export function actionFailure(error: unknown, fallback: string, code?: string): ActionFailure {
  const message = error instanceof Error ? error.message : "";
  return {
    ok: false,
    error: message && !looksLikeInternalError(message) ? message : fallback,
    ...(code ? { code } : {}),
  };
}

function looksLikeInternalError(message: string) {
  return /supabase|postgrest|postgres|relation|constraint|stack|at\s+\w+\s*\(/i.test(message);
}

export async function safeAction<T>(operation: () => Promise<T>, fallback: string, code?: string): Promise<ActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    console.error("server action failed", error);
    return actionFailure(error, fallback, code);
  }
}
