/**
 * Pure repair-plan mapper tests (task T154).
 */
import { describe, it, expect } from "vitest";
import {
  toRepairChangeDTO,
  toPreviewEntryDTO,
  requiredApprovalsFor,
  isDisplayableStatus,
} from "../lib/server/adapters/repairs-mappers";

const change = {
  issueCode: "insecure_link_url",
  productExternalId: "p1",
  variantExternalId: null,
  field: "onlineStoreUrl",
  safetyClass: "automatic" as const,
  riskLevel: "low" as const,
  currentValue: "http://x",
  proposedValue: "https://x",
  requiresInput: false,
};

describe("toRepairChangeDTO", () => {
  it("drops riskLevel and keeps the UI-facing fields", () => {
    const dto = toRepairChangeDTO(change);
    expect(dto).toMatchObject({
      issueCode: "insecure_link_url",
      field: "onlineStoreUrl",
      safetyClass: "automatic",
      proposedValue: "https://x",
      requiresInput: false,
    });
    expect("riskLevel" in dto).toBe(false);
  });
});

describe("toPreviewEntryDTO", () => {
  it("maps a preview entry with its status and conflict reason", () => {
    const dto = toPreviewEntryDTO({
      change,
      status: "conflict",
      liveValue: "http://changed",
      conflictReason: "concurrent_edit",
    });
    expect(dto.status).toBe("conflict");
    expect(dto.conflictReason).toBe("concurrent_edit");
    expect(dto.change.field).toBe("onlineStoreUrl");
  });
});

describe("requiredApprovalsFor / isDisplayableStatus", () => {
  it("high risk needs two approvers, else one", () => {
    expect(requiredApprovalsFor("high")).toBe(2);
    expect(requiredApprovalsFor("low")).toBe(1);
  });
  it("validates displayable statuses", () => {
    expect(isDisplayableStatus("pending_approval")).toBe(true);
    expect(isDisplayableStatus("bogus")).toBe(false);
  });
});
