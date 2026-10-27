import { normalize, stripEdgePunct, wordCount } from "./normalize";
import type { Transcript, TranscriptLine, Speaker } from "./types";

export type GroundResult =
  | { ok: true; line: TranscriptLine; speaker: Speaker; corrected: boolean }
  | { ok: false; reason: "too_short" | "too_long" | "not_found" | "unknown_speaker" };

export function groundQuote(quote: string, claimedLineId: string, t: Transcript): GroundResult {
  const q = stripEdgePunct(normalize(quote));
  const wc = wordCount(q);
  if (wc < 4) return { ok: false, reason: "too_short" };
  if (wc > 40) return { ok: false, reason: "too_long" };

  const matches = t.lines.filter(l => normalize(l.text).includes(q));
  if (matches.length === 0) return { ok: false, reason: "not_found" };

  // Prefer the line the model claimed; otherwise the first match (logged as corrected).
  const line = matches.find(l => l.id === claimedLineId) ?? matches[0];
  const speaker = t.speakers.find(s => s.id === line.speakerId);
  if (!speaker) return { ok: false, reason: "unknown_speaker" };
  return { ok: true, line, speaker, corrected: line.id !== claimedLineId };
}
