import { config } from "dotenv";
config({ path: ".env.local" });

import { extractCommitments } from "../lib/llm/extract";
import type { Transcript } from "../lib/types";

const tinyTranscript: Transcript = {
  id: "t_smoke_01",
  dealId: "d_smoke",
  title: "Smoke Test Call",
  date: "2026-09-14",
  source: "call",
  speakers: [
    { id: "s1", name: "Priya Raman", role: "Account Executive", company: "Brightpath", side: "vendor" },
    { id: "s2", name: "Dan Ortiz", role: "Ops Director", company: "Harbor Logistics", side: "customer" },
  ],
  lines: [
    { id: "L1", ts: "00:00:10", speakerId: "s1", text: "We will deliver single sign-on within two weeks of signing." },
    { id: "L2", ts: "00:00:25", speakerId: "s2", text: "We will send over the IdP metadata by Friday." },
  ],
};

async function main() {
  console.log("Running Groq schema smoke test...");
  try {
    const res = await extractCommitments(tinyTranscript);
    console.log("SUCCESS! Smoke test returned:", {
      model: res.model,
      strict: res.strict,
      candidatesCount: res.candidates.length,
      discussedCount: res.discussed.length,
      dependenciesCount: res.dependencies.length,
      droppedCount: res.dropped.length,
    });
    console.log("Candidates:", JSON.stringify(res.candidates, null, 2));
    console.log("Dependencies:", JSON.stringify(res.dependencies, null, 2));
  } catch (err) {
    console.error("FAILED with error:", err);
    process.exit(1);
  }
}

main();
