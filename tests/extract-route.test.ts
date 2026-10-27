import { describe, it, expect } from "vitest";
import { POST } from "../app/api/extract/route";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { Transcript } from "../lib/types";

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("/api/extract route", () => {
  const harbor1Path = path.join(process.cwd(), "data", "transcripts", "t_harbor_01.json");
  const harbor1Transcript: Transcript = JSON.parse(fs.readFileSync(harbor1Path, "utf-8"));

  it("serves precomputed results for t_harbor_01 with candidates, speaker, timestamp, and discussed items", async () => {
    const req = createPostRequest({
      mode: "precomputed",
      transcript: harbor1Transcript,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.source).toBe("precomputed");
    expect(Array.isArray(data.candidates)).toBe(true);
    expect(data.candidates.length).toBeGreaterThan(0);

    // Verify candidates have lineId, speakerId, timestamp from transcript
    for (const c of data.candidates) {
      expect(c.lineId).toBeDefined();
      expect(c.speakerId).toBeDefined();
      expect(c.timestamp).toBeDefined();
      // Ensure speaker is vendor side
      const speaker = harbor1Transcript.speakers.find((s) => s.id === c.speakerId);
      expect(speaker?.side).toBe("vendor");
    }

    // Verify at least one item appears under discussed
    expect(Array.isArray(data.discussed)).toBe(true);
    expect(data.discussed.length).toBeGreaterThan(0);

    // Verify customer dependencies
    expect(Array.isArray(data.dependencies)).toBe(true);
    for (const dep of data.dependencies) {
      const speaker = harbor1Transcript.speakers.find((s) => s.id === dep.speakerId);
      expect(speaker?.side).toBe("customer");
    }
  });

  it("rejects empty transcript with 400 EMPTY", async () => {
    const emptyTranscript = {
      ...harbor1Transcript,
      lines: [],
    };
    const req = createPostRequest({
      mode: "precomputed",
      transcript: emptyTranscript,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("EMPTY");
  });

  it("rejects unknown speakerId with 400 BAD_SPEAKER", async () => {
    const badSpeakerTranscript = {
      ...harbor1Transcript,
      lines: [
        { id: "L1", ts: "00:01:00", speakerId: "unknown_speaker_id", text: "Some random line text" },
      ],
    };
    const req = createPostRequest({
      mode: "precomputed",
      transcript: badSpeakerTranscript,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("BAD_SPEAKER");
  });
});
