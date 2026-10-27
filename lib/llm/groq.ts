import Groq from "groq-sdk";

// v1.1: read env lazily; module-scope reads run before dotenv loads in scripts.
const getKeys = () =>
  (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

let keyIdx = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGroqJSON(opts: {
  system: string;
  user: string;
  schema: object;
  model?: string;
  strict?: boolean;
}): Promise<{ content: string; model: string; strict: boolean }> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error("NO_API_KEY");
  const primary = opts.model ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
  const fallback = process.env.GROQ_FALLBACK_MODEL ?? "openai/gpt-oss-20b";
  const plan: { model: string; strict: boolean }[] = [
    { model: primary, strict: opts.strict ?? true },
    { model: primary, strict: false }, // if strict schema rejected (400)
    { model: fallback, strict: true },
  ];
  let lastErr: unknown;
  for (const step of plan) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const client = new Groq({ apiKey: keys[keyIdx % keys.length] });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (client.chat.completions.create as any)({
          model: step.model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          temperature: 0,
          max_completion_tokens: 4096,
          reasoning_effort: "low",
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "commitment_extraction",
              strict: step.strict,
              schema: opts.schema,
            },
          },
        });
        const content = res.choices?.[0]?.message?.content ?? "";
        if (!content.trim()) throw new Error("EMPTY_CONTENT");
        return { content, model: step.model, strict: step.strict };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        lastErr = e;
        const status = e?.status ?? e?.response?.status;
        if (status === 429) {
          keyIdx++; // rotate key
          const ra = Number(e?.headers?.["retry-after"]) || 2 ** attempt;
          await sleep(Math.min(ra, 20) * 1000);
          continue;
        }
        if (!status || status >= 500 || e?.message === "EMPTY_CONTENT") {
          await sleep(1000 * (attempt + 1));
          continue;
        } // network errors have no status
        break; // 400 etc. → next plan step
      }
    }
  }
  throw lastErr;
}
