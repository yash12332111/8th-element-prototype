import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../lib/store";
import fs from "fs";
import path from "path";
import type { ExtractionResult } from "../lib/llm/extract";

describe("Phase 3 Exit Criteria", () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it("Criterion 1: Harbor shows at least one each of green, amber and red, with reasons that match 3.3 word for word", () => {
    const precomputedPath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    const precomputed = JSON.parse(fs.readFileSync(precomputedPath, "utf-8"));
    const harborExtraction: ExtractionResult = precomputed["t_harbor_01"];

    useStore.getState().setRole("ae");
    useStore.getState().ingestExtraction("d_harbor", "t_harbor_01", harborExtraction);

    const harborCommitments = useStore.getState().commitments.filter((c) => c.dealId === "d_harbor");

    const green = harborCommitments.find((c) => c.flag === "green");
    const amber = harborCommitments.find((c) => c.flag === "amber");
    const red = harborCommitments.find((c) => c.flag === "red");

    expect(green).toBeDefined();
    expect(amber).toBeDefined();
    expect(red).toBeDefined();

    // Check exact reason matches from section 3.3
    expect(green?.flagReason).toBe("Standard item within lead time: Single sign-on (SAML).");
    expect(amber?.flagReason).toBe("Promised in 21 days; standard lead time is 30 days.");
    expect(red?.flagReason).toBe("Not offered: Custom ERP connector.");
  });

  it("Criterion 2: Marking an item 'not a commitment' keeps it visible and stores reason", () => {
    const precomputedPath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    const precomputed = JSON.parse(fs.readFileSync(precomputedPath, "utf-8"));
    useStore.getState().setRole("ae");
    useStore.getState().ingestExtraction("d_harbor", "t_harbor_01", precomputed["t_harbor_01"]);

    const commitment = useStore.getState().commitments.find((c) => c.dealId === "d_harbor")!;
    const initialCount = useStore.getState().commitments.length;

    useStore.getState().markNotCommitment(commitment.id, "Customer was asking about roadmap, not a signed commitment");

    const updated = useStore.getState().commitments.find((c) => c.id === commitment.id)!;
    expect(updated).toBeDefined();
    expect(useStore.getState().commitments.length).toBe(initialCount); // Still in the list!
    expect(updated.review).toBe("not_commitment");
    expect(updated.notCommitmentReason).toBe("Customer was asking about roadmap, not a signed commitment");
  });

  it("Criterion 3: Editing keeps v1 in History", () => {
    const precomputedPath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    const precomputed = JSON.parse(fs.readFileSync(precomputedPath, "utf-8"));
    useStore.getState().setRole("ae");
    useStore.getState().ingestExtraction("d_harbor", "t_harbor_01", precomputed["t_harbor_01"]);

    const commitment = useStore.getState().commitments.find((c) => c.dealId === "d_harbor")!;
    const originalText = commitment.text;
    expect(commitment.versions.length).toBe(1);
    expect(commitment.versions[0].text).toBe(originalText);

    // Edit commitment
    useStore.getState().edit(commitment.id, {
      text: "Updated deliverable summary text",
      dueDays: 25,
    });

    const updated = useStore.getState().commitments.find((c) => c.id === commitment.id)!;
    expect(updated.text).toBe("Updated deliverable summary text");
    expect(updated.dueDays).toBe(25);
    expect(updated.versions.length).toBe(2);

    // v1 is preserved exactly
    expect(updated.versions[0].text).toBe(originalText);
    expect(updated.versions[0].editedBy).toBe("ai");

    // v2 reflects the edit
    expect(updated.versions[1].text).toBe("Updated deliverable summary text");
    expect(updated.versions[1].dueDays).toBe(25);
    expect(updated.versions[1].editedBy).toBe("ae");
  });

  it("Criterion 4: Approving a red item without a note is impossible", () => {
    const precomputedPath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    const precomputed = JSON.parse(fs.readFileSync(precomputedPath, "utf-8"));
    useStore.getState().setRole("ae");
    useStore.getState().ingestExtraction("d_harbor", "t_harbor_01", precomputed["t_harbor_01"]);

    const redItem = useStore.getState().commitments.find((c) => c.dealId === "d_harbor" && c.flag === "red")!;
    expect(redItem.approval).toBe("pending");

    // Switch to implementation lead
    useStore.getState().setRole("implementation");

    // Attempt approve with empty string or no note -> rejected
    useStore.getState().setApproval(redItem.id, "approved", "");
    expect(useStore.getState().commitments.find((c) => c.id === redItem.id)?.approval).toBe("pending");

    useStore.getState().setApproval(redItem.id, "approved", "   ");
    expect(useStore.getState().commitments.find((c) => c.id === redItem.id)?.approval).toBe("pending");

    // Approve with formal exception note -> succeeds
    useStore.getState().setApproval(redItem.id, "approved", "Approved exception by VP Engineering; budgeted in Q4");
    const approvedItem = useStore.getState().commitments.find((c) => c.id === redItem.id)!;
    expect(approvedItem.approval).toBe("approved");
    expect(approvedItem.approvalNote).toBe("Approved exception by VP Engineering; budgeted in Q4");
  });

  it("Criterion 5: A declined item shows 'Walk-back required' to the AE until walked back", () => {
    const precomputedPath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    const precomputed = JSON.parse(fs.readFileSync(precomputedPath, "utf-8"));
    useStore.getState().setRole("ae");
    useStore.getState().ingestExtraction("d_harbor", "t_harbor_01", precomputed["t_harbor_01"]);

    const item = useStore.getState().commitments.find((c) => c.dealId === "d_harbor" && c.flag === "red")!;

    // Implementation lead declines
    useStore.getState().setRole("implementation");
    useStore.getState().setApproval(item.id, "declined", "We do not offer custom connectors");

    const declinedItem = useStore.getState().commitments.find((c) => c.id === item.id)!;
    expect(declinedItem.approval).toBe("declined");
    expect(declinedItem.walkedBack).toBe(false); // Walk-back required!

    // AE records walk-back
    useStore.getState().setRole("ae");
    useStore.getState().recordWalkBack(item.id, "Informed Dan Ortiz that custom ERP connector cannot be provided");

    const walkedBackItem = useStore.getState().commitments.find((c) => c.id === item.id)!;
    expect(walkedBackItem.walkedBack).toBe(true);
    expect(walkedBackItem.approvalNote).toBe("Informed Dan Ortiz that custom ERP connector cannot be provided");
  });
});
