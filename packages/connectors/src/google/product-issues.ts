/**
 * Google Merchant account and product issue ingestion (task T061).
 *
 * The Merchant API reports, per product, the item-level issues that keep it out
 * of Shopping ads / free listings — the disapproval reasons that ARE the feed
 * diagnostics (product-issues-integration.md, account-issues-integration.md,
 * issue-rendering-integration.md). This module builds the ingestion requests and
 * normalizes the issue payloads into a stable shape the diagnostics layer
 * consumes. Pure; the worker performs the HTTP paging.
 */
import { ConnectorError } from "../errors.js";
import { GOOGLE_MERCHANT_API_BASE } from "./oauth.js";

/** Normalized issue severity derived from Google's servability. */
export const GOOGLE_ISSUE_SEVERITIES = ["error", "warning", "info"] as const;
export type GoogleIssueSeverity = (typeof GOOGLE_ISSUE_SEVERITIES)[number];

export interface NormalizedIssue {
  readonly code: string;
  /** disapproved | demoted | unaffected (as reported by Google). */
  readonly servability: string;
  /** merchant_action | pending_processing (whether the merchant can act). */
  readonly resolution: string;
  readonly severity: GoogleIssueSeverity;
  readonly description: string;
  readonly detail: string | null;
  readonly documentationUrl: string | null;
  readonly attributeName: string | null;
  readonly destination: string | null;
  readonly affectedCountries: readonly string[];
}

export interface NormalizedProductIssue {
  /** Product resource / offer id. */
  readonly productId: string;
  readonly title: string | null;
  readonly issues: readonly NormalizedIssue[];
}

export interface NormalizedAccountIssue {
  readonly code: string;
  readonly severity: GoogleIssueSeverity;
  readonly title: string;
  readonly detail: string | null;
  readonly documentationUrl: string | null;
  readonly destination: string | null;
  readonly affectedCountries: readonly string[];
}

function severityFromServability(servability: unknown): GoogleIssueSeverity {
  const s = typeof servability === "string" ? servability.toLowerCase() : "";
  if (s === "disapproved") return "error";
  if (s === "demoted") return "warning";
  return "info";
}

function severityFromSeverity(raw: unknown): GoogleIssueSeverity {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (s === "critical" || s === "error") return "error";
  if (s === "suggestion" || s === "warning") return "warning";
  return "info";
}

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

interface RawItemLevelIssue {
  readonly code?: string;
  readonly servability?: string;
  readonly resolution?: string;
  readonly description?: string;
  readonly detail?: string;
  readonly documentation?: string;
  readonly attributeName?: string;
  readonly destination?: string;
  readonly applicableCountries?: readonly string[];
}
interface RawProductStatus {
  readonly name?: string;
  readonly productId?: string;
  readonly title?: string;
  readonly itemLevelIssues?: readonly RawItemLevelIssue[];
  readonly destinationStatuses?: readonly unknown[];
}

/** Builds the Merchant API request to list product statuses (with item-level issues). */
export function buildProductStatusesRequest(
  accountId: string,
  options: { readonly pageToken?: string; readonly pageSize?: number } = {},
): { readonly url: string; readonly method: "GET"; readonly accountId: string } {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new ConnectorError("accountId is required", "validation");
  }
  const url = new URL(
    `${GOOGLE_MERCHANT_API_BASE}/products/v1beta/accounts/${accountId}/productStatuses`,
  );
  if (options.pageSize) url.searchParams.set("pageSize", String(Math.min(1000, options.pageSize)));
  if (options.pageToken) url.searchParams.set("pageToken", options.pageToken);
  return { url: url.toString(), method: "GET", accountId };
}

/** Normalizes a single Merchant API product status into product-level issues. */
export function mapProductStatus(raw: RawProductStatus): NormalizedProductIssue {
  const productId = str(raw?.productId) ?? str(raw?.name);
  if (productId === null) {
    throw new ConnectorError("product status is missing an id", "validation");
  }
  const issues: NormalizedIssue[] = (raw.itemLevelIssues ?? []).map((i) => ({
    code: str(i.code) ?? "unknown",
    servability: str(i.servability) ?? "unaffected",
    resolution: str(i.resolution) ?? "pending_processing",
    severity: severityFromServability(i.servability),
    description: str(i.description) ?? str(i.code) ?? "issue",
    detail: str(i.detail),
    documentationUrl: str(i.documentation),
    attributeName: str(i.attributeName),
    destination: str(i.destination),
    affectedCountries: strArray(i.applicableCountries),
  }));
  return { productId, title: str(raw.title), issues };
}

/** Parses a product-statuses list response into normalized product issues. */
export function parseProductStatuses(raw: {
  readonly productStatuses?: readonly RawProductStatus[];
}): NormalizedProductIssue[] {
  const list = Array.isArray(raw?.productStatuses) ? raw.productStatuses : [];
  return list.map(mapProductStatus);
}

interface RawAccountIssue {
  readonly name?: string;
  readonly title?: string;
  readonly severity?: string;
  readonly detail?: string;
  readonly documentationUri?: string;
  readonly impactedDestinations?: readonly { readonly reportingContext?: string }[];
  readonly applicableCountries?: readonly string[];
}

/** Builds the Merchant API request to list account-level issues. */
export function buildAccountIssuesRequest(accountId: string): {
  readonly url: string;
  readonly method: "GET";
} {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new ConnectorError("accountId is required", "validation");
  }
  return {
    url: `${GOOGLE_MERCHANT_API_BASE}/accounts/v1beta/accounts/${accountId}/issues`,
    method: "GET",
  };
}

/** Parses account-level issues into a normalized shape. */
export function parseAccountIssues(raw: {
  readonly accountIssues?: readonly RawAccountIssue[];
}): NormalizedAccountIssue[] {
  const list = Array.isArray(raw?.accountIssues) ? raw.accountIssues : [];
  return list.map((i) => ({
    code: str(i.name)?.split("/").pop() ?? str(i.title) ?? "unknown",
    severity: severityFromSeverity(i.severity),
    title: str(i.title) ?? "account issue",
    detail: str(i.detail),
    documentationUrl: str(i.documentationUri),
    destination: str(i.impactedDestinations?.[0]?.reportingContext),
    affectedCountries: strArray(i.applicableCountries),
  }));
}
