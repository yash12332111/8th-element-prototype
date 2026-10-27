import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { jaccard, matchPredictions, type GoldStandard, type EvalRunResult } from "../lib/eval/match";

const DISCLOSED_LIMITATION =
  "Transcripts and labels are synthetic and were written with AI assistance. The model under test is different from the one used to write them, but the numbers measure performance on this set only, not on real calls.";

describe("Phase 6 Exit Criteria Verification", () => {
  const goldPath = path.join(process.cwd(), "data", "eval", "gold.json");
  const resultsPath = path.join(process.cwd(), "data", "eval", "results.json");
  const transcriptsDir = path.join(process.cwd(), "data", "eval", "transcripts");

  it("Criterion 1 & Evaluation Dataset: 20 transcripts and gold standard properly partitioned", () => {
    expect(fs.existsSync(goldPath)).toBe(true);
    const gold: GoldStandard = JSON.parse(fs.readFileSync(goldPath, "utf-8"));

    const keys = Object.keys(gold);
    expect(keys.length).toBe(20);

    const devKeys = keys.filter((k) => gold[k].split === "dev");
    const testKeys = keys.filter((k) => gold[k].split === "test");

    // Exactly 5 dev and 15 test
    expect(devKeys.length).toBe(5);
    expect(testKeys.length).toBe(15);

    // Each transcript JSON exists
    for (const k of keys) {
      const tFile = path.join(transcriptsDir, `${k}.json`);
      expect(fs.existsSync(tFile)).toBe(true);
      expect(gold[k].commitments.length).toBeGreaterThanOrEqual(1);
      expect(gold[k].decoys.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("Criterion 1: results.json has at least one test run", () => {
    expect(fs.existsSync(resultsPath)).toBe(true);
    const runs: EvalRunResult[] = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    expect(Array.isArray(runs)).toBe(true);

    const testRun = runs.find((r) => r.split === "test");
    expect(testRun).toBeDefined();
    expect(testRun!.nTranscripts).toBe(15);
    expect(testRun!.model).toBe("openai/gpt-oss-120b");
    expect(testRun!.strict).toBe(true);
  });

  it("Criterion 2: The benchmark metrics show counts next to every rate", () => {
    const runs: EvalRunResult[] = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    const testRun = runs.find((r) => r.split === "test");
    expect(testRun).toBeDefined();

    // Precision has value, num, den
    expect(testRun!.precision.den).toBeGreaterThan(0);
    expect(testRun!.precision.num).toBeLessThanOrEqual(testRun!.precision.den);
    expect(testRun!.precision.value).toBe(Number((testRun!.precision.num / testRun!.precision.den).toFixed(4)));

    // Recall has value, num, den
    expect(testRun!.recall.den).toBeGreaterThan(0);
    expect(testRun!.recall.num).toBeLessThanOrEqual(testRun!.recall.den);
    expect(testRun!.recall.value).toBe(Number((testRun!.recall.num / testRun!.recall.den).toFixed(4)));

    // Ungrounded rate has value, num, den
    expect(testRun!.ungroundedRate.den).toBeGreaterThan(0);

    // Type accuracy has value, num, den
    expect(testRun!.typeAccuracy.den).toBeGreaterThan(0);

    // Decoy false-positive rate has value, num, den
    expect(testRun!.decoyFalsePositiveRate.den).toBeGreaterThan(0);
  });

  it("Criterion 3: Disclosed limitation text is exact", () => {
    expect(DISCLOSED_LIMITATION).toBe(
      "Transcripts and labels are synthetic and were written with AI assistance. The model under test is different from the one used to write them, but the numbers measure performance on this set only, not on real calls."
    );

    // Also check page content contains this limitation
    const pagePath = path.join(process.cwd(), "app", "eval", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    expect(pageContent).toContain(
      "Transcripts and labels are synthetic and were written with AI assistance. The model under test is different from the one used to write them, but the numbers measure performance on this set only, not on real calls."
    );
  });

  it("Criterion 4: Evaluation matching satisfies Section 3.8", () => {
    // Jaccard similarity test
    expect(jaccard("We can handle the CSV migration within thirty days", "we can handle the csv migration within thirty days")).toBe(1);
    expect(jaccard("apple", "orange")).toBe(0);

    // Greedy matching test
    const preds = [
      {
        lineId: "L2",
        quote: "SAML single sign-on will be live in two weeks",
        text: "SSO",
        type: "integration" as const,
        catalogItemId: "int_sso",
        dueText: "two weeks",
        dueDays: 14,
        confidence: 0.95,
        speakerId: "s1",
        timestamp: "00:01:00",
        flag: "green" as const,
        flagReason: "Standard",
        customerDependency: null,
        status: "committed" as const,
      },
    ];

    const golds = [
      {
        line_id: "L2",
        quote: "SAML single sign-on will be live in two weeks",
        type: "integration",
        catalog_item_id: "int_sso",
        due_days: 14,
      },
    ];

    const { matches } = matchPredictions(preds, golds);
    expect(matches.length).toBe(1);
    expect(matches[0].jaccard).toBe(1);
    expect(matches[0].typeMatch).toBe(true);
  });
});
