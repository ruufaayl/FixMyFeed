/**
 * Google Merchant Center destination connector (tasks T060–T065).
 *
 * OAuth + account discovery (T060), product/account issue ingestion (T061),
 * aggregate status + product data (T062), data sources + destinations (T063),
 * quota scheduling + retries (T064), and issue-resolution capability routing
 * (T065). Re-exported under the `google` namespace from the connectors root.
 */
export {
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_CONTENT_SCOPE,
  GOOGLE_MERCHANT_API_BASE,
  buildGoogleAuthorizationRequest,
  buildGoogleTokenExchange,
  buildGoogleRefreshRequest,
  buildAccountsListRequest,
  parseGoogleAccounts,
} from "./oauth.js";
export type { GoogleAuthInput, GoogleTokenExchangeInput, GoogleAccount } from "./oauth.js";

export {
  GOOGLE_ISSUE_SEVERITIES,
  buildProductStatusesRequest,
  mapProductStatus,
  parseProductStatuses,
  buildAccountIssuesRequest,
  parseAccountIssues,
} from "./product-issues.js";
export type {
  GoogleIssueSeverity,
  NormalizedIssue,
  NormalizedProductIssue,
  NormalizedAccountIssue,
} from "./product-issues.js";

export {
  buildAggregateStatusRequest,
  parseAggregateStatuses,
  buildProductsRequest,
  mapGoogleProduct,
} from "./aggregate-status.js";
export type {
  AggregateIssue,
  NormalizedAggregateStatus,
  NormalizedGoogleProduct,
} from "./aggregate-status.js";

export {
  GOOGLE_DESTINATIONS,
  DATA_SOURCE_TYPES,
  normalizeDestination,
  buildDataSourcesRequest,
  parseDataSources,
} from "./data-sources.js";
export type { GoogleDestination, DataSourceType, NormalizedDataSource } from "./data-sources.js";

export {
  classifyGoogleApiError,
  nextGoogleAttemptDelayMs,
  shouldRetryGoogle,
  planDailyQuota,
} from "./quota.js";
export type { GoogleErrorInput, DailyQuotaInput, QuotaPlan } from "./quota.js";

export {
  RESOLUTION_KINDS,
  RESOLUTION_ATTRIBUTES,
  routeIssueResolution,
  routeProductIssues,
} from "./resolution-routing.js";
export type {
  ResolutionKind,
  ResolutionAttribute,
  ResolutionPlan,
  ProductResolution,
} from "./resolution-routing.js";
