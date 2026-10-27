"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useState } from "react";
import type { Stage } from "@/lib/types";

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
  const [activeTab, setActiveTab] = useState<"capture" | "commitments" | "stage">("capture");
  const [activeTranscript, setActiveTranscript] = useState(0);

  if (!deal) {
    return (
      <div style={{ padding: 40, color: "var(--text-muted)" }}>
        Deal not found.
      </div>
    );
  }

  const transcript = transcripts[activeTranscript];

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
            {tab === "capture" ? "Capture" : tab === "commitments" ? `Commitments (${commitments.length})` : "Stage"}
          </button>
        ))}
      </div>

      {/* Tab: Capture */}
      {activeTab === "capture" && (
        <div>
          {transcripts.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {transcripts.map((t, i) => (
                <button
                  key={t.id}
                  className={`btn ${activeTranscript === i ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveTranscript(i)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}

          {transcript ? (
            <div className="card">
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{transcript.title}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: "var(--text-muted)" }}>{transcript.date}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                    {transcript.lines.length} lines · {transcript.speakers.length} speakers
                  </span>
                </div>
              </div>

              {/* Speaker legend */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                {transcript.speakers.map((sp) => (
                  <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={`chip ${sp.side === "vendor" ? "chip-vendor" : "chip-customer"}`}>
                      {sp.side.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12 }}>{sp.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {sp.role}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                {transcript.lines.map((line) => {
                  const speaker = transcript.speakers.find((sp) => sp.id === line.speakerId);
                  return (
                    <div key={line.id} className="transcript-line" id={`line-${line.id}`}>
                      <span className="transcript-ts">{line.ts}</span>
                      <div style={{ minWidth: 140 }}>
                        <span
                          className={`transcript-speaker ${speaker?.side === "vendor" ? "transcript-speaker-vendor" : "transcript-speaker-customer"}`}
                        >
                          {speaker?.name ?? line.speakerId}
                        </span>
                        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                          <span className={`chip ${speaker?.side === "vendor" ? "chip-vendor" : "chip-customer"}`}>
                            {speaker?.side?.toUpperCase() ?? "?"}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-subtle)" }}>{speaker?.role}</span>
                        </div>
                      </div>
                      <span className="transcript-text">{line.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No transcripts available for this deal.</p>
          )}

          <div style={{ marginTop: 16, padding: 12, background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12 }}>
            💡 Phase 2 will add "Find commitments" and "Run live with Groq" buttons to extract commitments from this transcript.
          </div>
        </div>
      )}

      {/* Tab: Commitments */}
      {activeTab === "commitments" && (
        <div>
          {commitments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
              No commitments yet. Use the Capture tab to extract them.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {commitments.map((c) => (
                <div
                  key={c.id}
                  className="card"
                  style={{ opacity: c.review === "not_commitment" ? 0.5 : 1 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={`badge badge-${c.flag}`}>
                        {c.flag.toUpperCase()}
                      </span>
                      <span className="badge badge-gray">{c.type.replace(/_/g, " ")}</span>
                      {c.review === "not_commitment" && (
                        <span className="badge badge-gray">Not a commitment</span>
                      )}
                      {c.late && <span className="badge badge-red">LATE</span>}
                      {c.origin === "off_record" && <span className="badge badge-amber">OFF-RECORD</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                      {c.review} · {c.approval}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>{c.text}</p>
                  {c.quote && (
                    <blockquote style={{
                      borderLeft: "3px solid var(--border)",
                      paddingLeft: 10,
                      color: "var(--text-muted)",
                      fontSize: 12,
                      fontStyle: "italic",
                      marginBottom: 6,
                    }}>
                      "{c.quote}"
                    </blockquote>
                  )}
                  <p style={{ fontSize: 11, color: "var(--text-subtle)" }}>{c.flagReason}</p>
                  {c.notCommitmentReason && (
                    <p style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>
                      Marked not a commitment by AE: {c.notCommitmentReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Stage */}
      {activeTab === "stage" && (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Current stage: <strong style={{ color: "var(--text)" }}>{STAGE_LABELS[deal.stage]}</strong>
          </p>
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-subtle)" }}>
            Stage movement with gate checks will be built in Phase 4.
          </p>
        </div>
      )}
    </>
  );
}
