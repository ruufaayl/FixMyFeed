/**
 * Google Merchant data source and destination ingestion (task T063).
 *
 * The Merchant API exposes a merchant's data sources (product feeds) and the
 * destinations/reporting contexts they target (Shopping ads, free listings, …)
 * (data-sources-integration.md, destination-and-country-model.md). Knowing which
 * feeds exist, their type/input, and their destinations lets diagnostics attribute
 * issues to the right feed and destination. Pure; the worker performs the HTTP call.
 */
import { ConnectorError } from "../errors.js";
import { GOOGLE_MERCHANT_API_BASE } from "./oauth.js";

/** Known Merchant API destinations / reporting contexts. */
export const GOOGLE_DESTINATIONS = [
  "SHOPPING_ADS",
  "FREE_LISTINGS",
  "DISPLAY_ADS",
  "LOCAL_INVENTORY_ADS",
  "FREE_LOCAL_LISTINGS",
  "YOUTUBE_SHOPPING",
] as const;
export type GoogleDestination = (typeof GOOGLE_DESTINATIONS)[number] | "OTHER";

/** Normalizes an arbitrary destination string to a known destination or OTHER. */
export function normalizeDestination(value: unknown): GoogleDestination {
  const v = typeof value === "string" ? value.toUpperCase() : "";
  return (GOOGLE_DESTINATIONS as readonly string[]).includes(v)
    ? (v as GoogleDestination)
    : "OTHER";
}

export const DATA_SOURCE_TYPES = ["primary", "supplemental", "other"] as const;
export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

export interface NormalizedDataSource {
  readonly dataSourceId: string;
  readonly name: string;
  readonly displayName: string | null;
  readonly type: DataSourceType;
  /** api | file | autofeed | … */
  readonly input: string | null;
  readonly feedLabel: string | null;
  readonly contentLanguage: string | null;
  readonly countries: readonly string[];
  readonly destinations: readonly GoogleDestination[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Builds the Merchant API request to list a merchant's data sources. */
export function buildDataSourcesRequest(
  accountId: string,
  pageToken?: string,
): { readonly url: string; readonly method: "GET" } {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new ConnectorError("accountId is required", "validation");
  }
  const url = new URL(
    `${GOOGLE_MERCHANT_API_BASE}/datasources/v1beta/accounts/${accountId}/dataSources`,
  );
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return { url: url.toString(), method: "GET" };
}

interface RawProductSource {
  readonly feedLabel?: string;
  readonly contentLanguage?: string;
  readonly countries?: readonly string[];
  readonly destinations?: readonly { readonly destination?: string }[];
}
interface RawDataSource {
  readonly name?: string;
  readonly dataSourceId?: string | number;
  readonly displayName?: string;
  readonly input?: string;
  readonly primaryProductDataSource?: RawProductSource;
  readonly supplementalProductDataSource?: RawProductSource;
}

function dataSourceIdFromName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const match = name.match(/dataSources\/([^/]+)/);
  return match ? match[1]! : null;
}

/** Parses a data-sources list response into normalized feeds. */
export function parseDataSources(raw: {
  readonly dataSources?: readonly RawDataSource[];
}): NormalizedDataSource[] {
  const list = Array.isArray(raw?.dataSources) ? raw.dataSources : [];
  return list.map((d) => {
    const dataSourceId =
      d.dataSourceId !== undefined ? String(d.dataSourceId) : dataSourceIdFromName(d.name);
    if (dataSourceId === null) {
      throw new ConnectorError("data source is missing an id", "validation");
    }
    const primary = d.primaryProductDataSource;
    const supplemental = d.supplementalProductDataSource;
    const type: DataSourceType = primary ? "primary" : supplemental ? "supplemental" : "other";
    const source = primary ?? supplemental;
    const destinations = (source?.destinations ?? []).map((x: { destination?: string }) =>
      normalizeDestination(x.destination),
    );
    return {
      dataSourceId,
      name: str(d.name) ?? `accounts/*/dataSources/${dataSourceId}`,
      displayName: str(d.displayName),
      type,
      input: str(d.input),
      feedLabel: str(source?.feedLabel),
      contentLanguage: str(source?.contentLanguage),
      countries: strArray(source?.countries),
      destinations,
    };
  });
}
