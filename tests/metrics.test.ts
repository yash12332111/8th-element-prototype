import { describe, it, expect } from "vitest";
import {
  calculateOnTimeKeptRate,
  calculateAttributedBreaks,
  calculateGamingSignal,
  formatRatio,
} from "../lib/metrics";
import type { Commitment, Deal } from "../lib/types";
import seedData from "../data/seed-state.json";
import dealsData from "../data/deals.json";

function mockCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c_metric_1",
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
    dueDate: "2026-09-01", // in the past relative to today
    customerDependency: null,
    delivery: "kept",
    evidence: {
      kind: "task_link",
      reference: "https://linear.app/task/101",
      addedAt: "2026-08-30T10:00:00Z",
    },
    keptAt: "2026-08-30T10:00:00Z",
    csmVerified: true,
    breakCause: null,
    customerAcknowledged: true,
    ...overrides,
  };
}

const mockDeals: Deal[] = [
  {
    id: "d_northgate",
    accountId: "a_northgate",
    accountName: "Northgate Retail",
    aeName: "Jordan Tse",
    implementationLead: "Sarah Chen",
    csmName: "Marcus Vance",
    arrUsd: 180000,
    stage: "renewal",
    closeDate: "2026-07-01",
    renewalDate: "2027-07-01",
    transcriptIds: ["t_northgate_01"],
  },
];

describe("Metrics calculation (lib/metrics.ts)", () => {
  it("excludes kept items when evidence is missing", () => {
    // Kept status, but evidence is null
    const noEvidence = mockCommitment({
      id: "c_1",
      delivery: "kept",
      evidence: null,
      keptAt: "2026-08-30T10:00:00Z",
      dueDate: "2026-09-01",
    });

    const res = calculateOnTimeKeptRate(mockDeals, [noEvidence], "2026-10-01");
    // Denominator = 1 (due on 2026-09-01 <= 2026-10-01), Numerator = 0 (missing evidence)
    expect(res.den).toBe(1);
    expect(res.num).toBe(0);
    expect(res.value).toBe(0);
  });

  it("excludes items that are not yet due", () => {
    // Due in future (2026-11-01 > today 2026-10-01)
    const futureDue = mockCommitment({
      id: "c_2",
      delivery: "open",
      dueDate: "2026-11-01",
    });

    const res = calculateOnTimeKeptRate(mockDeals, [futureDue], "2026-10-01");
    // Excluded from denominator because dueDate > today
    expect(res.den).toBe(0);
    expect(res.formatted).toBe("n/a (no data)");
    expect(res.value).toBeNull();
  });

  it("displays n/a (no data) when denominator is 0", () => {
    const formatted = formatRatio(0, 0);
    expect(formatted.formatted).toBe("n/a (no data)");
    expect(formatted.value).toBeNull();
  });

  it("calculates gaming signal accurately", () => {
    const c1 = mockCommitment({ id: "c1", origin: "ai", review: "not_commitment" });
    const c2 = mockCommitment({ id: "c2", origin: "ai", review: "confirmed" });
    const c3 = mockCommitment({ id: "c3", origin: "manual", review: "confirmed" });

    const signal = calculateGamingSignal([c1, c2, c3]);
    expect(signal.num).toBe(1);
    expect(signal.den).toBe(2); // Only AI items
    expect(signal.formatted).toBe("50% (1 / 2)");
  });

  it("Exit Criterion: Northgate seed shows exactly 1 sales, 1 delivery, and 1 customer break", () => {
    const commitments = seedData.commitments as Commitment[];
    const deals = dealsData as Deal[];

    const northgateBreaks = calculateAttributedBreaks(deals, commitments, "d_northgate");

    expect(northgateBreaks.sales).toBe(1);
    expect(northgateBreaks.delivery).toBe(1);
    expect(northgateBreaks.customer).toBe(1);
  });
});
