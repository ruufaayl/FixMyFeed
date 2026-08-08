/**
 * UI-facing DTOs (task T151) — the canonical contract the Signal Interface reads.
 *
 * These are plain, stable shapes. They intentionally do NOT expose Drizzle
 * models, database row types, connector payloads, queue internals, or raw JSONB.
 * Values that are computed or approximated carry a `Provenance` tag via
 * `TaggedValue`. Long-running work is referenced by durable execution ids, never
 * by holding a request open.
 */
import type { Provenance, TaggedValue } from "./query";

export type IssueSeverityDTO = "critical" | "error" | "warning" | "info";
export type ToneDTO = "healthy" | "info" | "warning" | "critical" | "neutral" | "brand";

// ── Overview ─────────────────────────────────────────────────────────────────

export interface IntegrationStatusDTO {
  readonly id: string;
  readonly name: string;
  readonly tone: ToneDTO;
  readonly status: string;
  readonly lastSyncAt: string | null;
}

export interface ActivityDTO {
  readonly id: string;
  readonly title: string;
  readonly meta: string | null;
  readonly at: string;
  readonly tone: ToneDTO;
}

export interface OverviewDTO {
  /** 0–100 catalog health (computed). */
  readonly healthScore: TaggedValue<number>;
  readonly productsAffected: TaggedValue<number>;
  readonly criticalIssues: TaggedValue<number>;
  readonly repairable: TaggedValue<number>;
  readonly integrations: readonly IntegrationStatusDTO[];
  readonly topSignals: readonly HealthSignalDTO[];
  readonly recentActivity: readonly ActivityDTO[];
}

export interface SignalSourceDTO {
  readonly label: string;
  readonly value: string;
  readonly mismatch: boolean;
}

export interface HealthSignalDTO {
  readonly id: string;
  readonly title: string;
  readonly severity: IssueSeverityDTO;
  readonly affectedCount: TaggedValue<number>;
  /** Revenue/impact exposure — always estimated. */
  readonly exposure: TaggedValue<number> | null;
  readonly confidence: number | null;
  readonly sources: readonly SignalSourceDTO[];
  readonly detectedAt: string | null;
}

// ── Catalog + Product inspector ──────────────────────────────────────────────

export type AvailabilityDTO = "in_stock" | "out_of_stock" | "unknown";

export interface CatalogProductDTO {
  readonly id: string;
  readonly title: string;
  readonly sku: string | null;
  readonly price: string | null;
  readonly availability: AvailabilityDTO;
  readonly issueCount: number;
  readonly worstSeverity: IssueSeverityDTO | null;
}

export interface SourceComparisonRowDTO {
  readonly attribute: string;
  readonly values: Readonly<Record<string, string | null>>;
  readonly mismatch: boolean;
}

export interface ProductInspectorDTO {
  readonly id: string;
  readonly title: string;
  readonly sources: readonly string[];
  readonly comparison: readonly SourceComparisonRowDTO[];
  readonly issues: readonly IssueDTO[];
}

// ── Issues + evidence ────────────────────────────────────────────────────────

export interface IssueGroupDTO {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly severity: IssueSeverityDTO;
  readonly affectedCount: TaggedValue<number>;
  readonly exposure: TaggedValue<number> | null;
  readonly confidence: number | null;
  readonly repairable: boolean;
}

export interface IssueDTO {
  readonly id: string;
  readonly code: string;
  readonly severity: IssueSeverityDTO;
  readonly productExternalId: string | null;
  readonly field: string | null;
  readonly message: string;
  readonly status: "open" | "resolved";
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
}

export interface EvidenceEntryDTO {
  readonly source: string;
  readonly value: string;
  readonly observedAt: string;
  readonly mismatch: boolean;
}

export interface EvidenceDTO {
  readonly issueGroupId: string;
  readonly entries: readonly EvidenceEntryDTO[];
  readonly explanation: string;
  readonly whyItMatters: string;
  readonly recommendedRepair: string | null;
}

// ── Repairs + repair exceptions ──────────────────────────────────────────────

export type RepairPlanStatusDTO =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "rolled_back";

export type SafetyClassDTO = "automatic" | "assisted" | "manual" | "blocked";

export interface RepairChangeDTO {
  readonly issueCode: string;
  readonly productExternalId: string;
  readonly variantExternalId: string | null;
  readonly field: string;
  readonly safetyClass: SafetyClassDTO;
  readonly currentValue: string | null;
  readonly proposedValue: string | null;
  /** True when a human must supply the value (Assisted Change / manual). */
  readonly requiresInput: boolean;
}

export type ChangePreviewStatusDTO = "ready" | "noop" | "needs_input" | "conflict";

export interface ChangePreviewEntryDTO {
  readonly change: RepairChangeDTO;
  readonly status: ChangePreviewStatusDTO;
  readonly liveValue: string | null;
  readonly conflictReason: "concurrent_edit" | "product_changed" | "missing_product" | null;
}

export interface ApprovalDTO {
  readonly approverId: string;
  readonly decision: "approved" | "rejected";
  readonly note: string | null;
  readonly at: string;
}

export interface RepairExecutionDTO {
  readonly id: string;
  readonly kind: "apply" | "rollback";
  readonly status: "queued" | "running" | "completed" | "partially_completed" | "failed";
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
}

export interface RepairPlanDTO {
  readonly id: string;
  readonly status: RepairPlanStatusDTO;
  readonly riskLevel: "low" | "medium" | "high";
  readonly changes: readonly RepairChangeDTO[];
  readonly preview: readonly ChangePreviewEntryDTO[];
  readonly approvals: readonly ApprovalDTO[];
  readonly requiredApprovals: number;
  readonly execution: RepairExecutionDTO | null;
}

/** A change that failed to write or did not verify — the Repair Exceptions pattern. */
export interface RepairExceptionDTO {
  readonly itemId: string;
  readonly productExternalId: string;
  readonly variantExternalId: string | null;
  readonly field: string;
  readonly status: "failed" | "not_verified";
  readonly error: string | null;
  readonly before: string | null;
  readonly after: string | null;
  readonly observed: string | null;
}

// ── Repair rules (Rule Builder) ──────────────────────────────────────────────

export type RuleFieldDTO = "code" | "severity" | "field";
export type RuleOperatorDTO = "eq" | "in";
export type RuleActionDTO = "auto_apply" | "flag" | "ignore";
export type RuleMatchDTO = "all" | "any";

export interface RuleConditionDTO {
  readonly field: RuleFieldDTO;
  readonly op: RuleOperatorDTO;
  /** Always an array; `eq` carries one value, `in` carries several. */
  readonly values: readonly string[];
}

export interface RuleDefinitionDTO {
  readonly match: RuleMatchDTO;
  readonly conditions: readonly RuleConditionDTO[];
  readonly action: RuleActionDTO;
}

export interface RepairRuleDTO {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly definition: RuleDefinitionDTO;
}

/** Client-supplied create/update payload for a rule. */
export interface RuleDraftDTO {
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly definition: RuleDefinitionDTO;
}

export interface RuleSimulationEntryDTO {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly action: RuleActionDTO;
  readonly matchedCount: number;
  /** A few representative issue codes this rule matched (bounded). */
  readonly sampleCodes: readonly string[];
}

export interface RuleSimulationDTO {
  readonly entries: readonly RuleSimulationEntryDTO[];
  readonly matchedIssues: number;
  readonly totalIssues: number;
}

// ── Monitoring ───────────────────────────────────────────────────────────────

export interface MonitoringMetricDTO {
  readonly id: string;
  readonly label: string;
  readonly value: TaggedValue<string>;
  readonly caption: string | null;
}

export interface MonitoringEventDTO {
  readonly id: string;
  readonly title: string;
  readonly meta: string | null;
  readonly at: string;
  readonly tone: ToneDTO;
}

export interface MonitoringDTO {
  readonly metrics: readonly MonitoringMetricDTO[];
  readonly events: readonly MonitoringEventDTO[];
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface ReportSummaryDTO {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly stat: TaggedValue<string>;
}

// ── Integrations ─────────────────────────────────────────────────────────────

export interface IntegrationDTO {
  readonly id: string;
  readonly name: string;
  readonly kind: "source" | "destination";
  readonly connectState: "not-connected" | "connecting" | "connected" | "error";
  readonly detail: string | null;
  readonly lastSyncAt: string | null;
}

/** Reference to durable async work (scan/import/execution/verification/rollback). */
export interface ExecutionRefDTO {
  readonly executionId: string;
  readonly kind: "scan" | "import" | "repair_apply" | "repair_verify" | "repair_rollback";
  readonly status: "queued" | "running" | "completed" | "partially_completed" | "failed";
}

export type { Provenance, TaggedValue };
