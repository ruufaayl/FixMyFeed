/**
 * Pure repair-plan mappers (task T154).
 *
 * Map the domain repair types (@fixmyfeed/repairs) to boundary DTOs. Pure and
 * unit-testable; the adapter composes these with Drizzle reads + the domain
 * change-set preview.
 */
import type { RepairChange, ChangeSetPreview } from "@fixmyfeed/repairs";
import type {
  ChangePreviewEntryDTO,
  RepairChangeDTO,
  RepairPlanStatusDTO,
  SafetyClassDTO,
} from "../dto";

export function toRepairChangeDTO(change: RepairChange): RepairChangeDTO {
  return {
    issueCode: change.issueCode,
    productExternalId: change.productExternalId,
    variantExternalId: change.variantExternalId,
    field: change.field,
    safetyClass: change.safetyClass as SafetyClassDTO,
    currentValue: change.currentValue,
    proposedValue: change.proposedValue,
    requiresInput: change.requiresInput,
  };
}

export function toPreviewEntryDTO(
  entry: ChangeSetPreview["entries"][number],
): ChangePreviewEntryDTO {
  return {
    change: toRepairChangeDTO(entry.change),
    status: entry.status,
    liveValue: entry.liveValue,
    conflictReason: entry.conflictReason,
  };
}

/** Required distinct approvers by plan risk (mirrors DEFAULT_APPROVAL_POLICY). */
export function requiredApprovalsFor(risk: "low" | "medium" | "high"): number {
  return risk === "high" ? 2 : 1;
}

/** Status values that are safe to display as a repair plan status. */
export function isDisplayableStatus(status: string): status is RepairPlanStatusDTO {
  return [
    "draft",
    "pending_approval",
    "approved",
    "rejected",
    "executing",
    "completed",
    "partially_completed",
    "failed",
    "rolled_back",
  ].includes(status);
}
