import { describe, it, expect } from "vitest";
import { jaccard, matchPredictions, type GoldCommitment } from "../lib/eval/match";
import type { CandidateCommitment } from "../lib/llm/extract";

describe("Evaluation Matching (lib/eval/match.ts)", () => {
  describe("Jaccard similarity", () => {
    it("identical strings return 1", () => {
      expect(jaccard("SAML single sign-on live within two weeks", "SAML single sign-on live within two weeks")).toBe(1);
      expect(jaccard("“SAML single sign-on”", "saml single sign-on.")).toBe(1);
    });

    it("disjoint strings return 0", () => {
      expect(jaccard("apple banana orange", "cat dog elephant")).toBe(0);
    });

    it("partial overlap computes correct word-set Jaccard", () => {
      // Set A: {saml, single, sign-on} (size 3)
      // Set B: {single, sign-on, guaranteed} (size 3)
      // Intersection: {single, sign-on} (size 2)
      // Union: {saml, single, sign-on, guaranteed} (size 4)
      // Jaccard: 2 / 4 = 0.5
      expect(jaccard("SAML single sign-on", "single sign-on guaranteed")).toBe(0.5);
    });

    it("handles empty strings", () => {
      expect(jaccard("", "")).toBe(1);
      expect(jaccard("something", "")).toBe(0);
    });
  });

  describe("Greedy one-to-one matching", () => {
    it("two predictions on the same line, one gold -> exactly one match (highest similarity wins)", () => {
      const preds: CandidateCommitment[] = [
        {
          lineId: "L4",
          quote: "We can handle the CSV migration within thirty days",
          text: "CSV migration in 30 days",
          type: "data_migration",
          catalogItemId: "mig_csv",
          dueText: "thirty days",
          dueDays: 30,
          confidence: 0.9,
          speakerId: "s1",
          timestamp: "00:02:00",
          flag: "green",
          flagReason: "Standard",
          customerDependency: null,
          status: "committed",
        },
        {
          lineId: "L4",
          quote: "We can handle the CSV migration within thirty days of signature perfectly", // lower similarity to gold
          text: "CSV migration in 30 days",
          type: "data_migration",
          catalogItemId: "mig_csv",
          dueText: "thirty days",
          dueDays: 30,
          confidence: 0.8,
          speakerId: "s1",
          timestamp: "00:02:00",
          flag: "green",
          flagReason: "Standard",
          customerDependency: null,
          status: "committed",
        },
      ];

      const golds: GoldCommitment[] = [
        {
          line_id: "L4",
          quote: "We can handle the CSV migration within thirty days",
          type: "data_migration",
          catalog_item_id: "mig_csv",
          due_days: 30,
        },
      ];

      const { matches, unmatchedPredIndices, unmatchedGoldIndices } = matchPredictions(preds, golds);

      // Exactly one match
      expect(matches.length).toBe(1);
      expect(matches[0].predIndex).toBe(0);
      expect(matches[0].goldIndex).toBe(0);
      expect(matches[0].jaccard).toBe(1);
      expect(matches[0].typeMatch).toBe(true);

      // The other prediction remains unmatched
      expect(unmatchedPredIndices).toEqual([1]);
      // Gold was claimed, so no unmatched gold
      expect(unmatchedGoldIndices).toEqual([]);
    });

    it("rejects matching if line_id differs even with identical text", () => {
      const preds: CandidateCommitment[] = [
        {
          lineId: "L2",
          quote: "SAML SSO will be live in 10 days",
          text: "SSO in 10 days",
          type: "integration",
          catalogItemId: "int_sso",
          dueText: "10 days",
          dueDays: 10,
          confidence: 0.95,
          speakerId: "s1",
          timestamp: "00:01:00",
          flag: "green",
          flagReason: "Standard",
          customerDependency: null,
          status: "committed",
        },
      ];

      const golds: GoldCommitment[] = [
        {
          line_id: "L5", // Different line!
          quote: "SAML SSO will be live in 10 days",
          type: "integration",
          catalog_item_id: "int_sso",
          due_days: 10,
        },
      ];

      const { matches, unmatchedPredIndices, unmatchedGoldIndices } = matchPredictions(preds, golds);
      expect(matches.length).toBe(0);
      expect(unmatchedPredIndices).toEqual([0]);
      expect(unmatchedGoldIndices).toEqual([0]);
    });

    it("rejects matching if similarity is below 0.5 threshold", () => {
      const preds: CandidateCommitment[] = [
        {
          lineId: "L3",
          quote: "completely different sentence about training admin staff",
          text: "Admin training",
          type: "training",
          catalogItemId: "trn_admin",
          dueText: null,
          dueDays: null,
          confidence: 0.8,
          speakerId: "s1",
          timestamp: "00:01:30",
          flag: "green",
          flagReason: "Standard",
          customerDependency: null,
          status: "committed",
        },
      ];

      const golds: GoldCommitment[] = [
        {
          line_id: "L3",
          quote: "we will configure five custom dashboards",
          type: "configuration",
          catalog_item_id: "cfg_workflows",
          due_days: null,
        },
      ];

      const { matches } = matchPredictions(preds, golds);
      expect(matches.length).toBe(0);
    });
  });
});
