"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useState, useRef } from "react";
import type { CommitmentType, Stage } from "@/lib/types";
import type { ExtractionResult, CandidateCommitment } from "@/lib/llm/extract";

const STAGE_LABELS: Record<Stage, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  contract: "Contract",
  closed_won: "Closed Won",
  onboarding: "Onboarding",
  renewal: "Renewal",
};

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const deal = useStore((s) => s.deals.find((d) => d.id === id));
  const transcripts = useStore((s) => s.transcripts.filter((t) => t.dealId === id));
  const commitments = useStore((s) => s.commitments.filter((c) => c.dealId === id));
  const lastExtractions = useStore((s) => s.lastExtraction);
  const role = useStore((s) => s.role);

  const ingestExtraction = useStore((s) => s.ingestExtraction);
  const confirmCommitment = useStore((s) => s.confirm);
  const editCommitment = useStore((s) => s.edit);
  const markNotCommitment = useStore((s) => s.markNotCommitment);
  const recordWalkBack = useStore((s) => s.recordWalkBack);

  const [activeTab, setActiveTab] = useState<"capture" | "commitments" | "stage">("capture");
  const [activeTranscript, setActiveTranscript] = useState(0);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showDropped, setShowDropped] = useState(false);
  const [showDiscussed, setShowDiscussed] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Modals state
  const [editModal, setEditModal] = useState<{
    id: string;
    text: string;
    type: CommitmentType;
    dueDays: number | null;
  } | null>(null);

  const [notCommitmentModal, setNotCommitmentModal] = useState<{
    id: string;
    reason: string;
  } | null>(null);

  const [walkBackModal, setWalkBackModal] = useState<{
    id: string;
    note: string;
  } | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  if (!deal) {
    return (
      <div style={{ padding: 40, color: "var(--text-muted)" }}>
        Deal not found.
      </div>
    );
  }

  const transcript = transcripts[activeTranscript];
  const currentExtraction: ExtractionResult | undefined = transcript ? lastExtractions[transcript.id] : undefined;

  const isAE = role === "ae";

  const handleSelectLine = (lineId: string) => {
    setSelectedLineId(lineId);
    const element = document.getElementById(`line-${lineId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleRunExtract = async (mode: "precomputed" | "live") => {
    if (!transcript) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Extraction failed");
      }
      ingestExtraction(deal.id, transcript.id, data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      setExtractError(msg);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      {/* Deal header */}
      <div className="deal-header">
        <div className="deal-title">{deal.accountName}</div>
        <div className="deal-meta">
          <span>AE: {deal.aeName}</span>
          <span>·</span>
          <span>Impl: {deal.implementationLead}</span>
          <span>·</span>
          <span>CSM: {deal.csmName}</span>
          <span>·</span>
          <span>ARR: ${deal.arrUsd.toLocaleString()}</span>
          <span>·</span>
          <span className="badge badge-blue">{STAGE_LABELS[deal.stage]}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="deal-tabs">
        {(["capture", "commitments", "stage"] as const).map((tab) => (
          <button
            key={tab}
            className={`deal-tab ${activeTab === tab ? "deal-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "capture"
              ? "Capture"
              : tab === "commitments"
              ? `Commitments (${commitments.length})`
              : "Stage"}
          </button>
        ))}
      </div>

      {/* Tab 1: Capture */}
      {activeTab === "capture" && (
        <div>
          {transcripts.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {transcripts.map((t, i) => (
                <button
                  key={t.id}
                  className={`btn ${activeTranscript === i ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setActiveTranscript(i);
                    setSelectedLineId(null);
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}

          {transcript ? (
            <div className="capture-layout">
              {/* Left Column: Transcript */}
              <div className="transcript-scroll" ref={transcriptScrollRef}>
                <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{transcript.title}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: "var(--text-muted)" }}>{transcript.date}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                    {transcript.lines.length} lines · {transcript.speakers.length} speakers
                  </span>
                </div>

                {/* Speaker chips */}
                <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", paddingBottom: 10, borderBottom: "1px solid var(--border-muted)" }}>
                  {transcript.speakers.map((sp) => (
                    <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`chip ${sp.side === "vendor" ? "chip-vendor" : "chip-customer"}`}>
                        {sp.side.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{sp.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({sp.role})</span>
                    </div>
                  ))}
                </div>

                {/* Transcript Lines */}
                <div>
                  {transcript.lines.map((line) => {
                    const speaker = transcript.speakers.find((sp) => sp.id === line.speakerId);
                    const isSelected = selectedLineId === line.id;
                    return (
                      <div
                        key={line.id}
                        id={`line-${line.id}`}
                        className={`transcript-line ${isSelected ? "highlighted" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedLineId(line.id)}
                      >
                        <span className="transcript-ts">{line.ts}</span>
                        <div style={{ minWidth: 130 }}>
                          <span
                            className={`transcript-speaker ${
                              speaker?.side === "vendor" ? "transcript-speaker-vendor" : "transcript-speaker-customer"
                            }`}
                          >
                            {speaker?.name ?? line.speakerId}
                          </span>
                          <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                            <span className={`chip ${speaker?.side === "vendor" ? "chip-vendor" : "chip-customer"}`}>
                              {speaker?.side?.toUpperCase() ?? "?"}
                            </span>
                          </div>
                        </div>
                        <span className="transcript-text">{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: AI Extraction Results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Extraction Toolbar */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Commitment Extraction</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Extract promises with strict grounding & can-commit rules
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-primary"
                      disabled={extracting || !isAE}
                      title={!isAE ? "Switch to AE role in header to run extraction" : undefined}
                      onClick={() => handleRunExtract("precomputed")}
                    >
                      {extracting ? "Extracting..." : "⚡ Find commitments"}
                    </button>

                    <button
                      className="btn btn-secondary"
                      disabled={extracting || !isAE}
                      title={!isAE ? "Switch to AE role in header to run live model" : undefined}
                      onClick={() => handleRunExtract("live")}
                    >
                      Groq Live (GPT-OSS 120B)
                    </button>
                  </div>

                  {!isAE && (
                    <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 2 }}>
                      ℹ️ Switched to {role}: Switch role to Account Executive (AE) to run extractions.
                    </div>
                  )}

                  {extractError && (
                    <div style={{ fontSize: 12, color: "var(--red)", background: "var(--red-bg)", padding: "6px 10px", borderRadius: "var(--radius)" }}>
                      {extractError}
                    </div>
                  )}

                  {currentExtraction && (
                    <div style={{ fontSize: 11, color: "var(--text-subtle)", display: "flex", gap: 12, borderTop: "1px solid var(--border-muted)", paddingTop: 8, flexWrap: "wrap" }}>
                      <span>Model: {currentExtraction.model}</span>
                      <span>Strict: {currentExtraction.strict ? "true" : "false"}</span>
                      <span>Latency: {currentExtraction.latencyMs}ms</span>
                      <span>Candidates: {currentExtraction.candidates.length}</span>
                    </div>
                  )}
                </div>

                {/* Candidate Cards List */}
                {currentExtraction ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                        Candidate Commitments ({currentExtraction.candidates.length})
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={() => setActiveTab("commitments")}
                      >
                        Review in Commitments tab →
                      </button>
                    </div>

                    {currentExtraction.candidates.map((cand, idx) => {
                      const isSelected = selectedLineId === cand.lineId;
                      return (
                        <div
                          key={`cand-${idx}`}
                          className={`candidate-card ${isSelected ? "active" : ""}`}
                          onClick={() => handleSelectLine(cand.lineId)}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span className={`badge badge-${cand.flag}`}>
                                {cand.flag.toUpperCase()}
                              </span>
                              <span className="badge badge-gray">{cand.type.replace(/_/g, " ")}</span>
                              {cand.dueDays !== null && (
                                <span className="badge badge-blue">{cand.dueDays}d</span>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                              line {cand.lineId} · {cand.timestamp}
                            </span>
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                            {cand.text}
                          </div>

                          <div className={`quote-box ${isSelected ? "active" : ""}`}>
                            "{cand.quote}"
                          </div>

                          <div style={{ fontSize: 11, color: cand.flag === "red" ? "var(--red)" : cand.flag === "amber" ? "var(--amber)" : "var(--green)" }}>
                            {cand.flagReason}
                          </div>

                          {cand.customerDependency && (
                            <div style={{ fontSize: 11, color: "var(--accent)", background: "rgba(88, 166, 255, 0.08)", padding: "4px 8px", borderRadius: 4 }}>
                              📎 Customer dependency: {cand.customerDependency.text}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Discussed, not committed */}
                    {currentExtraction.discussed && currentExtraction.discussed.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            marginBottom: 8,
                          }}
                          onClick={() => setShowDiscussed(!showDiscussed)}
                        >
                          <span>💬 Discussed, not committed ({currentExtraction.discussed.length})</span>
                          <span>{showDiscussed ? "▾" : "▸"}</span>
                        </div>

                        {showDiscussed && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {currentExtraction.discussed.map((d, i) => (
                              <div
                                key={`disc-${i}`}
                                className="candidate-card"
                                style={{ opacity: 0.8 }}
                                onClick={() => handleSelectLine(d.lineId)}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span className="badge badge-gray">EXPLORATORY / DISCUSSED</span>
                                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>line {d.lineId}</span>
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{d.text}</div>
                                <div className="quote-box">"{d.quote}"</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dropped by grounding */}
                    {currentExtraction.dropped && currentExtraction.dropped.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-subtle)",
                            marginBottom: 6,
                          }}
                          onClick={() => setShowDropped(!showDropped)}
                        >
                          <span>⚠️ Dropped by grounding ({currentExtraction.dropped.length})</span>
                          <span>{showDropped ? "▾" : "▸"}</span>
                        </div>

                        {showDropped && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {currentExtraction.dropped.map((dr, idx) => (
                              <div
                                key={`drop-${idx}`}
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-subtle)",
                                  background: "var(--bg-hover)",
                                  padding: "6px 10px",
                                  borderRadius: "var(--radius)",
                                  borderLeft: "2px solid var(--border)",
                                }}
                              >
                                <div><strong>Reason:</strong> {dr.reason}</div>
                                <div style={{ fontStyle: "italic", marginTop: 2 }}>"{dr.quote}"</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                    Click <strong>"⚡ Find commitments"</strong> above to extract promises from this transcript.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No transcripts available for this deal.</p>
          )}
        </div>
      )}

      {/* Tab 2: Commitments (Review) */}
      {activeTab === "commitments" && (
        <div>
          {commitments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
              No commitments captured yet. Go to the <strong>Capture</strong> tab and click "Find commitments" to ingest them.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {commitments.map((c) => {
                const isNotCommitment = c.review === "not_commitment";
                const isDeclined = c.approval === "declined";
                const walkBackNeeded = isDeclined && !c.walkedBack;
                const isHistoryOpen = !!expandedHistory[c.id];

                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      opacity: isNotCommitment ? 0.55 : 1,
                      borderLeft: walkBackNeeded ? "3px solid var(--red)" : undefined,
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span className={`badge badge-${c.flag}`}>
                          {c.flag.toUpperCase()}
                        </span>
                        <span className="badge badge-gray">{c.type.replace(/_/g, " ")}</span>
                        {c.late && <span className="badge badge-red">LATE</span>}
                        {c.origin === "off_record" && <span className="badge badge-amber">OFF-RECORD</span>}
                        {c.review === "confirmed" && <span className="badge badge-green">CONFIRMED</span>}
                        {c.review === "proposed" && <span className="badge badge-gray">PROPOSED</span>}
                        {isNotCommitment && <span className="badge badge-red">NOT COMMITMENT</span>}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {c.confidence !== null && (
                          <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                            Conf: {Math.round(c.confidence * 100)}%
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                          {c.approval.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Summary text */}
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                      {c.text}
                    </div>

                    {/* Quote block */}
                    {c.quote && (
                      <div className="quote-box" style={{ marginBottom: 10 }}>
                        "{c.quote}"
                        <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4, fontStyle: "normal" }}>
                          — {c.speakerId ?? "Speaker"} · line {c.lineId ?? "?"} · {c.timestamp ?? ""}
                        </div>
                      </div>
                    )}

                    {/* Rule flag reason */}
                    <div style={{ fontSize: 12, color: c.flag === "red" ? "var(--red)" : c.flag === "amber" ? "var(--amber)" : "var(--green)", marginBottom: 8 }}>
                      <strong>Rule check:</strong> {c.flagReason}
                    </div>

                    {/* Due details */}
                    <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
                      {c.dueText && <span>Due phrase: "{c.dueText}"</span>}
                      {c.dueDays !== null && <span>Due timeline: <strong>{c.dueDays} days</strong> from signature</span>}
                      {c.dueDate && <span>Computed due date: <strong>{c.dueDate}</strong></span>}
                      {c.customerDependency && (
                        <span style={{ color: "var(--accent)" }}>
                          Dependency: {c.customerDependency.text}
                        </span>
                      )}
                    </div>

                    {/* Walk-back banner if declined */}
                    {walkBackNeeded && (
                      <div style={{
                        background: "var(--red-bg)",
                        border: "1px solid var(--red-border)",
                        borderRadius: "var(--radius)",
                        padding: "10px 14px",
                        marginBottom: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--red)", fontSize: 13 }}>
                            ⚠️ Walk-back required
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            Declined by Implementation Lead ({c.approvalNote || "No note"}). You must record what was communicated to the customer.
                          </div>
                        </div>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: 12 }}
                          disabled={!isAE}
                          title={!isAE ? "Switch to AE in header to record walk-back" : undefined}
                          onClick={() => setWalkBackModal({ id: c.id, note: "" })}
                        >
                          Record walk-back
                        </button>
                      </div>
                    )}

                    {c.walkedBack && (
                      <div style={{
                        background: "var(--green-bg)",
                        border: "1px solid var(--green-border)",
                        borderRadius: "var(--radius)",
                        padding: "8px 12px",
                        marginBottom: 12,
                        fontSize: 12,
                        color: "var(--green)",
                      }}>
                        ✓ Walk-back recorded: "{c.approvalNote}"
                      </div>
                    )}

                    {/* Not a commitment tag */}
                    {isNotCommitment && (
                      <div style={{
                        background: "var(--bg-hover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "8px 12px",
                        marginBottom: 12,
                        fontSize: 12,
                        color: "var(--amber)",
                      }}>
                        Marked not a commitment by AE: {c.notCommitmentReason}
                      </div>
                    )}

                    {/* Action buttons (AE only) */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--border-muted)", paddingTop: 10, flexWrap: "wrap" }}>
                      {c.review === "proposed" && (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          disabled={!isAE}
                          title={!isAE ? "Switch to AE role to confirm commitments" : undefined}
                          onClick={() => confirmCommitment(c.id)}
                        >
                          ✓ Confirm
                        </button>
                      )}

                      {!isNotCommitment && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          disabled={!isAE}
                          title={!isAE ? "Switch to AE role to edit commitments" : undefined}
                          onClick={() =>
                            setEditModal({
                              id: c.id,
                              text: c.text,
                              type: c.type,
                              dueDays: c.dueDays,
                            })
                          }
                        >
                          ✎ Edit
                        </button>
                      )}

                      {!isNotCommitment && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 10px", color: "var(--amber)" }}
                          disabled={!isAE}
                          title={!isAE ? "Switch to AE role to mark not a commitment" : undefined}
                          onClick={() => setNotCommitmentModal({ id: c.id, reason: "" })}
                        >
                          Mark "not a commitment"
                        </button>
                      )}

                      {/* History Expander Toggle */}
                      {c.versions && c.versions.length > 0 && (
                        <button
                          className="btn"
                          style={{ fontSize: 11, background: "transparent", color: "var(--text-subtle)", marginLeft: "auto" }}
                          onClick={() =>
                            setExpandedHistory((prev) => ({ ...prev, [c.id]: !isHistoryOpen }))
                          }
                        >
                          History ({c.versions.length}) {isHistoryOpen ? "▴" : "▾"}
                        </button>
                      )}
                    </div>

                    {/* Version History Drawer */}
                    {isHistoryOpen && (
                      <div style={{ marginTop: 12, padding: 12, background: "var(--bg-surface)", borderRadius: "var(--radius)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                          Version History
                        </div>
                        {c.versions.map((ver, vIdx) => (
                          <div key={`v-${vIdx}`} className="history-item">
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <strong>{vIdx === 0 ? "Original AI capture" : `v${vIdx + 1} (Edited by ${ver.editedBy})`}</strong>
                              <span style={{ color: "var(--text-subtle)" }}>{ver.at}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{ver.text}</div>
                            {ver.dueDays !== null && (
                              <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>Due: {ver.dueDays} days</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Stage */}
      {activeTab === "stage" && (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Current stage: <strong style={{ color: "var(--text)" }}>{STAGE_LABELS[deal.stage]}</strong>
          </p>
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-subtle)" }}>
            Stage gate evaluation and progression will be wired up in Phase 4.
          </p>
        </div>
      )}

      {/* Edit Commitment Modal */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => setEditModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Edit Commitment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Summary Text</label>
                <input
                  className="input-field"
                  value={editModal.text}
                  onChange={(e) => setEditModal({ ...editModal, text: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Commitment Type</label>
                <select
                  className="input-field"
                  value={editModal.type}
                  onChange={(e) => setEditModal({ ...editModal, type: e.target.value as CommitmentType })}
                >
                  <option value="integration">integration</option>
                  <option value="data_migration">data_migration</option>
                  <option value="configuration">configuration</option>
                  <option value="timeline">timeline</option>
                  <option value="training">training</option>
                  <option value="support">support</option>
                  <option value="product_capability">product_capability</option>
                  <option value="commercial">commercial</option>
                  <option value="other">other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Due Days (from contract signature)</label>
                <input
                  type="number"
                  className="input-field"
                  value={editModal.dueDays ?? ""}
                  placeholder="e.g. 14"
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      dueDays: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  editCommitment(editModal.id, {
                    text: editModal.text,
                    type: editModal.type,
                    dueDays: editModal.dueDays,
                  });
                  setEditModal(null);
                }}
              >
                Save Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Not Commitment Modal */}
      {notCommitmentModal && (
        <div className="modal-backdrop" onClick={() => setNotCommitmentModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Mark "Not a commitment"</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              A reason is strictly required (minimum 5 characters). This item will remain visible but greyed out.
            </div>

            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Discussed as potential roadmap feature, not a contractual deliverable"
              value={notCommitmentModal.reason}
              onChange={(e) => setNotCommitmentModal({ ...notCommitmentModal, reason: e.target.value })}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setNotCommitmentModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={notCommitmentModal.reason.trim().length < 5}
                onClick={() => {
                  markNotCommitment(notCommitmentModal.id, notCommitmentModal.reason);
                  setNotCommitmentModal(null);
                }}
              >
                Mark Not a Commitment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-back Note Modal */}
      {walkBackModal && (
        <div className="modal-backdrop" onClick={() => setWalkBackModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Record Walk-Back</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Record what was communicated to the customer to withdraw or reset expectations for this declined commitment.
            </div>

            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Informed Dan Ortiz on 9/16 that custom ERP connector is out of scope for standard onboarding"
              value={walkBackModal.note}
              onChange={(e) => setWalkBackModal({ ...walkBackModal, note: e.target.value })}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setWalkBackModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={walkBackModal.note.trim().length === 0}
                onClick={() => {
                  recordWalkBack(walkBackModal.id, walkBackModal.note);
                  setWalkBackModal(null);
                }}
              >
                Submit Walk-Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
