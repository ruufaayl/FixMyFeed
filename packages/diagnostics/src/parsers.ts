/**
 * Feed parsers: CSV / TSV / XML / JSON (task T071).
 *
 * Dependency-free, deterministic parsers that turn raw feed text into an array
 * of flat records (one object per product row) for the schema-mapping step
 * (T072). The delimited parser is a proper RFC 4180 state machine (quoted
 * fields, embedded delimiters/newlines, `""` escapes); the XML parser extracts
 * repeated feed items (`<item>`/`<entry>`) and their child element text,
 * stripping namespace prefixes (so Google's `g:id` becomes `id`).
 *
 * The worker streams bytes to disk/storage; these operate on decoded text.
 */
import { DiagnosticsError } from "./errors.js";
import type { FeedFormat } from "./acquisition.js";

/** A parsed feed record: column/attribute name → string value. */
export type FeedRecord = Record<string, string>;

/** Parses delimited text (CSV/TSV) into records keyed by the header row. */
export function parseDelimited(text: string, delimiter: string): FeedRecord[] {
  if (typeof text !== "string") {
    throw new DiagnosticsError("feed text must be a string", "PARSE_ERROR");
  }
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let started = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    started = true;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      record.push(field);
      field = "";
    } else if (c === "\n") {
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (started && (field.length > 0 || record.length > 0)) {
    record.push(field);
    rows.push(record);
  }

  if (rows.length === 0) return [];
  const headers = (rows[0] ?? []).map((h) => h.trim());
  return rows.slice(1).map((cols) => {
    const obj: FeedRecord = {};
    headers.forEach((h, idx) => {
      if (h.length > 0) obj[h] = cols[idx] ?? "";
    });
    return obj;
  });
}

export const parseCsv = (text: string): FeedRecord[] => parseDelimited(text, ",");
export const parseTsv = (text: string): FeedRecord[] => parseDelimited(text, "\t");

/** Parses a JSON feed: an array, or `{ products | items | entries: [...] }`. */
export function parseJson(text: string): FeedRecord[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new DiagnosticsError(
      `feed is not valid JSON: ${(error as Error).message}`,
      "PARSE_ERROR",
    );
  }
  const array = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.products ??
      (data as Record<string, unknown>)?.items ??
      (data as Record<string, unknown>)?.entries);
  if (!Array.isArray(array)) {
    throw new DiagnosticsError("JSON feed must be an array of products", "PARSE_ERROR");
  }
  return array.map((row) => flattenRecord(row));
}

/** Flattens a record's scalar fields into a string map (nested objects ignored). */
function flattenRecord(row: unknown): FeedRecord {
  const out: FeedRecord = {};
  if (row && typeof row === "object") {
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "object") continue;
      out[key] = String(value);
    }
  }
  return out;
}

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .trim();
}

/**
 * Parses an XML product feed (RSS `<item>` or Atom `<entry>`), extracting each
 * item's direct child elements as fields. Namespace prefixes are stripped
 * (`g:id` → `id`). Repeated child elements keep the first value.
 */
export function parseXml(text: string): FeedRecord[] {
  if (typeof text !== "string") {
    throw new DiagnosticsError("feed text must be a string", "PARSE_ERROR");
  }
  const items: FeedRecord[] = [];
  const itemPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(text)) !== null) {
    const inner = match[2] ?? "";
    const record: FeedRecord = {};
    const fieldPattern = /<([\w.-]+:)?([\w.-]+)\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?\2>/gi;
    let f: RegExpExecArray | null;
    while ((f = fieldPattern.exec(inner)) !== null) {
      const key = (f[2] ?? "").toLowerCase();
      if (key.length === 0 || key in record) continue;
      record[key] = decodeXml(f[3] ?? "");
    }
    if (Object.keys(record).length > 0) items.push(record);
  }
  return items;
}

/** Parses feed text according to its format into flat records. */
export function parseFeed(format: FeedFormat, text: string): FeedRecord[] {
  switch (format) {
    case "csv":
      return parseCsv(text);
    case "tsv":
      return parseTsv(text);
    case "json":
      return parseJson(text);
    case "xml":
      return parseXml(text);
    default:
      throw new DiagnosticsError(`unsupported feed format: ${format}`, "UNSUPPORTED");
  }
}
