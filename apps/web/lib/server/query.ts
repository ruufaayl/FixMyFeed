/**
 * Reusable query + value contracts (task T151).
 *
 * Pagination, sorting, filtering, and date-range shapes shared by every list
 * service, plus a `Provenance` tag so DTO values can be marked authoritative,
 * derived, or estimated. Validators reject malformed client input with a
 * `VALIDATION` AppError before it reaches a repository.
 */
import { appError } from "./errors.js";

// ── Provenance ───────────────────────────────────────────────────────────────

/** How much to trust a value: measured, computed, or approximated. */
export type Provenance = "authoritative" | "derived" | "estimated";

/** A numeric value carrying its provenance (e.g. estimated revenue exposure). */
export interface TaggedValue<T = number> {
  readonly value: T;
  readonly provenance: Provenance;
}

export function authoritative<T>(value: T): TaggedValue<T> {
  return { value, provenance: "authoritative" };
}
export function derived<T>(value: T): TaggedValue<T> {
  return { value, provenance: "derived" };
}
export function estimated<T>(value: T): TaggedValue<T> {
  return { value, provenance: "estimated" };
}

// ── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 200;

export interface PageRequest {
  /** Opaque forward cursor; null for the first page. */
  readonly cursor: string | null;
  readonly limit: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  /** Cursor for the next page, or null when exhausted. */
  readonly nextCursor: string | null;
  /** Total matching rows when known (else null — never an unbounded scan). */
  readonly total: number | null;
}

export interface PageRequestInput {
  readonly cursor?: string | null;
  readonly limit?: number;
}

export function validatePageRequest(
  input: PageRequestInput = {},
  maxLimit: number = MAX_PAGE_LIMIT,
): PageRequest {
  const rawLimit = input.limit ?? DEFAULT_PAGE_LIMIT;
  if (!Number.isInteger(rawLimit) || rawLimit <= 0) {
    throw appError.validation("limit must be a positive integer", { limit: String(rawLimit) });
  }
  if (rawLimit > maxLimit) {
    throw appError.validation(`limit must not exceed ${maxLimit}`, { limit: rawLimit, maxLimit });
  }
  const cursor = input.cursor ?? null;
  if (cursor !== null && (typeof cursor !== "string" || cursor.length > 512)) {
    throw appError.validation("cursor is invalid");
  }
  return { cursor, limit: rawLimit };
}

// ── Sorting ──────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc";

export interface SortRequest<Field extends string = string> {
  readonly field: Field;
  readonly direction: SortDirection;
}

export function validateSort<Field extends string>(
  input: { field?: string; direction?: string } | undefined,
  allowedFields: readonly Field[],
  fallback: SortRequest<Field>,
): SortRequest<Field> {
  if (!input?.field) return fallback;
  if (!allowedFields.includes(input.field as Field)) {
    throw appError.validation("unknown sort field", { field: input.field });
  }
  const direction = input.direction ?? "asc";
  if (direction !== "asc" && direction !== "desc") {
    throw appError.validation("sort direction must be asc or desc", { direction });
  }
  return { field: input.field as Field, direction };
}

// ── Filtering ────────────────────────────────────────────────────────────────

/** A filter is a bounded map of allowed keys to string values. */
export type FilterRequest<Key extends string = string> = Partial<Record<Key, string>>;

export function validateFilter<Key extends string>(
  input: Record<string, unknown> | undefined,
  allowedKeys: readonly Key[],
): FilterRequest<Key> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!allowedKeys.includes(key as Key)) {
      throw appError.validation("unknown filter key", { key });
    }
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      throw appError.validation("filter values must be strings", { key });
    }
    result[key] = value;
  }
  return result as FilterRequest<Key>;
}

// ── Date range ───────────────────────────────────────────────────────────────

export interface DateRange {
  /** ISO-8601 inclusive start. */
  readonly from: string;
  /** ISO-8601 inclusive end. */
  readonly to: string;
}

export function validateDateRange(input: { from?: string; to?: string } | undefined): DateRange {
  const from = input?.from;
  const to = input?.to;
  if (!from || !to) throw appError.validation("from and to are required");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw appError.validation("from and to must be ISO-8601 dates");
  }
  if (fromMs > toMs) throw appError.validation("from must not be after to");
  return { from, to };
}
