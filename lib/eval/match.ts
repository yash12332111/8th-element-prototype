import { normalize, stripEdgePunct } from "../normalize";
import type { CandidateCommitment, ExtractionResult } from "../llm/extract";

export function jaccard(a: string, b: string): number {
  const A = new Set(stripEdgePunct(normalize(a)).split(" ").filter(Boolean));
  const B = new Set(stripEdgePunct(normalize(b)).split(" ").filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export interface GoldCommitment {
  line_id: string;
  quote: string;
  type: string;
  catalog_item_id: string | null;
  due_days: number | null;
}

export interface GoldDecoy {
  line_id: string;
  quote: string;
  kind: "discussed" | "product_description" | "customer_request" | "other";
}

export interface GoldDependency {
  line_id: string;
  quote: string;
}

export interface GoldTranscriptEntry {
  split: "dev" | "test";
  commitments: GoldCommitment[];
  decoys: GoldDecoy[];
  dependencies?: GoldDependency[];
}

export type GoldStandard = Record<string, GoldTranscriptEntry>;

export interface MetricStat {
  value: number;
  num: number;
  den: number;
}

export interface MatchedPair {
  predIndex: number;
  goldIndex: number;
  predLineId: string;
  goldLineId: string;
  predQuote: string;
  goldQuote: string;
  predType: string;
  goldType: string;
  jaccard: number;
  typeMatch: boolean;
}

export interface PerTranscriptEval {
  transcriptId: string;
  split: "dev" | "test";
  nGold: number;
  nPred: number;
  nMatched: number;
  nDecoys: number;
  nDecoysTriggered: number;
  grounded: number;
  dropped: number;
  precision: MetricStat;
  recall: MetricStat;
  typeAccuracy: MetricStat;
  matches: MatchedPair[];
  unmatchedPreds: { lineId: string; quote: string; type: string }[];
  unmatchedGolds: { line_id: string; quote: string; type: string }[];
}

export interface EvalRunResult {
  runId: string;
  split: "dev" | "test";
  model: string;
  strict: boolean;
  promptVersion: string;
  nTranscripts: number;
  nGold: number;
  nDecoys: number;
  precision: MetricStat;
  recall: MetricStat;
  ungroundedRate: MetricStat;
  typeAccuracy: MetricStat;
  decoyFalsePositiveRate: MetricStat;
  perTranscript: PerTranscriptEval[];
}

export function calcStat(num: number, den: number): MetricStat {
  if (den === 0) return { value: 0, num, den };
  return {
    value: Number((num / den).toFixed(4)),
    num,
    den,
  };
}

/**
 * Greedily match predictions against gold commitments for one transcript.
 * Condition:
 * 1. Line is identical after grounding (pred.lineId === gold.line_id)
 * 2. Jaccard similarity >= 0.5
 * Matching is one-to-one and greedy (sorted by Jaccard descending).
 */
export function matchPredictions(
  preds: CandidateCommitment[],
  golds: GoldCommitment[]
): {
  matches: MatchedPair[];
  unmatchedPredIndices: number[];
  unmatchedGoldIndices: number[];
} {
  interface CandidatePair {
    predIndex: number;
    goldIndex: number;
    jaccard: number;
  }

  const pairs: CandidatePair[] = [];

  for (let i = 0; i < preds.length; i++) {
    for (let j = 0; j < golds.length; j++) {
      if (preds[i].lineId === golds[j].line_id) {
        const sim = jaccard(preds[i].quote, golds[j].quote);
        if (sim >= 0.5) {
          pairs.push({ predIndex: i, goldIndex: j, jaccard: sim });
        }
      }
    }
  }

  // Sort descending by Jaccard similarity
  pairs.sort((a, b) => b.jaccard - a.jaccard);

  const matchedPairs: MatchedPair[] = [];
  const usedPreds = new Set<number>();
  const usedGolds = new Set<number>();

  for (const pair of pairs) {
    if (!usedPreds.has(pair.predIndex) && !usedGolds.has(pair.goldIndex)) {
      usedPreds.add(pair.predIndex);
      usedGolds.add(pair.goldIndex);
      const p = preds[pair.predIndex];
      const g = golds[pair.goldIndex];
      matchedPairs.push({
        predIndex: pair.predIndex,
        goldIndex: pair.goldIndex,
        predLineId: p.lineId,
        goldLineId: g.line_id,
        predQuote: p.quote,
        goldQuote: g.quote,
        predType: p.type,
        goldType: g.type,
        jaccard: Number(pair.jaccard.toFixed(4)),
        typeMatch: p.type === g.type,
      });
    }
  }

  const unmatchedPredIndices: number[] = [];
  for (let i = 0; i < preds.length; i++) {
    if (!usedPreds.has(i)) unmatchedPredIndices.push(i);
  }

  const unmatchedGoldIndices: number[] = [];
  for (let j = 0; j < golds.length; j++) {
    if (!usedGolds.has(j)) unmatchedGoldIndices.push(j);
  }

  return { matches: matchedPairs, unmatchedPredIndices, unmatchedGoldIndices };
}

/**
 * Evaluates a single transcript against its gold entry.
 */
export function evaluateTranscript(
  transcriptId: string,
  extraction: ExtractionResult,
  goldEntry: GoldTranscriptEntry
): PerTranscriptEval {
  const preds = extraction.candidates;
  const golds = goldEntry.commitments;
  const decoys = goldEntry.decoys;

  const { matches, unmatchedPredIndices, unmatchedGoldIndices } = matchPredictions(preds, golds);

  // Check how many decoys were falsely returned as committed candidates
  let decoysTriggered = 0;
  for (const decoy of decoys) {
    const falseMatch = preds.some(
      (p) => p.lineId === decoy.line_id && jaccard(p.quote, decoy.quote) >= 0.5
    );
    if (falseMatch) decoysTriggered++;
  }

  const typeMatches = matches.filter((m) => m.typeMatch).length;

  return {
    transcriptId,
    split: goldEntry.split,
    nGold: golds.length,
    nPred: preds.length,
    nMatched: matches.length,
    nDecoys: decoys.length,
    nDecoysTriggered: decoysTriggered,
    grounded: preds.length,
    dropped: extraction.dropped.length,
    precision: calcStat(matches.length, preds.length),
    recall: calcStat(matches.length, golds.length),
    typeAccuracy: calcStat(typeMatches, matches.length),
    matches,
    unmatchedPreds: unmatchedPredIndices.map((i) => ({
      lineId: preds[i].lineId,
      quote: preds[i].quote,
      type: preds[i].type,
    })),
    unmatchedGolds: unmatchedGoldIndices.map((j) => ({
      line_id: golds[j].line_id,
      quote: golds[j].quote,
      type: golds[j].type,
    })),
  };
}

/**
 * Evaluates a complete set of extractions against gold standard.
 */
export function evaluateRun(
  extractions: Record<string, ExtractionResult>,
  gold: GoldStandard,
  splitFilter?: "dev" | "test"
): EvalRunResult {
  const transcriptIds = Object.keys(gold).filter(
    (id) => !splitFilter || gold[id].split === splitFilter
  );

  let totalMatched = 0;
  let totalPreds = 0;
  let totalGold = 0;
  let totalTypeMatches = 0;
  let totalDecoys = 0;
  let totalDecoysTriggered = 0;
  let totalRawCount = 0;
  let totalDroppedNotFound = 0;

  let model = "openai/gpt-oss-120b";
  let promptVersion = "v1.0";
  let strict = true;

  const perTranscript: PerTranscriptEval[] = [];

  for (const tid of transcriptIds) {
    const ext = extractions[tid];
    const goldEntry = gold[tid];
    if (!ext || !goldEntry) continue;

    model = ext.model || model;
    promptVersion = ext.promptVersion || promptVersion;
    strict = ext.strict ?? strict;

    const res = evaluateTranscript(tid, ext, goldEntry);
    perTranscript.push(res);

    totalMatched += res.nMatched;
    totalPreds += res.nPred;
    totalGold += res.nGold;
    totalTypeMatches += res.matches.filter((m) => m.typeMatch).length;
    totalDecoys += res.nDecoys;
    totalDecoysTriggered += res.nDecoysTriggered;

    totalRawCount += ext.rawCount || res.nPred + ext.discussed.length + ext.dropped.length;
    totalDroppedNotFound += ext.dropped.filter((d) => d.reason === "not_found").length;
  }

  return {
    runId: new Date().toISOString(),
    split: splitFilter || "test",
    model,
    strict,
    promptVersion,
    nTranscripts: perTranscript.length,
    nGold: totalGold,
    nDecoys: totalDecoys,
    precision: calcStat(totalMatched, totalPreds),
    recall: calcStat(totalMatched, totalGold),
    ungroundedRate: calcStat(totalDroppedNotFound, totalRawCount),
    typeAccuracy: calcStat(totalTypeMatches, totalMatched),
    decoyFalsePositiveRate: calcStat(totalDecoysTriggered, totalDecoys),
    perTranscript,
  };
}
