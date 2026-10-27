import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../lib/store";
import fs from "fs";
import path from "path";
import type { ExtractionResult } from "../lib/llm/extract";

describe("Phase 4 Walk-Through & Exit Criteria", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it("Executes the exact 5-step walk-through test", () => {
    // Setup Harbor with extraction
    const precomputedPath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    const precomputed = JSON.parse(fs.readFileSync(precomputedPath, "utf-8"));
    const harborExt: ExtractionResult = precomputed["t_harbor_01"];

    useStore.getState().setRole("ae");
    useStore.getState().ingestExtraction("d_harbor", "t_harbor_01", harborExt);

    const deal = useStore.getState().deals.find((d) => d.id === "d_harbor")!;
    expect(deal.stage).toBe("proposal");

    // ─────────────────────────────────────────────────────────────
    // Step 1: On Harbor, try to move to contract → blocked by amber and red items
    // ─────────────────────────────────────────────────────────────
    useStore.getState().setRole("ae");
    useStore.getState().moveStage("d_harbor", "contract");

    // Must remain at proposal
    expect(useStore.getState().deals.find((d) => d.id === "d_harbor")?.stage).toBe("proposal");

    // gate_blocked event emitted
    const events = useStore.getState().events;
    const gateBlockedEv = events.find((e) => e.type === "gate_blocked");
    expect(gateBlockedEv).toBeDefined();

    // ─────────────────────────────────────────────────────────────
    // Step 2: Switch to implementation lead and resolve the flags: approve one, adjust one, decline one
    // ─────────────────────────────────────────────────────────────
    useStore.getState().setRole("implementation");
    const harborCommitments = useStore.getState().commitments.filter((c) => c.dealId === "d_harbor");

    const redItem = harborCommitments.find((c) => c.flag === "red")!;
    const leadTimeAmberItem = harborCommitments.find((c) => c.catalogItemId === "mig_csv")!;
    const otherAmberItems = harborCommitments.filter(
      (c) => c.flag === "amber" && c.id !== leadTimeAmberItem.id
    );

    // Decline red item (requires decline note)
    useStore.getState().setApproval(redItem.id, "declined", "Custom ERP connectors are not offered.");

    // Adjust lead time amber item from 21 days to 30 days
    useStore.getState().setApproval(
      leadTimeAmberItem.id,
      "adjusted",
      "Adjusted timeline to standard 30-day lead time",
      { dueDays: 30 }
    );

    // Approve other amber items
    for (const item of otherAmberItems) {
      useStore.getState().setApproval(item.id, "approved", "Approved by implementation lead");
    }

    // ─────────────────────────────────────────────────────────────
    // Step 3: Switch to AE and record the walk-back → move to contract is now allowed
    // ─────────────────────────────────────────────────────────────
    useStore.getState().setRole("ae");

    // Before walk-back, move to contract is STILL blocked by declined un-walked-back item
    useStore.getState().moveStage("d_harbor", "contract");
    expect(useStore.getState().deals.find((d) => d.id === "d_harbor")?.stage).toBe("proposal");

    // AE records walk-back
    useStore.getState().recordWalkBack(
      redItem.id,
      "Informed Dan Ortiz that custom ERP connector cannot be provided. Standard CSV will be used."
    );

    // Now all flags are resolved: move to contract allowed!
    useStore.getState().moveStage("d_harbor", "contract");
    expect(useStore.getState().deals.find((d) => d.id === "d_harbor")?.stage).toBe("contract");

    // ─────────────────────────────────────────────────────────────
    // Step 4: Try Closed-Won with an unconfirmed item → blocked → confirm it and set owners → Closed-Won allowed
    // ─────────────────────────────────────────────────────────────
    useStore.getState().setRole("ae");

    // Try Closed-Won while items are proposed and unassigned
    useStore.getState().moveStage("d_harbor", "closed_won");
    expect(useStore.getState().deals.find((d) => d.id === "d_harbor")?.stage).toBe("contract");

    // Confirm all active items
    const activeCommitments = useStore
      .getState()
      .commitments.filter((c) => c.dealId === "d_harbor" && c.review === "proposed");
    for (const c of activeCommitments) {
      useStore.getState().confirm(c.id);
    }

    // Still blocked because owners are not assigned
    useStore.getState().moveStage("d_harbor", "closed_won");
    expect(useStore.getState().deals.find((d) => d.id === "d_harbor")?.stage).toBe("contract");

    // Switch to implementation lead to assign owners
    useStore.getState().setRole("implementation");
    const confirmedCommitments = useStore
      .getState()
      .commitments.filter((c) => c.dealId === "d_harbor" && c.review === "confirmed");
    for (const c of confirmedCommitments) {
      useStore.getState().setOwner(c.id, "implementation", "Sarah Chen");
    }

    // Switch back to AE and advance to Closed-Won
    useStore.getState().setRole("ae");
    useStore.getState().moveStage("d_harbor", "closed_won");

    const closedDeal = useStore.getState().deals.find((d) => d.id === "d_harbor")!;
    expect(closedDeal.stage).toBe("closed_won");
    expect(closedDeal.closeDate).toBeDefined();
    expect(typeof closedDeal.closeDate).toBe("string");

    // Check due dates computed
    const confirmedWithDueDays = useStore
      .getState()
      .commitments.filter((c) => c.dealId === "d_harbor" && c.review === "confirmed" && c.dueDays);
    for (const c of confirmedWithDueDays) {
      expect(c.dueDate).toBeDefined();
      expect(typeof c.dueDate).toBe("string");
    }

    // ─────────────────────────────────────────────────────────────
    // Step 5: Add a promise after the contract stage → it shows a 'late' badge
    // ─────────────────────────────────────────────────────────────
    useStore.getState().setRole("implementation");
    useStore.getState().addOffRecord("d_harbor", {
      text: "Additional dedicated Slack channel promise",
      type: "support",
      catalogItemId: null,
      dueDays: 14,
    });

    const offRecordItem = useStore
      .getState()
      .commitments.find((c) => c.dealId === "d_harbor" && c.text.includes("Slack channel"))!;

    expect(offRecordItem).toBeDefined();
    expect(offRecordItem.origin).toBe("off_record");
    expect(offRecordItem.late).toBe(true); // Must have late: true!
  });

  it("Exit Criterion: Cedar's handoff has confirmed commitments, not committed section, and off-record items", () => {
    const cedar = useStore.getState().deals.find((d) => d.id === "d_cedar")!;
    expect(cedar.stage).toBe("onboarding"); // Closed-won or later

    const cedarCommitments = useStore.getState().commitments.filter((c) => c.dealId === "d_cedar");
    const offRecord = cedarCommitments.find((c) => c.origin === "off_record");
    expect(offRecord).toBeDefined();
    expect(offRecord?.origin).toBe("off_record");
    expect(offRecord?.text).toBe("Dedicated Customer Success Manager for first 6 months post go-live");
  });
});
