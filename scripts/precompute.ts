import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { extractCommitments } from "../lib/llm/extract";
import type { Transcript, CatalogItem } from "../lib/types";
import catalogData from "../data/catalog.json";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const transcriptsDir = path.join(process.cwd(), "data", "transcripts");
  const files = fs.readdirSync(transcriptsDir).filter((f) => f.endsWith(".json"));

  console.log(`Found ${files.length} transcripts in ${transcriptsDir}`);

  const results: Record<string, unknown> = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(transcriptsDir, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const transcript: Transcript = JSON.parse(content);

    console.log(`[${i + 1}/${files.length}] Precomputing extraction for: ${transcript.id} (${transcript.title})...`);

    try {
      const result = await extractCommitments(transcript, catalogData as CatalogItem[]);
      results[transcript.id] = result;
      console.log(`  ✓ ${transcript.id}: ${result.candidates.length} candidates, ${result.discussed.length} discussed, ${result.dependencies.length} deps, ${result.dropped.length} dropped`);
    } catch (err) {
      console.error(`  ✗ Error extracting ${transcript.id}:`, err);
      throw err;
    }

    // Brief pause between requests to respect Groq rate limits
    if (i < files.length - 1) {
      await sleep(1500);
    }
  }

  const outDir = path.join(process.cwd(), "data", "precomputed");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, "extractions.json");
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nSuccessfully saved precomputed extractions to ${outFile}`);
}

main().catch((err) => {
  console.error("Precompute script failed:", err);
  process.exit(1);
});
