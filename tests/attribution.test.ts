import { describe, it, expect } from "vitest";
import { attribute, ATTRIBUTION_REASON } from "../lib/attribution";
import type { Commitment } from "../lib/types";

function mockCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c_attr_1",
    dealId: "d_northgate",
    origin: "ai",
    transcriptId: "t_1",
    lineId: "L1",
    speakerId: "s1",
    timestamp: "00:01:00",
    quote: "Quote",
    text: "Promise text",
    type: "integration",
    catalogItemId: "int_sso",
    dueText: "two weeks",
    dueDays: 14,
    confidence: 0.95,
    flag: "green",
    flagReason: "Standard item",
    late: false,
    createdAtStage: "proposal",
    review: "confirmed",
    notCommitmentReason: null,
    versions: [],
    approval: "not_needed",
    approvalNote: null,
    walkedBack: false,
    ownerRole: "implementation",
    ownerName: "Sarah Chen",
    dueDate: "2026-10-01",
    customerDependency: null,
    delivery: "broken",
    evidence: null,
    keptAt: null,
    csmVerified: false,
    breakCause: "vendor",
    customerAcknowledged: false,
    ...overrides,
  };
}

describe("Attribution logic (lib/attribution.ts)", () => {
  it("returns null when delivery status is not broken", () => {
    const c = mockCommitment({ delivery: "kept" });
    expect(attribute(c)).toBeNull();

    const c2 = mockCommitment({ delivery: "open" });
    expect(attribute(c2)).toBeNull();

    const c3 = mockCommitment({ delivery: "at_risk" });
    expect(attribute(c3)).toBeNull();
  });

  it("attributes to customer when breakCause is customer_dependency and dependency is set", () => {
    const c = mockCommitment({
      delivery: "broken",
      breakCause: "customer_dependency",
      customerDependency: {
        text: "Customer provides CSV export",
        quote: "We'll send the export",
        dueDays: 7,
      },
    });
    expect(attribute(c)).toBe("customer");
  });

  it("does not attribute to customer when breakCause is customer_dependency but customerDependency is missing", () => {
    const c = mockCommitment({
      delivery: "broken",
      breakCause: "customer_dependency",
      customerDependency: null,
      flag: "green",
    });
    expect(attribute(c)).not.toBe("customer");
    expect(attribute(c)).toBe("delivery");
  });

  it("attributes off_record items to sales", () => {
    const c = mockCommitment({
      delivery: "broken",
      origin: "off_record",
      flag: "red",
      approval: "approved", // Even if approved later, off-record origins attribute to sales
    });
    expect(attribute(c)).toBe("sales");
  });

  it("attributes unapproved amber flag to sales", () => {
    const c = mockCommitment({
      delivery: "broken",
      flag: "amber",
      approval: "pending", // Unapproved!
    });
    expect(attribute(c)).toBe("sales");
  });

  it("attributes approved amber item (not late) to delivery", () => {
    const c = mockCommitment({
      delivery: "broken",
      flag: "amber",
      approval: "approved",
      late: false,
      breakCause: "vendor",
    });
    expect(attribute(c)).toBe("delivery");
  });

  it("attributes late plus flagged commitment to sales", () => {
    const c = mockCommitment({
      delivery: "broken",
      flag: "amber",
      approval: "approved",
      late: true, // Created late at contract stage or later!
      breakCause: "vendor",
    });
    expect(attribute(c)).toBe("sales");
  });

  it("attributes safe standard green item to delivery", () => {
    const c = mockCommitment({
      delivery: "broken",
      flag: "green",
      approval: "not_needed",
      late: false,
      breakCause: "vendor",
    });
    expect(attribute(c)).toBe("delivery");
  });

  it("provides human-readable explanations in ATTRIBUTION_REASON", () => {
    expect(ATTRIBUTION_REASON.sales).toBe("Made against an unapproved or late flag, or never recorded (off-record).");
    expect(ATTRIBUTION_REASON.delivery).toBe("Safe or approved promise that broke for a vendor-side reason.");
    expect(ATTRIBUTION_REASON.customer).toBe("Broke because the customer missed a recorded dependency.");
  });
});
