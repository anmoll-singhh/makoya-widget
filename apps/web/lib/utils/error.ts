/**
 * lib/utils/error.ts
 *
 * Centralised error-handling utilities for API route handlers.
 *
 * Why this exists:
 * ─────────────────
 * Next.js App Router route handlers return plain `Response` objects.
 * Without a shared utility, every handler ends up with its own ad-hoc
 * JSON serialisation, inconsistent HTTP status codes, and no guarantee
 * that the `ApiError` shape from `types/index.ts` is actually respected.
 *
 * This module provides:
 *  - `AppError`      — a typed, throwable error class that carries an
 *                      `ErrorCode` and an optional HTTP status.
 *  - `toApiError`    — converts any thrown value into a safe `ApiError`
 *                      response, stripping internal details in production.
 *  - `isAppError`    — type-guard so callers can narrow thrown values.
 */

import type { ApiError, ErrorCode } from "@/types";

// ---------------------------------------------------------------------------
// Typed application error
// ---------------------------------------------------------------------------

/**
 * All errors that cross an API boundary should be `AppError` instances.
 * Throwing a plain `Error` is fine inside lib code, but route handlers
 * must catch and convert via `toApiError` before responding.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;

    // Maintains proper prototype chain in transpiled output
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/** Narrows an unknown caught value to `AppError`. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

// ---------------------------------------------------------------------------
// Response factory
// ---------------------------------------------------------------------------

/**
 * Converts any thrown value into a well-typed JSON `Response` carrying
 * the `ApiError` shape defined in `types/index.ts`.
 *
 * - Known `AppError` instances → preserve code + statusCode.
 * - Unknown errors             → `INTERNAL_SERVER_ERROR` / HTTP 500.
 *
 * In production, raw error messages from unknown errors are suppressed to
 * prevent accidental leakage of internal implementation details.
 */
export function toApiError(err: unknown): Response {
  if (isAppError(err)) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    return Response.json(body, { status: err.statusCode });
  }

  // Unknown error — log server-side, return generic response
  console.error("[scanner] Unhandled error:", err);

  const body: ApiError = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "development" && err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
    },
  };

  return Response.json(body, { status: 500 });
}
