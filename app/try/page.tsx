"use client";

import { useState } from "react";
import type { Transcript, TranscriptLine, Speaker, Side, ExtractionResult } from "@/lib/types";

const SAMPLE_INPUT = `Priya Raman (Brightpath, Account Executive, VENDOR): Thanks for joining today's call, David. We are excited to walk through Brightpath.
David Martinez (SolarPeak Services, Operations Director, CUSTOMER): We need automated technician dispatching and SAML single sign-on.
Priya Raman (Brightpath, Account Executive, VENDOR): SAML single sign-on will be live within fourteen days of signing, that is standard for us.
David Martinez (SolarPeak Services, Operations Director, CUSTOMER): How about migrating our three years of job history from CSV spreadsheets?
Marcus Webb (Brightpath, Implementation Lead, VENDOR): We can handle the CSV migration within thirty days of contract signature.
David Martinez (SolarPeak Services, Operations Director, CUSTOMER): Can we also get custom drone roof inspection reports rendered?
Priya Raman (Brightpath, Account Executive, VENDOR): We could probably look at custom reports down the road, let me check with engineering.
David Martinez (SolarPeak Services, Operations Director, CUSTOMER): We will have the customer export ready for you by the first of next month.
Marcus Webb (Brightpath, Implementation Lead, VENDOR): Perfect. Sign by end of month and we target full go-live within forty-five days.`;

export default function TryPage() {
  const [inputText, setInputText] = useState(SAMPLE_INPUT);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  function parseTranscript(raw: string): { transcript: Transcript | null; error: string | null } {
    const rawLines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      return { transcript: null, error: "Please enter at least one line of conversation." };
    }

    const speakerMap = new Map<string, Speaker>();
    const lines: TranscriptLine[] = [];
    const lineRegex = /^(.+?)\s*\((.+?),\s*(.+?),\s*(VENDOR|CUSTOMER)\):\s*(.+)$/i;

    for (let i = 0; i < rawLines.length; i++) {
      const lineStr = rawLines[i];
      const match = lineStr.match(lineRegex);
      if (!match) {
        return {
          transcript: null,
          error: `Line ${i + 1} does not match required format: "Name (Company, Role, VENDOR|CUSTOMER): text".\nProblem text: "${lineStr}"`,
        };
      }

      const [, name, company, role, sideRaw, text] = match;
      const side: Side = sideRaw.toUpperCase() === "VENDOR" ? "vendor" : "customer";
      const speakerKey = `${name.trim()}_${company.trim()}`;

      if (!speakerMap.has(speakerKey)) {
        speakerMap.set(speakerKey, {
          id: `s${speakerMap.size + 1}`,
          name: name.trim(),
          role: role.trim(),
          company: company.trim(),
          side,
        });
      }

      const speaker = speakerMap.get(speakerKey)!;
      lines.push({
        id: `L${i + 1}`,
        ts: "--:--:--",
        speakerId: speaker.id,
        text: text.trim(),
      });
    }

    const transcript: Transcript = {
      id: `t_try_${Date.now()}`,
      dealId: "d_try_sandbox",
      title: "Interactive Sandbox Call",
      date: new Date().toISOString().slice(0, 10),
      source: "call",
      speakers: Array.from(speakerMap.values()),
      lines,
    };

    return { transcript, error: null };
  }

  async function handleRunLive() {
    setErrorMsg(null);
    setResult(null);

    const { transcript, error } = parseTranscript(inputText);
    if (error || !transcript) {
      setErrorMsg(error || "Invalid transcript format");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "live", transcript }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `Server returned ${res.status}`);
      }

      setResult(data as ExtractionResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Live extraction failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1150, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 6 }}>
          Live Transcript Extraction Sandbox
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Test Kept&apos;s live extraction, grounding, and rules checking on any custom transcript. Results are read-only and will not modify deal pipelines.
        </p>
      </div>

      {/* Editor & Controls */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Transcript Format (One Turn Per Line)
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
              Name (Company, Role, VENDOR|CUSTOMER): text
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setInputText(SAMPLE_INPUT);
              setErrorMsg(null);
            }}
          >
            Load Sample Transcript
          </button>
        </div>

        <textarea
          className="input-field"
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.6,
            minHeight: 220,
            background: "var(--bg)",
          }}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        {errorMsg && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "var(--red-bg)",
              border: "1px solid var(--red-border)",
              borderRadius: "var(--radius)",
              color: "var(--red)",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button
            className="btn btn-primary"
            disabled={loading || inputText.trim().length === 0}
            onClick={handleRunLive}
          >
            {loading ? "Extracting with Groq (Strict Mode)..." : "Run Live Extraction ⚡"}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {result && (
        <div>
          {/* Metadata Banner */}
          <div
            className="card"
            style={{
              padding: "14px 18px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              background: "var(--bg-surface)",
            }}
          >
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
              <span className="badge badge-green">✓ Extracted Live</span>
              <span><strong>Model:</strong> <code>{result.model}</code></span>
              <span><strong>Latency:</strong> {result.latencyMs}ms</span>
              <span><strong>Prompt:</strong> {result.promptVersion}</span>
              <span><strong>Strict:</strong> {result.strict ? "true" : "false"}</span>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {result.candidates.length} candidates · {result.discussed.length} discussed · {result.dropped.length} dropped
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {/* Candidates */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                Vendor Commitments ({result.candidates.length})
              </div>

              {result.candidates.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No candidate commitments found in this transcript.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {result.candidates.map((c, idx) => (
                    <div key={idx} className="card" style={{ padding: 16, borderLeft: `4px solid var(--${c.flag})` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span className={`badge badge-${c.flag}`}>{c.flag.toUpperCase()}</span>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-subtle)" }}>
                          Line: {c.lineId} · {c.timestamp === "--:--:--" ? "no timestamp" : c.timestamp}
                        </span>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "var(--text)" }}>
                        {c.text}
                      </div>

                      <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-muted)", marginBottom: 8 }}>
                        &ldquo;{c.quote}&rdquo;
                      </div>

                      <div style={{ fontSize: 11, color: "var(--text-subtle)", padding: "6px 8px", background: "var(--bg-surface)", borderRadius: "var(--radius)", marginBottom: 8 }}>
                        {c.flagReason}
                      </div>

                      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                        <span>Type: <strong>{c.type}</strong></span>
                        {c.dueDays && <span>· Due: <strong>{c.dueDays}d</strong></span>}
                        {c.confidence && <span>· Confidence: <strong>{Math.round(c.confidence * 100)}%</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discussed & Dropped */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Discussed */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                  Discussed, Not Committed ({result.discussed.length})
                </div>

                {result.discussed.length === 0 ? (
                  <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No discussed/tentative decoys flagged.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.discussed.map((d, idx) => (
                      <div key={idx} className="card" style={{ padding: 12, background: "var(--bg-surface)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span className="badge badge-gray">Discussed</span>
                          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-subtle)" }}>
                            Line: {d.lineId} · {d.timestamp === "--:--:--" ? "no timestamp" : d.timestamp}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-muted)" }}>
                          &ldquo;{d.quote}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropped items */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                  Dropped by Grounding &amp; Filters ({result.dropped.length})
                </div>

                {result.dropped.length === 0 ? (
                  <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No items dropped.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.dropped.map((dp, idx) => (
                      <div key={idx} className="card" style={{ padding: 12, background: "var(--bg-surface)", borderLeft: "3px solid var(--text-subtle)" }}>
                        <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 600, marginBottom: 4 }}>
                          Reason: {dp.reason}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>
                          &ldquo;{dp.quote}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
