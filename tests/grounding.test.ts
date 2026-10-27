import { describe, it, expect } from "vitest";
import { groundQuote } from "../lib/grounding";
import type { Transcript } from "../lib/types";

const mockTranscript: Transcript = {
  id: "t_test_01",
  dealId: "d_test",
  title: "Test Discovery Call",
  date: "2026-09-14",
  source: "call",
  speakers: [
    { id: "s1", name: "Priya Raman", role: "Account Executive", company: "Brightpath", side: "vendor" },
    { id: "s2", name: "Dan Ortiz", role: "Ops Director", company: "Harbor Logistics", side: "customer" },
  ],
  lines: [
    { id: "L1", ts: "00:00:10", speakerId: "s1", text: "We can have single sign-on live within two weeks of signing." },
    { id: "L2", ts: "00:00:25", speakerId: "s2", text: "That sounds great, our team really needs SAML integration." },
    { id: "L3", ts: "00:00:40", speakerId: "s1", text: "We will migrate your legacy database within sixty days." },
  ],
};

describe("groundQuote", () => {
  it("finds an exact quote with correct line and speaker", () => {
    const res = groundQuote("single sign-on live within two weeks", "L1", mockTranscript);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.line.id).toBe("L1");
      expect(res.speaker.id).toBe("s1");
      expect(res.corrected).toBe(false);
    }
  });

  it("finds a quote even if it has different curly quotes and punctuation", () => {
    const transcriptWithQuotes: Transcript = {
      ...mockTranscript,
      lines: [
        { id: "L1", ts: "00:00:10", speakerId: "s1", text: "We’ll provide “full support” during the rollout period." },
      ],
    };
    const res = groundQuote("\"We'll provide \"full support\" during the rollout\"", "L1", transcriptWithQuotes);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.line.id).toBe("L1");
      expect(res.corrected).toBe(false);
    }
  });

  it("returns not_found when quote is a paraphrase", () => {
    const res = groundQuote("We promise to get SSO running in 14 days", "L1", mockTranscript);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("not_found");
    }
  });

  it("rejects quote with fewer than 4 words as too_short", () => {
    const res = groundQuote("single sign-on live", "L1", mockTranscript); // 3 words
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("too_short");
    }
  });

  it("rejects quote with more than 40 words as too_long", () => {
    const longQuote = "word ".repeat(41).trim();
    const res = groundQuote(longQuote, "L1", mockTranscript);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("too_long");
    }
  });

  it("handles wrong claimed lineId when quote exists elsewhere by setting corrected: true", () => {
    // Quote is actually in L3, but model claimed L1
    const res = groundQuote("migrate your legacy database within sixty days", "L1", mockTranscript);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.line.id).toBe("L3");
      expect(res.speaker.id).toBe("s1");
      expect(res.corrected).toBe(true);
    }
  });
});
