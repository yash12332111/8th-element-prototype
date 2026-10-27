"use client";

import { useState } from "react";
import rawResults from "@/data/eval/results.json";
import type { EvalRunResult } from "@/lib/eval/match";

const results = rawResults as EvalRunResult[];

export default function EvalPage() {
  // Pick the latest test run by default, or the very latest run
  const testRuns = results.filter((r) => r.split === "test");
  const defaultRunIndex = testRuns.length > 0 ? results.indexOf(testRuns[testRuns.length - 1]) : results.length - 1;

  const [selectedRunIdx, setSelectedRunIdx] = useState<number>(defaultRunIndex >= 0 ? defaultRunIndex : 0);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  const currentRun: EvalRunResult | undefined = results[selectedRunIdx];

  if (!currentRun) {
    return (
      <div style={{ padding: 40, color: "var(--text-muted)", textAlign: "center" }}>
        No evaluation runs found. Run <code>npm run eval</code> to generate benchmark results.
      </div>
    );
  }

  const formatPct = (val: number | null) => {
    if (val === null || val === undefined) return "n/a";
    return `${(val * 100).toFixed(1)}%`;
  };

  return (
    <div style={{ maxWidth: 1150, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            AI Extraction Accuracy &amp; Benchmark
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Rigorous offline evaluation measuring commitment extraction precision, recall, quote grounding integrity, and decoy rejection.
          </p>
        </div>

        {/* Run Selector */}
        {results.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Select Run:</span>
            <select
              className="input-field"
              style={{ fontSize: 12, padding: "5px 10px", width: "auto" }}
              value={selectedRunIdx}
              onChange={(e) => setSelectedRunIdx(Number(e.target.value))}
            >
              {results.map((r, i) => (
                <option key={r.runId || i} value={i}>
                  [{r.split.toUpperCase()}] {r.model} ({r.promptVersion}) — {r.runId ? new Date(r.runId).toLocaleDateString() : `Run #${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Latest Run Details Banner */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          marginBottom: 24,
          background: "linear-gradient(180deg, var(--bg-card), var(--bg-surface))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span className="badge badge-blue" style={{ fontSize: 12, padding: "4px 10px" }}>
            SPLIT: {currentRun.split.toUpperCase()}
          </span>
          <span style={{ fontSize: 13 }}>
            <strong>Model:</strong> <code>{currentRun.model}</code>
          </span>
          <span style={{ fontSize: 13 }}>
            <strong>Strict Mode:</strong> {currentRun.strict ? "✓ JSON Schema (Constrained)" : "Best-effort"}
          </span>
          <span style={{ fontSize: 13 }}>
            <strong>Prompt Version:</strong> <code>{currentRun.promptVersion}</code>
          </span>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {currentRun.nTranscripts} transcripts · {currentRun.nGold} gold promises · {currentRun.nDecoys} decoys
        </div>
      </div>

      {/* Score Panel (Slide 11 Screenshot Focus) */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
          Core Benchmark Metrics ({currentRun.split.toUpperCase()} Split)
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {/* Precision */}
          <div className="metric-card" style={{ borderTop: "3px solid var(--green)" }}>
            <div>
              <div className="metric-card-title">Precision</div>
              <div className="metric-card-value" style={{ color: "var(--green)" }}>
                {formatPct(currentRun.precision.value)}
              </div>
              <div className="metric-card-sub" style={{ color: "var(--green)" }}>
                {currentRun.precision.num} / {currentRun.precision.den} matched
              </div>
            </div>
            <div className="metric-card-formula">
              matched ÷ grounded predictions
            </div>
          </div>

          {/* Recall */}
          <div className="metric-card" style={{ borderTop: "3px solid var(--accent)" }}>
            <div>
              <div className="metric-card-title">Recall</div>
              <div className="metric-card-value" style={{ color: "var(--accent)" }}>
                {formatPct(currentRun.recall.value)}
              </div>
              <div className="metric-card-sub">
                {currentRun.recall.num} / {currentRun.recall.den} gold found
              </div>
            </div>
            <div className="metric-card-formula">
              matched ÷ gold commitments
            </div>
          </div>

          {/* Ungrounded Rate */}
          <div className="metric-card" style={{ borderTop: "3px solid var(--amber)" }}>
            <div>
              <div className="metric-card-title">Ungrounded Rate</div>
              <div className="metric-card-value" style={{ color: currentRun.ungroundedRate.value === 0 ? "var(--green)" : "var(--amber)" }}>
                {formatPct(currentRun.ungroundedRate.value)}
              </div>
              <div className="metric-card-sub">
                {currentRun.ungroundedRate.num} / {currentRun.ungroundedRate.den} dropped
              </div>
            </div>
            <div className="metric-card-formula">
              dropped as not_found ÷ raw items
            </div>
          </div>

          {/* Type Accuracy */}
          <div className="metric-card" style={{ borderTop: "3px solid #b392f0" }}>
            <div>
              <div className="metric-card-title">Type Accuracy</div>
              <div className="metric-card-value" style={{ color: "#b392f0" }}>
                {formatPct(currentRun.typeAccuracy.value)}
              </div>
              <div className="metric-card-sub">
                {currentRun.typeAccuracy.num} / {currentRun.typeAccuracy.den} correct types
              </div>
            </div>
            <div className="metric-card-formula">
              matched with correct type ÷ matched
            </div>
          </div>

          {/* Decoy FP Rate */}
          <div className="metric-card" style={{ borderTop: "3px solid var(--red)" }}>
            <div>
              <div className="metric-card-title">Decoy False-Positive</div>
              <div className="metric-card-value" style={{ color: currentRun.decoyFalsePositiveRate.value === 0 ? "var(--green)" : "var(--red)" }}>
                {formatPct(currentRun.decoyFalsePositiveRate.value)}
              </div>
              <div className="metric-card-sub">
                {currentRun.decoyFalsePositiveRate.num} / {currentRun.decoyFalsePositiveRate.den} decoys leaked
              </div>
            </div>
            <div className="metric-card-formula">
              discussed wrongly committed ÷ decoys
            </div>
          </div>
        </div>
      </div>

      {/* Method Box & Disclosed Limitation (Section 5.4 & 7.6) */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          marginBottom: 32,
          borderLeft: "4px solid var(--accent)",
          background: "var(--bg-surface)",
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          Evaluation Methodology &amp; Matching Protocol
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
              1. Matching Rule (Section 3.8)
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              A predicted commitment matches a gold commitment if both hold: (a) it is the same transcript and identical line after grounding (<code>line_id</code>), and (b) word-set Jaccard similarity of normalized quotes is ≥ 0.5. Matching is greedy and strictly one-to-one.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
              2. Dataset Split (Section 5.4)
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              The dataset contains 20 synthetic transcripts covering varied field-service industries. <strong>dev</strong> (<code>e01</code>–<code>e05</code>) was used for initial tuning; <strong>test</strong> (<code>e06</code>–<code>e20</code>, 15 transcripts) is held-out and was never tuned on.
            </div>
          </div>
        </div>

        {/* Limitation Callout */}
        <div
          style={{
            background: "rgba(88, 166, 255, 0.08)",
            border: "1px solid var(--accent-dim)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            fontSize: 12,
            color: "var(--text)",
            lineHeight: 1.5,
          }}
        >
          <strong>Disclosed Limitation:</strong> &ldquo;Transcripts and labels are synthetic and were written with AI assistance. The model under test is different from the one used to write them, but the numbers measure performance on this set only, not on real calls.&rdquo;
        </div>
      </div>

      {/* Per-Transcript Results Table */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
              Per-Transcript Evaluation Results
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Showing {currentRun.perTranscript.length} transcripts in {currentRun.split.toUpperCase()} split. Click any row to inspect matches.
            </div>
          </div>
        </div>

        <div className="delivery-table-container">
          <table className="delivery-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Transcript</th>
                <th style={{ width: 80 }}>Split</th>
                <th style={{ width: 100 }}>Gold Promises</th>
                <th style={{ width: 100 }}>Predictions</th>
                <th style={{ width: 90 }}>Matched</th>
                <th style={{ width: 100 }}>Decoys (FP)</th>
                <th style={{ width: 130 }}>Precision</th>
                <th style={{ width: 130 }}>Recall</th>
                <th style={{ width: 130 }}>Type Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {currentRun.perTranscript.map((t) => {
                const isExpanded = expandedTranscript === t.transcriptId;
                return (
                  <tr
                    key={t.transcriptId}
                    style={{ cursor: "pointer" }}
                    onClick={() => setExpandedTranscript(isExpanded ? null : t.transcriptId)}
                  >
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--accent)" }}>
                        {t.transcriptId}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue">{t.split}</span>
                    </td>
                    <td>{t.nGold}</td>
                    <td>{t.nPred}</td>
                    <td>
                      <span className="badge badge-green">{t.nMatched}</span>
                    </td>
                    <td>
                      {t.nDecoysTriggered > 0 ? (
                        <span className="badge badge-red">{t.nDecoysTriggered} / {t.nDecoys}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>0 / {t.nDecoys}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {formatPct(t.precision.value)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-subtle)", marginLeft: 6 }}>
                        ({t.precision.num}/{t.precision.den})
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {formatPct(t.recall.value)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-subtle)", marginLeft: 6 }}>
                        ({t.recall.num}/{t.recall.den})
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {formatPct(t.typeAccuracy.value)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-subtle)", marginLeft: 6 }}>
                        ({t.typeAccuracy.num}/{t.typeAccuracy.den})
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expanded Transcript Details */}
        {expandedTranscript && (() => {
          const t = currentRun.perTranscript.find((item) => item.transcriptId === expandedTranscript);
          if (!t) return null;
          return (
            <div className="card" style={{ marginTop: 12, padding: 18, background: "var(--bg-surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Inspection for {t.transcriptId} ({t.matches.length} matched pairs)
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setExpandedTranscript(null)}
                >
                  Close
                </button>
              </div>

              {t.matches.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    MATCHED PAIRS:
                  </div>
                  {t.matches.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 10,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        marginBottom: 6,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>{m.predLineId}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Jaccard: {m.jaccard} · Type: {m.typeMatch ? "✓ Matched" : `✕ Pred: ${m.predType} vs Gold: ${m.goldType}`}
                        </span>
                      </div>
                      <div style={{ color: "var(--text)" }}>&ldquo;{m.predQuote}&rdquo;</div>
                    </div>
                  ))}
                </div>
              )}

              {t.unmatchedGolds.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>
                    MISSED GOLD PROMISES (FALSE NEGATIVES):
                  </div>
                  {t.unmatchedGolds.map((g, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 8,
                        background: "var(--red-bg)",
                        border: "1px solid var(--red-border)",
                        borderRadius: "var(--radius)",
                        marginBottom: 4,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontFamily: "monospace" }}>{g.line_id}: </span>
                      &ldquo;{g.quote}&rdquo; ({g.type})
                    </div>
                  ))}
                </div>
              )}

              {t.unmatchedPreds.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 6 }}>
                    EXTRA PREDICTIONS (FALSE POSITIVES):
                  </div>
                  {t.unmatchedPreds.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 8,
                        background: "var(--amber-bg)",
                        border: "1px solid var(--amber-border)",
                        borderRadius: "var(--radius)",
                        marginBottom: 4,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontFamily: "monospace" }}>{p.lineId}: </span>
                      &ldquo;{p.quote}&rdquo; ({p.type})
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Run History Table */}
      {results.length > 1 && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
            Evaluation Run History
          </div>

          <div className="delivery-table-container">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Split</th>
                  <th>Model</th>
                  <th>Prompt Version</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>Ungrounded</th>
                  <th>Type Acc</th>
                  <th>Decoy FP</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.runId || i}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {r.runId ? new Date(r.runId).toLocaleString() : `Run #${i + 1}`}
                    </td>
                    <td>
                      <span className="badge badge-blue">{r.split}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{r.model}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.promptVersion}</td>
                    <td>{formatPct(r.precision.value)} ({r.precision.num}/{r.precision.den})</td>
                    <td>{formatPct(r.recall.value)} ({r.recall.num}/{r.recall.den})</td>
                    <td>{formatPct(r.ungroundedRate.value)}</td>
                    <td>{formatPct(r.typeAccuracy.value)}</td>
                    <td>{formatPct(r.decoyFalsePositiveRate.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
