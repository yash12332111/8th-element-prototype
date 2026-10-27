import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { extractCommitments } from "../../../lib/llm/extract";
import type { Transcript } from "../../../lib/types";

export const maxDuration = 60;

const MAX_TRANSCRIPT_CHARS = Number(process.env.MAX_TRANSCRIPT_CHARS) || 30000;
const LIVE_MAX_PER_IP_PER_HOUR = Number(process.env.LIVE_MAX_PER_IP_PER_HOUR) || 10;

// In-memory rate limiting map for live requests
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimits.get(ip);
  if (!record || now > record.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + 3600 * 1000 });
    return true;
  }
  if (record.count >= LIVE_MAX_PER_IP_PER_HOUR) {
    return false;
  }
  record.count++;
  return true;
}

const RequestSchema = z.object({
  mode: z.enum(["precomputed", "live"]).default("precomputed"),
  transcript: z.object({
    id: z.string(),
    dealId: z.string(),
    title: z.string(),
    date: z.string(),
    source: z.enum(["call", "email"]),
    speakers: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        company: z.string(),
        side: z.enum(["vendor", "customer"]),
      })
    ),
    lines: z.array(
      z.object({
        id: z.string(),
        ts: z.string(),
        speakerId: z.string(),
        text: z.string(),
      })
    ),
  }),
});

function loadPrecomputed(): Record<string, unknown> {
  try {
    const filePath = path.join(process.cwd(), "data", "precomputed", "extractions.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // If precomputed file cannot be read, fallback to empty
  }
  return {};
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON", message: "Malformed JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid request payload" }, { status: 400 });
  }

  const { mode, transcript } = parsed.data as { mode: "precomputed" | "live"; transcript: Transcript };

  // 1. Validate line count
  if (!transcript.lines || transcript.lines.length === 0) {
    return NextResponse.json({ error: "EMPTY", message: "Transcript contains no lines" }, { status: 400 });
  }

  // 2. Validate total characters
  const totalChars = transcript.lines.reduce((sum, l) => sum + l.text.length, 0);
  if (totalChars > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      { error: "TOO_LONG", message: `Transcript exceeds maximum allowed size (${MAX_TRANSCRIPT_CHARS} chars)` },
      { status: 400 }
    );
  }

  // 3. Validate speakers
  const validSpeakerIds = new Set(transcript.speakers.map((s) => s.id));
  const badSpeaker = transcript.lines.some((l) => !validSpeakerIds.has(l.speakerId));
  if (badSpeaker) {
    return NextResponse.json(
      { error: "BAD_SPEAKER", message: "Transcript line references unknown speakerId" },
      { status: 400 }
    );
  }

  const liveMode = process.env.LIVE_MODE === "on";

  // Precomputed mode requested
  if (mode === "precomputed") {
    const precomputed = loadPrecomputed();
    if (precomputed[transcript.id]) {
      return NextResponse.json({
        ...(precomputed[transcript.id] as object),
        source: "precomputed",
      });
    }
    // If precomputed not found and live mode is on, we can run live fallback
    if (!liveMode) {
      return NextResponse.json(
        { error: "PRECOMPUTED_NOT_FOUND", message: "Precomputed result not found and live mode is off" },
        { status: 404 }
      );
    }
  }

  // Live mode requested or fallback
  if (!liveMode) {
    const precomputed = loadPrecomputed();
    if (precomputed[transcript.id]) {
      return NextResponse.json({
        ...(precomputed[transcript.id] as object),
        source: "precomputed",
      });
    }
    return NextResponse.json(
      { error: "LIVE_OFF", message: "Live mode is disabled and no precomputed result exists" },
      { status: 503 }
    );
  }

  // Rate limiting check
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Hourly limit for live extractions exceeded" },
      { status: 429 }
    );
  }

  try {
    const result = await extractCommitments(transcript);
    return NextResponse.json({
      ...result,
      source: "live",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.message === "NO_API_KEY") {
      return NextResponse.json(
        { error: "NO_API_KEY", message: "Groq API key is not configured" },
        { status: 503 }
      );
    }
    const status = err?.status ?? err?.response?.status;
    if (status === 429) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: "Upstream rate limit reached. Please wait a moment." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "MODEL_ERROR", message: "Commitment extraction failed" },
      { status: 502 }
    );
  }
}
