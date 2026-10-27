import { z } from "zod";
import { groundQuote } from "../grounding";
import { checkCommitment } from "../rules";
import type {
  CatalogItem,
  CommitmentType,
  CustomerDependency,
  Flag,
  Transcript,
  CandidateCommitment,
  CandidateDependency,
  ExtractionResult,
} from "../types";
import { buildSchema, buildUserMessage, PROMPT_VERSION, SYSTEM_PROMPT } from "./prompt";
import { callGroqJSON } from "./groq";
import catalogData from "../../data/catalog.json";

export type { CandidateCommitment, CandidateDependency, ExtractionResult };

// Zod schema accepting standard nulls or sentinels ("" / -1)
const RawCommitmentSchema = z.object({
  line_id: z.string(),
  quote: z.string(),
  summary: z.string(),
  type: z.enum([
    "integration",
    "data_migration",
    "configuration",
    "timeline",
    "training",
    "support",
    "product_capability",
    "commercial",
    "other",
  ]),
  catalog_item_id: z.string(),
  due_text: z.union([z.string(), z.null()]).optional(),
  due_days: z.union([z.number(), z.null()]).optional(),
  status: z.enum(["committed", "discussed"]),
  confidence: z.number(),
});

const RawDependencySchema = z.object({
  line_id: z.string(),
  quote: z.string(),
  summary: z.string(),
  due_days: z.union([z.number(), z.null()]).optional(),
  related_commitment_index: z.union([z.number(), z.null()]).optional(),
});

const RawModelOutputSchema = z.object({
  commitments: z.array(RawCommitmentSchema),
  customer_dependencies: z.array(RawDependencySchema),
});

export async function extractCommitments(
  transcript: Transcript,
  catalog: CatalogItem[] = catalogData as CatalogItem[],
  opts?: { model?: string; strict?: boolean; useSentinels?: boolean }
): Promise<ExtractionResult> {
  const t0 = Date.now();
  const catalogIds = catalog.map((c) => c.id);
  const schema = buildSchema(catalogIds, opts?.useSentinels ?? false);
  const user = buildUserMessage(catalog, transcript);

  let callRes = await callGroqJSON({
    system: SYSTEM_PROMPT,
    user,
    schema,
    model: opts?.model,
    strict: opts?.strict ?? true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: z.infer<typeof RawModelOutputSchema>;
  try {
    const rawJson = JSON.parse(callRes.content);
    parsed = RawModelOutputSchema.parse(rawJson);
  } catch {
    // Retry once with strict: false on failure if first attempt was strict
    if (callRes.strict) {
      try {
        callRes = await callGroqJSON({
          system: SYSTEM_PROMPT,
          user,
          schema,
          model: opts?.model,
          strict: false,
        });
        const retryJson = JSON.parse(callRes.content);
        parsed = RawModelOutputSchema.parse(retryJson);
      } catch {
        throw new Error("MODEL_OUTPUT_INVALID");
      }
    } else {
      throw new Error("MODEL_OUTPUT_INVALID");
    }
  }

  const latencyMs = Date.now() - t0;
  const rawCount = parsed.commitments.length;

  const dropped: { quote: string; reason: string }[] = [];
  const candidates: CandidateCommitment[] = [];
  const discussed: CandidateCommitment[] = [];

  // Track map from raw commitment index to candidate or discussed item
  const commitmentIndexMap = new Map<number, CandidateCommitment>();

  for (let i = 0; i < parsed.commitments.length; i++) {
    const raw = parsed.commitments[i];
    const ground = groundQuote(raw.quote, raw.line_id, transcript);
    if (!ground.ok) {
      dropped.push({ quote: raw.quote, reason: ground.reason });
      continue;
    }

    if (ground.speaker.side !== "vendor") {
      dropped.push({ quote: raw.quote, reason: "customer_speaker" });
      continue;
    }

    const catId =
      raw.catalog_item_id === "none" || raw.catalog_item_id === ""
        ? null
        : raw.catalog_item_id;

    const dueText = raw.due_text === "" ? null : (raw.due_text ?? null);
    const dueDays = raw.due_days === -1 ? null : (raw.due_days ?? null);

    const { flag, reason: flagReason } = checkCommitment(
      { type: raw.type, catalogItemId: catId, dueDays },
      catalog
    );

    const candidateItem: CandidateCommitment = {
      lineId: ground.line.id,
      quote: raw.quote,
      text: raw.summary,
      type: raw.type,
      catalogItemId: catId,
      dueText,
      dueDays,
      confidence: raw.confidence,
      speakerId: ground.speaker.id,
      timestamp: ground.line.ts,
      flag,
      flagReason,
      customerDependency: null,
      status: raw.status,
    };

    commitmentIndexMap.set(i, candidateItem);

    if (raw.status === "discussed") {
      discussed.push(candidateItem);
    } else {
      candidates.push(candidateItem);
    }
  }

  const dependencies: CandidateDependency[] = [];

  for (const dep of parsed.customer_dependencies) {
    const ground = groundQuote(dep.quote, dep.line_id, transcript);
    if (!ground.ok) {
      dropped.push({ quote: dep.quote, reason: ground.reason });
      continue;
    }

    if (ground.speaker.side !== "customer") {
      dropped.push({ quote: dep.quote, reason: "vendor_speaker" });
      continue;
    }

    const depDueDays = dep.due_days === -1 ? null : (dep.due_days ?? null);
    const relIdx =
      dep.related_commitment_index === -1
        ? null
        : (dep.related_commitment_index ?? null);

    const candidateDep: CandidateDependency = {
      lineId: ground.line.id,
      quote: dep.quote,
      text: dep.summary,
      dueDays: depDueDays,
      speakerId: ground.speaker.id,
      timestamp: ground.line.ts,
      relatedCommitmentIndex: relIdx,
    };

    dependencies.push(candidateDep);

    // Attach to related commitment if valid and survived grounding
    if (relIdx !== null && commitmentIndexMap.has(relIdx)) {
      const targetCommitment = commitmentIndexMap.get(relIdx)!;
      targetCommitment.customerDependency = {
        text: dep.summary,
        quote: dep.quote,
        dueDays: depDueDays,
      };
    }
  }

  return {
    promptVersion: PROMPT_VERSION,
    model: callRes.model,
    strict: callRes.strict,
    latencyMs,
    candidates,
    discussed,
    dependencies,
    dropped,
    rawCount,
  };
}
