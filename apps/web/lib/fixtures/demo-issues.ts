/**
 * Explicit demo issues fixture (task T153).
 *
 * Sample issue groups for demos/tests only — never a production fallback. The
 * live `/issues` screen renders real data (or an empty state) via the boundary.
 */
import type { IssueGroupDTO } from "../server/dto";

export const DEMO_ISSUE_GROUPS: readonly IssueGroupDTO[] = [
  {
    id: "price_mismatch",
    code: "price_mismatch",
    title: "Price mismatch",
    severity: "critical",
    affectedCount: { value: 312, provenance: "authoritative" },
    exposure: { value: 18420, provenance: "estimated" },
    confidence: 99,
    repairable: true,
  },
  {
    id: "insecure_link_url",
    code: "insecure_link_url",
    title: "Insecure link url",
    severity: "error",
    affectedCount: { value: 42, provenance: "authoritative" },
    exposure: null,
    confidence: 100,
    repairable: true,
  },
];
