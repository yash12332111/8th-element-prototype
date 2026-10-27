import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../lib/store";
import { attribute, ATTRIBUTION_REASON } from "../lib/attribution";
import {
  calculateOnTimeKeptRate,
  calculateAccountKeptRate,
  calculateAttributedBreaks,
  calculateGamingSignal,
  calculateContractStageResolution,
  calculateKickoffSurprises,
  calculateKeptRateByType,
  formatRatio,
} from "../lib/metrics";

describe("Phase 5 Exit Criteria Verification", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it("Criterion 1: Northgate account shows exactly one sales, one delivery, and one customer break, each with reason text", () => {
    const { deals, commitments } = useStore.getState();
    const northgateDeal = deals.find((d) => d.id === "d_northgate");
    expect(northgateDeal).toBeDefined();

    const northgateCommitments = commitments.filter((c) => c.dealId === "d_northgate");
    const brokenCommitments = northgateCommitments.filter((c) => c.delivery === "broken");

    expect(brokenCommitments.length).toBe(3);

    const attributed = brokenCommitments.map((c) => ({
      id: c.id,
      text: c.text,
      attr: attribute(c),
      reason: attribute(c) ? ATTRIBUTION_REASON[attribute(c)!] : null,
    }));

    const salesBreaks = attributed.filter((item) => item.attr === "sales");
    const deliveryBreaks = attributed.filter((item) => item.attr === "delivery");
    const customerBreaks = attributed.filter((item) => item.attr === "customer");

    // Exactly one of each attribution
    expect(salesBreaks.length).toBe(1);
    expect(deliveryBreaks.length).toBe(1);
    expect(customerBreaks.length).toBe(1);

    // Each has the exact reason text
    expect(salesBreaks[0].reason).toBe(
      "Made against an unapproved or late flag, or never recorded (off-record)."
    );
    expect(deliveryBreaks[0].reason).toBe(
      "Safe or approved promise that broke for a vendor-side reason."
    );
    expect(customerBreaks[0].reason).toBe(
      "Broke because the customer missed a recorded dependency."
    );

    // Also verify via calculateAttributedBreaks helper
    const counts = calculateAttributedBreaks(deals, commitments, "d_northgate");
    expect(counts).toEqual({
      sales: 1,
      delivery: 1,
      customer: 1,
    });
  });

  it("Criterion 2: Marking kept without evidence is impossible", () => {
    const store = useStore.getState();
    store.setRole("implementation");

    // Pick an open commitment without evidence
    const { commitments } = useStore.getState();
    const openCommitment = commitments.find(
      (c) => c.dealId === "d_cedar" && c.delivery === "open" && c.evidence === null
    );
    expect(openCommitment).toBeDefined();

    // Attempting to setDelivery to "kept" without evidence must be rejected
    useStore.getState().setDelivery(openCommitment!.id, "kept");

    // Delivery status must NOT have changed to kept
    const updated = useStore.getState().commitments.find((c) => c.id === openCommitment!.id);
    expect(updated?.delivery).not.toBe("kept");
    expect(updated?.delivery).toBe("open");
    expect(updated?.keptAt).toBeNull();

    // Now attach evidence
    useStore.getState().addEvidence(openCommitment!.id, {
      kind: "task_link",
      reference: "https://tasks.brightpath.internal/CED-101",
      addedAt: new Date().toISOString(),
    });

    // Now setting delivery to kept succeeds
    useStore.getState().setDelivery(openCommitment!.id, "kept");
    const keptSuccess = useStore.getState().commitments.find((c) => c.id === openCommitment!.id);
    expect(keptSuccess?.delivery).toBe("kept");
    expect(keptSuccess?.keptAt).not.toBeNull();
  });

  it("Criterion 3: customer_dependency break cause is disabled/rejected when no dependency is set", () => {
    const store = useStore.getState();
    store.setRole("implementation");

    // Find a commitment that has NO customerDependency
    const { commitments } = useStore.getState();
    const noDepCommitment = commitments.find(
      (c) => c.customerDependency === null && c.delivery !== "broken"
    );
    expect(noDepCommitment).toBeDefined();

    // Attempting to recordBreak with "customer_dependency" must be rejected
    useStore.getState().recordBreak(noDepCommitment!.id, "customer_dependency");

    const unchanged = useStore.getState().commitments.find((c) => c.id === noDepCommitment!.id);
    expect(unchanged?.delivery).not.toBe("broken");
    expect(unchanged?.breakCause).toBeNull();

    // But recording break with "vendor" succeeds
    useStore.getState().recordBreak(noDepCommitment!.id, "vendor");
    const broken = useStore.getState().commitments.find((c) => c.id === noDepCommitment!.id);
    expect(broken?.delivery).toBe("broken");
    expect(broken?.breakCause).toBe("vendor");
  });

  it("Criterion 4: Every metric shows its numerator and denominator on screen (never only a percentage)", () => {
    const { deals, commitments } = useStore.getState();

    // When denominator > 0, formatted contains `${num} / ${den}`
    const onTime = calculateOnTimeKeptRate(deals, commitments);
    expect(onTime.den).toBeGreaterThan(0);
    expect(onTime.formatted).toContain(`${onTime.num} / ${onTime.den}`);
    expect(onTime.num).toBeDefined();
    expect(onTime.den).toBeDefined();

    const surprises = calculateKickoffSurprises(deals, commitments);
    expect(surprises.den).toBeGreaterThan(0);
    expect(surprises.formatted).toContain(`${surprises.num} / ${surprises.den}`);

    const gaming = calculateGamingSignal(commitments);
    expect(gaming.den).toBeGreaterThan(0);
    expect(gaming.formatted).toContain(`${gaming.num} / ${gaming.den}`);

    const accountRate = calculateAccountKeptRate("d_northgate", commitments);
    expect(accountRate.den).toBeGreaterThan(0);
    expect(accountRate.formatted).toContain(`${accountRate.num} / ${accountRate.den}`);

    // Direct ratio testing: never only a percentage
    const customRatio = formatRatio(7, 10);
    expect(customRatio.formatted).toBe("70% (7 / 10)");
    expect(customRatio.formatted).toContain("7 / 10");
  });

  it("Criterion 5: A zero denominator shows 'n/a (no data)'", () => {
    const zeroRatio = formatRatio(0, 0);
    expect(zeroRatio.value).toBeNull();
    expect(zeroRatio.formatted).toBe("n/a (no data)");

    // Test with a deal that has no due commitments (e.g. d_harbor which is in proposal)
    const { commitments } = useStore.getState();
    const harborRate = calculateAccountKeptRate("d_harbor", commitments);
    expect(harborRate.den).toBe(0);
    expect(harborRate.value).toBeNull();
    expect(harborRate.formatted).toBe("n/a (no data)");
  });
});
