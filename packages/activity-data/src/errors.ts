export class ActivityDataError extends Error {
  constructor(
    public readonly code: "unauthorized" | "conflict" | "invalid" | "not_found" | "database",
    message: string,
    public readonly causeValue?: unknown,
  ) {
    super(message);
    this.name = "ActivityDataError";
  }
}

export function activityDatabaseError(error: unknown): ActivityDataError {
  const candidate = error as { code?: string; message?: string } | null;
  const message = candidate?.message ?? "activity database operation failed";
  if (candidate?.code === "VAI01" || message.includes("idempotency key")) {
    return new ActivityDataError("conflict", message, error);
  }
  if (candidate?.code === "VACAS" || message.includes("version conflict")) {
    return new ActivityDataError("conflict", message, error);
  }
  if (candidate?.code === "VA403" || candidate?.code === "42501") {
    return new ActivityDataError("unauthorized", message, error);
  }
  if (candidate?.code === "VA404") return new ActivityDataError("not_found", message, error);
  if (candidate?.code === "22023") return new ActivityDataError("invalid", message, error);
  return new ActivityDataError("database", message, error);
}
