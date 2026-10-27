import { describe, it, expect } from "vitest";
import { canMove, checkContractGate, checkClosedWonGate, isLate } from "../lib/gates";
import type { Commitment, Deal } from "../lib/types";

function createMockCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c_test_1",
    dealId: "d_harbor",
    origin: "ai",
    transcriptId: "t_1",
    lineId: "L1",
    speakerId: "s1",
    timestamp: "00:01:00",
    quote: "We will deliver SSO in two weeks",
    text: "Single sign-on within 14 days",
    type: "integration",
    catalogItemId: "int_sso",
    dueText: "within two weeks",
    dueDays: 14,
    confidence: 0.95,
    flag: "green",
    flagReason: "Standard item within lead time",
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
    dueDate: null,
    customerDependency: null,
    delivery: "open",
    evidence: null,
    keptAt: null,
    csmVerified: false,
    breakCause: null,
    customerAcknowledged: false,
    ...overrides,
  };
}

const mockDeal: Deal = {
  id: "d_harbor",
  accountId: "a_harbor",
  accountName: "Harbor Logistics",
  aeName: "Priya Raman",
  implementationLead: "Sarah Chen",
  csmName: "Marcus Vance",
  arrUsd: 120000,
  stage: "proposal",
  closeDate: null,
  renewalDate: null,
  transcriptIds: ["t_1"],
};

describe("Gate checks (lib/gates.ts)", () => {
  it("blocks moving forward if skipping a stage", () => {
    // Attempting proposal -> closed_won directly (skipping contract)
    const res = canMove(mockDeal, "closed_won", []);
    expect(res.allowed).toBe(false);
    expect(res.blockers[0].reason).toBe("Stages move forward one step at a time.");
  });

  it("blocks contract gate when an unresolved amber flag exists", () => {
    const amberCommitment = createMockCommitment({
      flag: "amber",
      flagReason: "Promised in 21 days; standard lead time is 30 days.",
      approval: "pending",
    });
    const res = checkContractGate([amberCommitment]);
    expect(res.allowed).toBe(false);
    expect(res.blockers.length).toBe(1);
    expect(res.blockers[0].reason).toContain("Unresolved amber flag");
  });

  it("allows contract gate when amber item is approved", () => {
    const approvedAmber = createMockCommitment({
      flag: "amber",
      flagReason: "Promised in 21 days; standard lead time is 30 days.",
      approval: "approved",
    });
    const res = checkContractGate([approvedAmber]);
    expect(res.allowed).toBe(true);
    expect(res.blockers.length).toBe(0);
  });

  it("blocks contract gate if item is declined without walk-back", () => {
    const declinedItem = createMockCommitment({
      flag: "red",
      flagReason: "Not offered: Custom ERP connector.",
      approval: "declined",
      walkedBack: false,
    });
    const res = checkContractGate([declinedItem]);
    expect(res.allowed).toBe(false);
    expect(res.blockers.length).toBe(1);
  });

  it("allows contract gate if declined item has been walked back", () => {
    const walkedBackItem = createMockCommitment({
      flag: "red",
      flagReason: "Not offered: Custom ERP connector.",
      approval: "declined",
      walkedBack: true,
      approvalNote: "Walked back with customer Dan Ortiz",
    });
    const res = checkContractGate([walkedBackItem]);
    expect(res.allowed).toBe(true);
    expect(res.blockers.length).toBe(0);
  });

  it("ignores items marked not_commitment in contract gate", () => {
    const notCommitmentItem = createMockCommitment({
      flag: "red",
      flagReason: "Not offered",
      review: "not_commitment",
      notCommitmentReason: "Decoy question, not a promised scope",
      approval: "pending",
    });
    const res = checkContractGate([notCommitmentItem]);
    expect(res.allowed).toBe(true);
    expect(res.blockers.length).toBe(0);
  });

  it("blocks Closed-Won gate if any active item is still in proposed review status", () => {
    const proposedItem = createMockCommitment({
      review: "proposed",
      ownerRole: "implementation",
      approval: "not_needed",
    });
    const res = checkClosedWonGate([proposedItem]);
    expect(res.allowed).toBe(false);
    expect(res.blockers.some((b) => b.reason.includes("Not yet confirmed by the deal owner"))).toBe(true);
  });

  it("blocks Closed-Won gate if any confirmed item lacks an assigned owner", () => {
    const noOwnerItem = createMockCommitment({
      review: "confirmed",
      ownerRole: null,
      ownerName: null,
    });
    const res = checkClosedWonGate([noOwnerItem]);
    expect(res.allowed).toBe(false);
    expect(res.blockers.some((b) => b.reason.includes("No owner assigned"))).toBe(true);
  });

  it("identifies commitments created at contract stage or later as late", () => {
    expect(isLate("discovery")).toBe(false);
    expect(isLate("proposal")).toBe(false);
    expect(isLate("contract")).toBe(true);
    expect(isLate("closed_won")).toBe(true);
    expect(isLate("onboarding")).toBe(true);
    expect(isLate("renewal")).toBe(true);
  });
});
