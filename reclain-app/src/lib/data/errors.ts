// One error type for everything the data layer refuses. `message` is safe to show people.

export type DataErrorKind = "auth" | "forbidden" | "not_found" | "invalid" | "conflict" | "unavailable";

export class DataError extends Error {
  constructor(
    public kind: DataErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "DataError";
  }
}

// Postgres error codes raised by our SQL functions (see supabase/migrations).
const CODE_TO_KIND: Record<string, DataErrorKind> = {
  "28000": "auth",
  "42501": "forbidden",
  P0002: "not_found",
  "22023": "invalid",
  "23P01": "conflict",
  "23505": "conflict",
  "23514": "invalid",
};

// Turns a Supabase/PostgREST error into a DataError with a friendly message.
export function fromPostgrest(error: { code?: string; message: string } | null, fallback = "Something went wrong. Try again."): DataError {
  if (!error) return new DataError("unavailable", fallback);
  const kind = (error.code && CODE_TO_KIND[error.code]) || "unavailable";
  // Our own SQL messages are written for people; Postgres's own messages are not.
  const ours = error.code && ["28000", "P0002", "22023", "23P01"].includes(error.code);
  if (error.code === "42501" && /row-level security|permission denied/i.test(error.message)) {
    return new DataError("forbidden", "You don't have access to that.");
  }
  if (error.code === "23514") return new DataError("invalid", "One of those values isn't allowed. Check the form and try again.");
  if (error.code === "23505") return new DataError("conflict", "That already exists.");
  return new DataError(kind, ours || error.code === "42501" ? error.message : fallback);
}

export function isDataError(e: unknown): e is DataError {
  return e instanceof DataError;
}
