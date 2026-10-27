import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { extractCommitments, type ExtractionResult } from "../lib/llm/extract";
import { evaluateRun, type GoldStandard, type EvalRunResult } from "../lib/eval/match";
import type { Transcript, CatalogItem } from "../lib/types";
import catalogData from "../data/catalog.json";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const splitArgIndex = args.indexOf("--split");
  let split: "dev" | "test" = "test";
  if (splitArgIndex !== -1 && args[splitArgIndex + 1]) {
    const val = args[splitArgIndex + 1].toLowerCase();
    if (val === "dev" || val === "test") {
      split = val;
    }
  }

  console.log(`\n========================================`);
  console.log(`Kept AI Evaluation Runner`);
  console.log(`Split: ${split.toUpperCase()}`);
  console.log(`========================================\n`);

  const goldPath = path.join(process.cwd(), "data", "eval", "gold.json");
  if (!fs.existsSync(goldPath)) {
    throw new Error(`Gold standard file not found at ${goldPath}`);
  }

  const gold: GoldStandard = JSON.parse(fs.readFileSync(goldPath, "utf-8"));
  const targetIds = Object.keys(gold).filter((id) => gold[id].split === split);

  console.log(`Loaded gold standard: ${targetIds.length} transcripts in ${split} split`);

  const catalog = catalogData as CatalogItem[];
  const extractions: Record<string, ExtractionResult> = {};
  const transcriptsDir = path.join(process.cwd(), "data", "eval", "transcripts");

  for (let i = 0; i < targetIds.length; i++) {
    const id = targetIds[i];
    const tPath = path.join(transcriptsDir, `${id}.json`);
    if (!fs.existsSync(tPath)) {
      console.warn(`Warning: transcript file not found for ${id} at ${tPath}`);
      continue;
    }

    const transcript: Transcript = JSON.parse(fs.readFileSync(tPath, "utf-8"));
    console.log(`[${i + 1}/${targetIds.length}] Extracting from ${id} (${transcript.title})...`);

    try {
      const ext = await extractCommitments(transcript, catalog);
      extractions[id] = ext;
      console.log(`  ✓ ${ext.candidates.length} candidates, ${ext.discussed.length} discussed, ${ext.dependencies.length} deps, ${ext.dropped.length} dropped (${ext.latencyMs}ms)`);
    } catch (err) {
      console.error(`  ✗ Failed extraction for ${id}:`, err);
      throw err;
    }

    if (i < targetIds.length - 1) {
      // 1.5 s pause to strictly respect Groq rate limits (Section 8 Step 3)
      await sleep(1500);
    }
  }

  console.log(`\nComputing evaluation metrics against gold standard...`);
  const runResult = evaluateRun(extractions, gold, split);

  const resultsPath = path.join(process.cwd(), "data", "eval", "results.json");
  let history: EvalRunResult[] = [];
  if (fs.existsSync(resultsPath)) {
    try {
      history = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
  }

  // Append run object (Section 8 Step 3)
  history.push(runResult);
  fs.writeFileSync(resultsPath, JSON.stringify(history, null, 2), "utf-8");

  console.log(`\n========================================`);
  console.log(`EVALUATION RESULTS (${split.toUpperCase()} SPLIT)`);
  console.log(`========================================`);
  console.log(`Model:           ${runResult.model}`);
  console.log(`Strict Mode:     ${runResult.strict}`);
  console.log(`Prompt Version:  ${runResult.promptVersion}`);
  console.log(`Transcripts:     ${runResult.nTranscripts}`);
  console.log(`Gold Promises:   ${runResult.nGold}`);
  console.log(`Gold Decoys:     ${runResult.nDecoys}`);
  console.log(`----------------------------------------`);
  console.log(`Precision:       ${runResult.precision.value} (${runResult.precision.num} / ${runResult.precision.den})`);
  console.log(`Recall:          ${runResult.recall.value} (${runResult.recall.num} / ${runResult.recall.den})`);
  console.log(`Ungrounded Rate: ${runResult.ungroundedRate.value} (${runResult.ungroundedRate.num} / ${runResult.ungroundedRate.den})`);
  console.log(`Type Accuracy:   ${runResult.typeAccuracy.value} (${runResult.typeAccuracy.num} / ${runResult.typeAccuracy.den})`);
  console.log(`Decoy FP Rate:   ${runResult.decoyFalsePositiveRate.value} (${runResult.decoyFalsePositiveRate.num} / ${runResult.decoyFalsePositiveRate.den})`);
  console.log(`========================================`);
  console.log(`Saved evaluation results to ${resultsPath}\n`);
}

main().catch((err) => {
  console.error("Evaluation script encountered fatal error:", err);
  process.exit(1);
});
